// --- START OF FILE modules/messageProcessor.js ---
import { getPlatformConfig, getAdapter } from "./platformUtils.js";
import {
  processMemoryUpdatesFromText,
  stripMemoryUpdateTagsFromString,
} from "./memoryManager.js";
import { hideEntireMessageBlock } from "./domUtils.js";
import { getSettings } from "./settingsManager.js"; // Import getSettings

export async function handleNodeForUserMessage(nodeElement, sharedState) {
  const settings = await getSettings();
  if (!settings.enableMemoryFeature) {
    return;
  }

  const currentPlatform = getPlatformConfig();
  const adapter = getAdapter();

  if (!currentPlatform || !currentPlatform.userMessage) return;
  if (
    !(
      nodeElement.nodeType === Node.ELEMENT_NODE &&
      nodeElement.matches &&
      nodeElement.matches(":not(script):not(style)")
    )
  )
    return;

  const userMessageElements =
    currentPlatform.userMessage &&
    nodeElement.matches(currentPlatform.userMessage)
      ? [nodeElement]
      : currentPlatform.userMessage
      ? Array.from(nodeElement.querySelectorAll(currentPlatform.userMessage))
      : [];

  for (const userMessageElement of userMessageElements) {
    let textToDisplay;
    let originalTextContentForComparison = userMessageElement.textContent; // Original text of the whole matched bubble

    // Determine the actual DOM element whose textContent should be updated and compared
    let actualTextElementToUpdate = userMessageElement;
    if (currentPlatform.userMessageContent) {
      const specificContentEl = userMessageElement.querySelector(
        currentPlatform.userMessageContent
      );
      if (specificContentEl) {
        actualTextElementToUpdate = specificContentEl;
        originalTextContentForComparison =
          actualTextElementToUpdate.textContent; // Update to text of specific element
      }
    }

    textToDisplay = originalTextContentForComparison; // Start with the text of the element we might modify

    if (settings.enablePromptPrepending) {
      // Only attempt stripping if prompt prepending was enabled
      // --- Regular Stripping Logic ---
      if (adapter && adapter.getStrippedUserMessageText) {
        textToDisplay = adapter.getStrippedUserMessageText(
          actualTextElementToUpdate, // Pass the element that contains the text
          sharedState.lastUsedInitialPromptForStripping ||
            settings.basePromptPrefix // Fallback to base if specific not available
        );
      } else {
        // Fallback/Generic Stripping Logic
        let stripped = false;
        if (
          sharedState.lastUsedInitialPromptForStripping &&
          textToDisplay.startsWith(
            sharedState.lastUsedInitialPromptForStripping
          )
        ) {
          textToDisplay = textToDisplay.substring(
            sharedState.lastUsedInitialPromptForStripping.length
          );
          stripped = true;
        } else if (
          settings.basePromptPrefix &&
          textToDisplay.startsWith(settings.basePromptPrefix)
        ) {
          // This fallback is less ideal as it doesn't account for the dynamic memory part.
          // It should only trigger if lastUsedInitialPromptForStripping was somehow lost.
          textToDisplay = textToDisplay.substring(
            settings.basePromptPrefix.length
          );
          stripped = true;
        }
        if (stripped) {
          textToDisplay = textToDisplay.trimStart();
        }
      }
    }

    if (
      textToDisplay !== originalTextContentForComparison &&
      !settings.debugDoNotStrip
    ) {
      actualTextElementToUpdate.textContent = textToDisplay;

      if (
        textToDisplay === "" &&
        originalTextContentForComparison.trim() !== ""
      ) {
        const parentMessageBubble = userMessageElement.closest(
          'div[data-testid^="conversation-turn-"], .message-wrapper, div[class*="ChatItem_chatItem"], div[class*="Message_message"]'
        );
        if (parentMessageBubble) {
          hideEntireMessageBlock(parentMessageBubble);
        } else {
          userMessageElement.style.display = "none";
        }
      }
    }
  }
}

export async function handleNodeForAIMessage(nodeElement) {
  const settings = await getSettings();
  if (!settings.enableMemoryFeature) {
    return;
  }

  const currentPlatform = getPlatformConfig();
  if (!currentPlatform || !currentPlatform.aiMessageTextContainer) return;
  if (
    !(
      nodeElement.nodeType === Node.ELEMENT_NODE &&
      nodeElement.matches &&
      nodeElement.matches(":not(script):not(style)")
    )
  )
    return;

  const aiMessageContainers = currentPlatform.aiMessageTextContainer
    ? nodeElement.matches(currentPlatform.aiMessageTextContainer)
      ? [nodeElement]
      : Array.from(
          nodeElement.querySelectorAll(currentPlatform.aiMessageTextContainer)
        )
    : [];

  for (const container of aiMessageContainers) {
    const treeWalker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    let textNode;
    let containerModified = false;

    while ((textNode = treeWalker.nextNode())) {
      const originalNodeText = textNode.nodeValue;
      if (originalNodeText && originalNodeText.includes("[MEMORY UPDATE]")) {
        processMemoryUpdatesFromText(originalNodeText); // This will add to memory & show UI notification
        const strippedText = stripMemoryUpdateTagsFromString(originalNodeText);
        if (strippedText !== originalNodeText) {
          textNode.nodeValue = strippedText;
          containerModified = true;
        }
      }
    }
    if (containerModified) {
      if (container.textContent.trim() === "") {
        container.style.setProperty("display", "none", "important");
        const messageBubble = container.closest(
          'div[data-testid^="conversation-turn-"], div[class*="ChatItem_chatItem"], div[class*="Message_message"]'
        );
        if (messageBubble && messageBubble.textContent.trim() === "") {
          hideEntireMessageBlock(messageBubble);
        }
      }
    }
  }
}
// --- END OF FILE modules/messageProcessor.js ---
