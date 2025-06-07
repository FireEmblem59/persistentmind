// --- START OF FILE platforms/geminiAdapter.js ---

export function getRawInputText(inputElement) {
  if (!inputElement) return "";
  let text = "";
  const lines = inputElement.querySelectorAll("p");
  if (lines.length > 0) {
    lines.forEach((p, index) => {
      text += p.textContent + (index < lines.length - 1 ? "\n" : "");
    });
  } else {
    text = inputElement.textContent || "";
  }
  return text;
}

export function prepareInput(inputElement, textToPrepend, rawUserText) {
  if (!inputElement) return;
  const fullText = textToPrepend + rawUserText;

  inputElement.innerHTML = ""; // Clear existing content

  const lines = fullText.split("\n");
  let lastParagraph = null;

  lines.forEach((line, index) => {
    const p = document.createElement("p");
    if (line === "" && index < lines.length - 1) {
      p.appendChild(document.createElement("br"));
    } else {
      p.textContent = line;
    }
    inputElement.appendChild(p);
    lastParagraph = p;
  });

  if (!inputElement.firstChild) {
    // Ensure there's at least one paragraph for cursor
    const p = document.createElement("p");
    p.appendChild(document.createElement("br"));
    inputElement.appendChild(p);
    lastParagraph = p;
  }

  inputElement.focus();
  if (lastParagraph) {
    const selection = window.getSelection();
    const range = document.createRange();
    const textNode = lastParagraph.firstChild; // Target the text node or <br>

    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, textNode.textContent.length);
    } else {
      // If it's <br> or empty <p>
      range.selectNodeContents(lastParagraph);
      range.collapse(false); // Collapse to the end
    }

    range.collapse(true); // Ensure cursor is at one point
    selection.removeAllRanges();
    selection.addRange(range);
  }

  inputElement.dispatchEvent(
    new Event("input", { bubbles: true, composed: true })
  );
  inputElement.dispatchEvent(
    new Event("change", { bubbles: true, composed: true })
  );
  inputElement.dispatchEvent(
    new KeyboardEvent("keyup", { key: " ", bubbles: true, composed: true })
  );
}

export function isSendButtonEnabled(sendButtonElement) {
  if (!sendButtonElement) return false;
  return sendButtonElement.getAttribute("aria-disabled") === "false";
}

export function getStrippedUserMessageText(
  userMessageBubbleElement,
  promptToStrip
) {
  const queryTextContainer =
    userMessageBubbleElement.querySelector("div.query-text"); // From constants.GEMINI.userMessageContent

  if (!queryTextContainer) {
    return userMessageBubbleElement.textContent || "";
  }

  const paragraphs = Array.from(
    queryTextContainer.querySelectorAll("p.query-text-line")
  );
  if (paragraphs.length === 0) {
    return queryTextContainer.textContent || "";
  }

  let fullTextFromDOM = paragraphs.map((p) => p.textContent).join("\n");
  let strippedText = fullTextFromDOM;

  if (promptToStrip && fullTextFromDOM.startsWith(promptToStrip)) {
    strippedText = fullTextFromDOM.substring(promptToStrip.length).trimStart();

    let pTagsToRemoveCount = 0;
    let accumulatedTextFromPTags = "";
    for (let i = 0; i < paragraphs.length; i++) {
      const currentPTagText = paragraphs[i].textContent;
      const potentialAccumulatedText =
        accumulatedTextFromPTags +
        (accumulatedTextFromPTags ? "\n" : "") +
        currentPTagText;

      if (
        promptToStrip.startsWith(potentialAccumulatedText.trim()) &&
        potentialAccumulatedText.trim().length <= promptToStrip.trim().length
      ) {
        accumulatedTextFromPTags = potentialAccumulatedText;
        pTagsToRemoveCount++;
        if (
          accumulatedTextFromPTags.trim().length === promptToStrip.trim().length
        ) {
          break; // Found all p tags for the prompt
        }
      } else {
        // If adding the current pTag makes it no longer a prefix, then the previous set was it.
        // Or, if it's the first pTag and it doesn't match, then no pTags match.
        if (i > 0) pTagsToRemoveCount = i;
        else pTagsToRemoveCount = 0;
        break;
      }
    }

    if (pTagsToRemoveCount > 0) {
      for (let i = 0; i < pTagsToRemoveCount; i++) {
        if (paragraphs[i] && paragraphs[i].parentElement) {
          paragraphs[i].parentElement.removeChild(paragraphs[i]);
        }
      }
      // If all paragraphs were removed and strippedText is empty, it's handled by messageProcessor
    }
  }
  // This function's primary contract for messageProcessor is to return the stripped *string*.
  // The DOM manipulation here is a best-effort to preserve formatting.
  return strippedText;
}

// Placeholder to make it a valid module if other functions are not yet complete
export const platformName = "Gemini";

// --- END OF FILE platforms/geminiAdapter.js ---
