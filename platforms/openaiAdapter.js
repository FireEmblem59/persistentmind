// --- START OF FILE modules/platforms/openaiAdapter.js ---
import { currentPlatformConfig } from "../modules/platformUtils.js"; // To access selectors like userMessageContent

// Helper to check if an element is contenteditable (could be in a common.js too)
function isContentEditable(element) {
  return (
    element &&
    element.hasAttribute("contenteditable") &&
    element.getAttribute("contenteditable").toLowerCase() !== "false"
  );
}

export function getRawInputText(inputElement) {
  if (!inputElement) return "";
  if (isContentEditable(inputElement)) {
    // For OpenAI's contenteditable, text is often within <p> tags.
    // We want to preserve newlines between paragraphs if they exist.
    let text = "";
    const childNodes = inputElement.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i];
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // If it's a <p> tag or similar block element, append its text.
        // Add a newline before if text isn't empty and doesn't end with one.
        if (text.length > 0 && !text.endsWith("\n") && i > 0) {
          text += "\n";
        }
        text += node.textContent;
      }
    }
    return text; // Keep leading/trailing spaces for now, trim later if needed by core logic
  }
  return inputElement.value || ""; // Fallback for non-contenteditable (though not expected for this adapter)
}

export function prepareInput(
  inputElement,
  textToPrepend,
  rawUserText,
  sharedState
) {
  if (!inputElement) return;

  const newText = textToPrepend + rawUserText;

  if (isContentEditable(inputElement)) {
    // For OpenAI, it often expects content within a <p> tag, especially for newlines.
    // If the input is empty, it might have a placeholder <p><br></p>.
    // Let's try to be robust:
    inputElement.innerHTML = ""; // Clear existing content

    // Create a <p> element to hold the text. This helps with formatting and cursor behavior.
    const p = document.createElement("p");
    p.textContent = newText;
    inputElement.appendChild(p);

    // Set focus and move cursor to the end of the content within the <p>
    inputElement.focus();
    const selection = window.getSelection();
    const range = document.createRange();

    if (p.firstChild) {
      // Ensure the <p> has content (even if it's just a text node)
      range.setStart(p.firstChild, p.textContent.length); // End of text in <p>
      range.collapse(true); // Collapse to the start (which is the end in this case)
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // If <p> is somehow empty (e.g., newText was empty)
      range.selectNodeContents(p);
      range.collapse(false); // Collapse to the end of the <p>
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } else {
    // Fallback if it's somehow not contenteditable (should not happen with correct config)
    console.warn(
      "PersistentMind (OpenAI Adapter): Input element is not contenteditable, using direct value set."
    );
    inputElement.value = newText; // Basic fallback
  }

  // Dispatch events - these are crucial for frameworks to recognize the change.
  inputElement.dispatchEvent(
    new Event("input", { bubbles: true, composed: true })
  );
  inputElement.dispatchEvent(
    new Event("change", { bubbles: true, composed: true })
  );

  // ChatGPT might rely on key events to enable the send button or update internal state.
  // Dispatching a 'space' key event is a common trick.
  inputElement.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      bubbles: true,
      composed: true,
    })
  );
  inputElement.dispatchEvent(
    new KeyboardEvent("keyup", {
      key: " ",
      code: "Space",
      bubbles: true,
      composed: true,
    })
  );

  // Ensure focus is still on the input element after dispatching events
  if (document.activeElement !== inputElement) {
    inputElement.focus();
    // Re-apply cursor position if focus was lost and regained
    if (
      isContentEditable(inputElement) &&
      inputElement.firstChild &&
      inputElement.firstChild.lastChild
    ) {
      const selection = window.getSelection();
      const range = document.createRange();
      const textNode = inputElement.firstChild.lastChild; // Assuming text is in the first <p>
      range.setStart(textNode, textNode.textContent.length);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  console.log(
    "PersistentMind (OpenAI Adapter): Input modified and events dispatched."
  );
}

export function getStrippedUserMessageText(messageElement, promptToStrip) {
  // Uses currentPlatformConfig which should have userMessageContent for OpenAI
  if (!currentPlatformConfig || !currentPlatformConfig.userMessageContent) {
    console.warn(
      "PersistentMind (OpenAI Adapter): userMessageContent selector not found in config."
    );
    return messageElement.textContent || ""; // Fallback
  }
  const contentElement = messageElement.querySelector(
    currentPlatformConfig.userMessageContent
  );
  if (contentElement) {
    let text = contentElement.textContent || "";
    if (text.startsWith(promptToStrip)) {
      // console.log("PersistentMind (OpenAI Adapter): Stripping prompt from user message.");
      return text.substring(promptToStrip.length).trimStart();
    }
    return text.trimStart();
  }
  // Fallback if specific content element not found
  let text = messageElement.textContent || "";
  if (text.startsWith(promptToStrip)) {
    return text.substring(promptToStrip.length).trimStart();
  }
  return text.trimStart();
}

// Add other OpenAI-specific functions here if needed (e.g., for enabling send button if it's tricky)
export function isSendButtonEnabled(sendButtonElement) {
  if (!sendButtonElement) return false;
  // OpenAI send button is typically enabled if it does NOT have a 'disabled' attribute.
  // And its aria-disabled state.
  return (
    !sendButtonElement.hasAttribute("disabled") &&
    sendButtonElement.getAttribute("aria-disabled") !== "true"
  );
}

// Using the button's class and text content to identify it
const hidePlusButton = () => {
  const buttons = document.querySelectorAll("button.text-m");
  buttons.forEach((button) => {
    if (button.textContent.includes("Get Plus")) {
      button.style.display = "none";
      // Alternatively, you could remove it completely:
      button.remove();
    }
  });
};

// Run the function when the page loads
hidePlusButton();

// Also run it when new content is loaded (for SPAs)
const observer = new MutationObserver(hidePlusButton);
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// --- END OF FILE platforms/openaiAdapter.js ---
