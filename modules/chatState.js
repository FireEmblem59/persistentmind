// --- START OF FILE modules/chatState.js ---
import { INITIAL_PROMPT_APPLIED_KEY_PREFIX } from "./constants.js";
import { currentPlatformConfig } from "./platformUtils.js"; // Relies on currentPlatformConfig

let currentNewChatInstanceId = null;
let lastPathForNewChatInstanceId = null;

export function getChatIdForSession() {
  if (!currentPlatformConfig) return window.location.href; // Fallback if platform not determined
  const { hostname, pathname } = window.location;

  const isNewChatPathGeneric = () => {
    if (!currentPlatformConfig) return false;
    if (currentPlatformConfig.key === "OPENAI")
      return pathname === "/c/" || pathname === "/";
    if (currentPlatformConfig.key === "DEEPSEEK")
      return pathname === "/chat/" || pathname === "/";
    if (currentPlatformConfig.key === "GEMINI")
      return (
        pathname === "/" || pathname === "/app" || pathname.endsWith("/new")
      );
    if (pathname === "/") return true; // Generic fallback
    const platformBasePath = currentPlatformConfig.name.split("/")[1]; // e.g. "google.com" part for gemini/aistudio
    if (
      platformBasePath &&
      (pathname === `/${platformBasePath}/` ||
        pathname === `/${platformBasePath}`)
    )
      return true;
    return false;
  };

  if (
    currentPlatformConfig.key === "OPENAI" ||
    currentPlatformConfig.key === "DEEPSEEK"
  ) {
    const pathParts = pathname.split("/");
    if (
      pathParts.length >= 3 &&
      (pathParts[1] === "chat" || pathParts[1] === "c")
    ) {
      if (
        pathParts[2] &&
        pathParts[2] !== "undefined" &&
        pathParts[2].trim() !== ""
      ) {
        currentNewChatInstanceId = null;
        lastPathForNewChatInstanceId = null;
        return pathParts[2];
      }
    }
  } else if (currentPlatformConfig.key === "GEMINI") {
    const specificChatMatch = pathname.match(
      /^\/(?:chat|history)\/([a-zA-Z0-9_.-]+)/
    );
    if (specificChatMatch) {
      currentNewChatInstanceId = null;
      lastPathForNewChatInstanceId = null;
      return specificChatMatch[1];
    }
  }
  // ... other platform specific chat ID logic if needed

  if (isNewChatPathGeneric()) {
    if (
      pathname !== lastPathForNewChatInstanceId ||
      !currentNewChatInstanceId
    ) {
      currentNewChatInstanceId = `${
        currentPlatformConfig.key
      }_new_chat_instance_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      lastPathForNewChatInstanceId = pathname;
      console.log(
        `PersistentMind: New chat page. Generated instance ID: ${currentNewChatInstanceId} for path ${pathname}`
      );
    }
    return currentNewChatInstanceId;
  }

  // Fallback for specific chat pages not caught above, or non-new pages
  const pathKey = pathname.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${hostname}_${pathKey}`;
}

export function wasInitialPromptAppliedThisChat() {
  if (!currentPlatformConfig) return true; // Don't interfere if no platform
  const chatIdKey = getChatIdForSession();
  return (
    sessionStorage.getItem(
      `${INITIAL_PROMPT_APPLIED_KEY_PREFIX}${chatIdKey}`
    ) === "true"
  );
}

export function markInitialPromptAppliedThisChat() {
  if (!currentPlatformConfig) return;
  const chatIdKey = getChatIdForSession();
  sessionStorage.setItem(
    `${INITIAL_PROMPT_APPLIED_KEY_PREFIX}${chatIdKey}`,
    "true"
  );
  console.log(
    `PersistentMind: Initial prompt marked as applied for chat session key: ${chatIdKey}`
  );
}

export function isFirstUserMessageInDOM() {
  if (!currentPlatformConfig || !currentPlatformConfig.userMessage)
    return false;
  try {
    const userMessageElements = document.querySelectorAll(
      currentPlatformConfig.userMessage
    );
    let actualUserMessages = 0;
    userMessageElements.forEach((el) => {
      if (
        el.textContent &&
        el.textContent.trim() !== "" &&
        el.offsetParent !== null // Check if visible
      ) {
        actualUserMessages++;
      }
    });
    return actualUserMessages === 0;
  } catch (e) {
    console.error("PersistentMind: isFirstUserMessageInDOM error:", e);
    return false;
  }
}

export function resetNewChatInstanceTracking() {
  currentNewChatInstanceId = null;
  lastPathForNewChatInstanceId = null;
}
// --- END OF FILE modules/chatState.js ---
