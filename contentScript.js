// --- START OF FILE contentScript.js ---
import {
  determineCurrentPlatform,
  getPlatformConfig,
  getAdapter, // We might use adapter info in path observer later if needed
} from "./modules/platformUtils.js";
import { setupInputEventListeners } from "./modules/inputHandler.js";
import {
  handleNodeForUserMessage,
  handleNodeForAIMessage,
} from "./modules/messageProcessor.js";
import { waitForElement } from "./modules/domUtils.js";
import { resetNewChatInstanceTracking } from "./modules/chatState.js";

// Shared state that needs to be mutable across modules or calls
const sharedState = {
  lastUsedInitialPromptForStripping: "",
};

async function initializePersistentMind() {
  determineCurrentPlatform(); // This sets currentPlatformConfig and currentAdapter in platformUtils.js
  const currentPlatform = getPlatformConfig();

  if (currentPlatform) {
    console.log(
      `PersistentMind initialized for ${currentPlatform.name} (Key: ${currentPlatform.key})`
    );
    await setupInputEventListeners(sharedState); // Pass sharedState
  } else {
    console.log("PersistentMind initialized on an unknown platform.");
  }
}

(async function main() {
  await initializePersistentMind(); // Initial call

  const responseObserver = new MutationObserver((mutations) => {
    const currentPlatform = getPlatformConfig();
    if (!currentPlatform) return;

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType === Node.ELEMENT_NODE) {
            console.log(
              "PersistentMind (ContentScript ResponseObs): Processing added node. lastUsedInitialPromptForStripping:",
              sharedState.lastUsedInitialPromptForStripping
                ? sharedState.lastUsedInitialPromptForStripping.substring(
                    0,
                    100
                  ) + "..."
                : "EMPTY/NULL"
            );
          }
          handleNodeForUserMessage(addedNode, sharedState);
          handleNodeForAIMessage(addedNode);
        }
      } else if (mutation.type === "characterData") {
        if (mutation.target && mutation.target.parentElement) {
          handleNodeForAIMessage(mutation.target.parentElement);
        }
      }
    }
  });

  const chatAreaSelectors = [
    'main div[role="presentation"]', // OpenAI
    'main div[role="log"]',
    ".chat-container",
    "#chat-messages",
    'div[class*="chatui_chatMessages"]', // Deepseek
    ".ReactVirtualized__Grid__innerScrollContainer",
    'div[class*="ChatMessages_chatMessages"]', // Gemini
    'div[class*="chat-scrollable-area"]',
    "div.chat-history",
    "main",
  ].join(", ");

  let chatArea = await waitForElement(chatAreaSelectors, 3000);
  if (!chatArea) {
    chatArea = document.body;
    console.warn(
      "PersistentMind: Common chat area not found, observing document.body."
    );
  }
  responseObserver.observe(chatArea, {
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: false,
  });
  console.log("PersistentMind: Observing for messages in:", chatArea);

  // --- Path Change Observer ---
  let lastProcessedPathnameForObserver = window.location.href; // Use a different var name to avoid confusion
  const pathObserver = new MutationObserver(async () => {
    if (window.location.href !== lastProcessedPathnameForObserver) {
      const oldHref = lastProcessedPathnameForObserver;
      const newHref = window.location.href;
      console.log(
        "PersistentMind (PathObs): Path changed, re-evaluating.",
        oldHref,
        "->",
        newHref
      );
      lastProcessedPathnameForObserver = newHref;

      // It's crucial to get the *current* platform config *after* navigation,
      // though usually it's the same unless navigating cross-domain.
      // determineCurrentPlatform(); // This will be called inside initializePersistentMind
      const platformInfo = getPlatformConfig(); // Get currently determined platform

      let isConsideredSameChatContinuation = false;

      if (platformInfo && platformInfo.key === "DEEPSEEK") {
        const oldUrl = new URL(oldHref);
        const newUrl = new URL(newHref);

        // If old path was root or /chat/ and new path is /a/chat/s/...
        const oldPathIsGeneral =
          oldUrl.pathname === "/" || oldUrl.pathname === "/chat/";
        const newPathIsSpecificChat = newUrl.pathname.startsWith("/a/chat/s/");

        if (oldPathIsGeneral && newPathIsSpecificChat) {
          isConsideredSameChatContinuation = true;
          console.log(
            "PersistentMind (PathObs): Deepseek general to specific chat navigation. NOT resetting stripping prompt."
          );
        }
      }
      // Add other platform-specific continuation logic here if needed for Gemini, etc.

      if (!isConsideredSameChatContinuation) {
        // If it's not a recognized continuation, assume it's a new context
        // or a different chat, so reset state.
        console.log(
          "PersistentMind (PathObs): Path change implies new context. Resetting stripping prompt and chat instance tracking."
        );
        resetNewChatInstanceTracking();
        sharedState.lastUsedInitialPromptForStripping = "";
      } else {
        console.log(
          "PersistentMind (PathObs): Path change considered same chat continuation. Stripping prompt preserved."
        );
      }

      // Always re-initialize:
      // - To re-determine platform if it could have changed (though unlikely for SPA path changes).
      // - To re-setup input event listeners if the input field was re-rendered.
      await initializePersistentMind();
    }
  });

  pathObserver.observe(document.body, { childList: true, subtree: true });
  console.log("PersistentMind: Path observer set up.");
})();
// --- END OF FILE contentScript.js ---
