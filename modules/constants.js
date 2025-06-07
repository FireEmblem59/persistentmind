// --- START OF FILE modules/constants.js ---

export const MEMORY_KEY = "persistentMind_memory";
export const INITIAL_PROMPT_APPLIED_KEY_PREFIX =
  "persistentMind_initialPromptApplied_";

export const PLATFORMS = {
  DEEPSEEK: {
    name: "chat.deepseek.com",
    input: "#chat-input",
    sendButton: 'div[role="button"][class*="_7436101"]',
    userMessage: "div.fbb737a4",
    userMessageContent: "div.fbb737a4 > p",
    aiMessageTextContainer:
      ".ds-markdown > p, .ds-markdown .ds-markdown-paragraph",
  },
  OPENAI: {
    name: "chatgpt.com",
    input: "#prompt-textarea", // This is contenteditable
    sendButton: 'button[data-testid="send-button"]',
    userMessage: 'div[data-message-author-role="user"]', // The whole user message bubble
    userMessageContent:
      'div[data-message-author-role="user"] .whitespace-pre-wrap', // Specific inner element with user text
    aiMessageTextContainer:
      'div[data-message-author-role="assistant"] div.prose p, div[data-message-author-role="assistant"] div.prose li',
  },
  GEMINI: {
    name: "gemini.google.com",
    input: 'div.ql-editor[data-placeholder="Demandez à Gemini"]',
    sendButton: 'button.send-button[aria-label="Envoyer un message"]',
    userMessage: "user-query",
    userMessageContent: "div.query-text",
    aiMessageTextContainer:
      "message-content.model-response-text .markdown p, message-content.model-response-text .markdown li",
  },
  AISTUDIO: {
    name: "aistudio.google.com",
    input: "textarea.chat-input", // Likely textarea
    sendButton: "button.send-button",
    userMessage: "div.query-text-container",
    // userMessageContent: "div.query-text-container .actual-text-span", // If text is nested
    aiMessageTextContainer: ".model-response-text p",
  },
};
// --- END OF FILE modules/constants.js ---
