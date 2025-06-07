// --- START OF FILE modules/inputHandler.js ---
import { getPlatformConfig, getAdapter } from "./platformUtils.js";
import { getMemory } from "./memoryManager.js";
import { waitForElement } from "./domUtils.js";
import {
  wasInitialPromptAppliedThisChat,
  isFirstUserMessageInDOM,
  markInitialPromptAppliedThisChat,
} from "./chatState.js";
import { getSettings } from "./settingsManager.js"; // Import getSettings

// Flag to prevent recursive calls from programmatic clicks
let isProgrammaticClickInProgress = false;

export async function getDynamicInitialPromptPrefix() {
  const settings = await getSettings();
  if (!settings.enableMemoryFeature || !settings.enablePromptPrepending) {
    console.log(
      "PersistentMind (getDynamicInitialPromptPrefix): Prepending disabled by settings."
    );
    return "";
  }

  const memories = await getMemory();
  let memoryString = "";

  if (settings.recentMemoriesCount > 0 && memories.length > 0) {
    const recentMemories = memories.slice(-settings.recentMemoriesCount);
    memoryString =
      "You have the following relevant information in your long-term memory (use it naturally in conversation if relevant):\n";
    recentMemories.forEach((mem) => {
      memoryString += `- ${mem.text}\n`;
    });
    memoryString +=
      "\nRefer to this information when relevant to the conversation. Do not explicitly state 'I have this in my memory'. Just use the information naturally.\n\n";
  }

  // If basePromptPrefix is empty or only whitespace, only return memoryString (if any)
  if (!settings.basePromptPrefix || settings.basePromptPrefix.trim() === "") {
    if (memoryString) {
      console.log(
        "PersistentMind (getDynamicInitialPromptPrefix): Using only memory string as base prompt is empty."
      );
    } else {
      console.log(
        "PersistentMind (getDynamicInitialPromptPrefix): No memory string and no base prompt. Returning empty."
      );
    }
    return memoryString;
  }
  return memoryString + settings.basePromptPrefix;
}

// Generic setNativeValue (can be moved to domUtils.js or a common adapter file if not already)
function setNativeValue(element, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    prototype,
    "value"
  )?.set;

  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value; // Fallback
  }
}

export async function prepareAndModifyInput(inputElement, sharedState) {
  const settings = await getSettings();
  if (!settings.enableMemoryFeature) {
    if (sharedState.lastUsedInitialPromptForStripping) {
      sharedState.lastUsedInitialPromptForStripping = "";
      console.log(
        "PersistentMind (prepareAndModifyInput): Feature disabled, cleared stale stripping prompt."
      );
    }
    return false; // Do nothing if the entire feature is off
  }

  const currentPlatform = getPlatformConfig(); // Ensure this is available
  const adapter = getAdapter();
  let rawUserText;

  if (adapter && adapter.getRawInputText) {
    rawUserText = adapter.getRawInputText(inputElement);
  } else {
    rawUserText = inputElement.value || inputElement.textContent || "";
  }

  let textToPrepend = "";
  let initialPromptAppliedThisTurn = false;
  let dynamicPromptForThisTurn = "";

  if (
    settings.enablePromptPrepending &&
    !wasInitialPromptAppliedThisChat() &&
    isFirstUserMessageInDOM()
  ) {
    dynamicPromptForThisTurn = await getDynamicInitialPromptPrefix();
    if (dynamicPromptForThisTurn) {
      // Only proceed if a non-empty prompt was generated
      if (!rawUserText.trim().startsWith(dynamicPromptForThisTurn.trim())) {
        textToPrepend = dynamicPromptForThisTurn;
        initialPromptAppliedThisTurn = true;
      } else {
        initialPromptAppliedThisTurn = true;
        sharedState.lastUsedInitialPromptForStripping =
          dynamicPromptForThisTurn;
        console.log(
          "PersistentMind (prepareAndModifyInput): Initial prompt already in input or applied previously."
        );
      }
    } else {
      console.log(
        "PersistentMind (prepareAndModifyInput): No dynamic prompt to prepend (check settings/memory)."
      );
    }
  } else {
    if (sharedState.lastUsedInitialPromptForStripping) {
      console.log(
        "PersistentMind (prepareAndModifyInput): Not applying initial prompt this turn, clearing stale stripping prompt."
      );
      sharedState.lastUsedInitialPromptForStripping = "";
    }
  }

  if (textToPrepend) {
    // This means a prompt needs to be prepended
    sharedState.lastUsedInitialPromptForStripping = textToPrepend; // Set the exact prompt used
    console.log(
      "PersistentMind (prepareAndModifyInput): Setting lastUsedInitialPromptForStripping with: ",
      textToPrepend.substring(0, 100) + "..."
    );

    if (adapter && adapter.prepareInput) {
      adapter.prepareInput(
        inputElement,
        textToPrepend,
        rawUserText,
        sharedState
      ); // sharedState not typically needed by adapter.prepareInput itself
    } else {
      console.warn(
        `PersistentMind (prepareAndModifyInput - ${currentPlatform?.key}): No specific adapter.prepareInput, using generic.`
      );
      const newText = textToPrepend + rawUserText;
      const isEditableDiv =
        inputElement.hasAttribute("contenteditable") &&
        inputElement.getAttribute("contenteditable").toLowerCase() !== "false";

      if (isEditableDiv) {
        inputElement.textContent = newText;
        inputElement.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        if (inputElement.firstChild) {
          range.selectNodeContents(inputElement);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        setNativeValue(inputElement, newText);
      }

      inputElement.dispatchEvent(
        new Event("input", { bubbles: true, composed: true })
      );
      inputElement.dispatchEvent(
        new Event("change", { bubbles: true, composed: true })
      );
      if (!isEditableDiv) inputElement.focus();
      console.log(
        "PersistentMind (Generic prepareAndModifyInput): Input modified and events dispatched."
      );
    }
  } else {
    // console.log("PersistentMind (prepareAndModifyInput): No text to prepend this turn.");
  }

  if (initialPromptAppliedThisTurn) {
    markInitialPromptAppliedThisChat();
  }
  return textToPrepend !== "";
}

function simulateClick(element) {
  if (!element) {
    console.warn("PersistentMind: simulateClick - no element provided.");
    return;
  }
  if (typeof element.click === "function") {
    console.log("PersistentMind: Attempting element.click() on:", element);
    element.click();
  } else {
    console.log(
      "PersistentMind: element.click() not available, attempting MouseEvent sequence for:",
      element
    );
    if (document.body.contains(element) && element.offsetParent !== null) {
      const rect = element.getBoundingClientRect();
      const eventOptions = {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        composed: true,
      };
      element.dispatchEvent(new MouseEvent("mousedown", eventOptions));
      element.dispatchEvent(new MouseEvent("mouseup", eventOptions));
      element.dispatchEvent(new MouseEvent("click", eventOptions));
      console.log(
        "PersistentMind: Dispatched mousedown, mouseup, click MouseEvents for:",
        element
      );
    } else {
      console.warn(
        "PersistentMind: Element for MouseEvent simulation not found in DOM or not visible."
      );
    }
  }
}

function enableSendButton(sendButton, inputElement) {
  const adapter = getAdapter();
  if (adapter && adapter.enableSendButton) {
    // Changed to check for enableSendButton directly
    adapter.enableSendButton(sendButton, inputElement);
    return;
  }

  if (sendButton && inputElement) {
    let hasText = false;
    if (adapter && adapter.getRawInputText) {
      hasText = adapter.getRawInputText(inputElement).trim() !== "";
    } else {
      hasText =
        (inputElement.value && inputElement.value.trim() !== "") ||
        (inputElement.textContent && inputElement.textContent.trim() !== "");
    }

    if (hasText) {
      if (sendButton.hasAttribute("disabled")) {
        sendButton.removeAttribute("disabled");
        console.log(
          "PersistentMind (Generic enableSendButton): Removed 'disabled' attribute."
        );
      }
      if (sendButton.getAttribute("aria-disabled") === "true") {
        sendButton.setAttribute("aria-disabled", "false");
        console.log(
          "PersistentMind (Generic enableSendButton): Set 'aria-disabled' to 'false'."
        );
      }
    }
  }
}

export async function setupInputEventListeners(sharedState) {
  const settings = await getSettings();
  if (!settings.enableMemoryFeature) {
    console.log(
      "PersistentMind: Feature disabled in settings. Input listeners not fully set up."
    );
    return;
  }

  const currentPlatform = getPlatformConfig();
  if (!currentPlatform) {
    console.log(
      "PersistentMind: Unknown platform, input listeners not set up."
    );
    return;
  }

  const input = await waitForElement(currentPlatform.input);
  if (!input) {
    console.log(`PersistentMind: Input not found for ${currentPlatform.name}.`);
    return;
  }

  const handleSubmit = async (originalTriggeringEvent) => {
    const adapter = getAdapter(); // Get adapter inside handleSubmit as well
    const currentSendButton = document.querySelector(
      currentPlatform.sendButton
    );

    const isFirstMessageTurn =
      !wasInitialPromptAppliedThisChat() && isFirstUserMessageInDOM();
    let isEmptyInput;
    if (adapter && adapter.getRawInputText) {
      isEmptyInput = adapter.getRawInputText(input).trim() === "";
    } else {
      isEmptyInput = (input.value || input.textContent || "").trim() === "";
    }

    if (
      isEmptyInput &&
      !isFirstMessageTurn &&
      !settings.enablePromptPrepending
    ) {
      // If prompt prepending is off, empty input means skip
      console.log(
        "PersistentMind Action: Empty input, skipping modification and send (prompt prepending off)."
      );
      return;
    }
    if (
      isEmptyInput &&
      !isFirstMessageTurn &&
      settings.enablePromptPrepending &&
      !(await getDynamicInitialPromptPrefix())
    ) {
      // If prompt prepending is on, but no actual prompt would be generated (e.g. no memories and no base prompt)
      console.log(
        "PersistentMind Action: Empty input and no actual prompt to prepend, skipping."
      );
      return;
    }

    if (originalTriggeringEvent) {
      originalTriggeringEvent.preventDefault();
      originalTriggeringEvent.stopPropagation();
    }

    await prepareAndModifyInput(input, sharedState); // This will now use settings internally
    await new Promise((resolve) => setTimeout(resolve, 150));

    enableSendButton(currentSendButton, input);

    let sendButtonIsEnabled = false;
    if (adapter && adapter.isSendButtonEnabled) {
      sendButtonIsEnabled = adapter.isSendButtonEnabled(currentSendButton);
    } else {
      sendButtonIsEnabled =
        currentSendButton &&
        !currentSendButton.hasAttribute("disabled") &&
        currentSendButton.getAttribute("aria-disabled") !== "true";
    }

    if (sendButtonIsEnabled) {
      console.log(
        "PersistentMind: Attempting to programmatically click send button:",
        currentSendButton
      );
      isProgrammaticClickInProgress = true;
      try {
        simulateClick(currentSendButton);
      } finally {
        setTimeout(() => {
          isProgrammaticClickInProgress = false;
          console.log("PersistentMind: Programmatic click flag reset.");
        }, 0);
      }
    } else if (input.form) {
      console.log(
        "PersistentMind: Send button not found/disabled, attempting form submission."
      );
      const formSubmitButton = input.form.querySelector(
        'button[type="submit"]'
      );
      if (formSubmitButton && formSubmitButton !== currentSendButton) {
        isProgrammaticClickInProgress = true;
        try {
          simulateClick(formSubmitButton);
        } finally {
          setTimeout(() => {
            isProgrammaticClickInProgress = false;
          }, 0);
        }
      } else {
        input.form.requestSubmit();
      }
    } else {
      console.error(
        "PersistentMind: No send button found/enabled and no form to submit for:",
        currentPlatform.name
      );
    }
  };

  // Send Button Listener
  if (
    currentPlatform.sendButton &&
    !document.body.dataset.persistentMindSendListener
  ) {
    document.body.addEventListener(
      "click",
      async (event) => {
        if (isProgrammaticClickInProgress) {
          // console.log("PersistentMind: Body click listener ignored (programmatic click).");
          return;
        }
        const sendButtonTarget = event.target.closest(
          currentPlatform.sendButton
        );
        if (sendButtonTarget) {
          console.log(
            "PersistentMind: User clicked send button, intercepting:",
            sendButtonTarget
          );
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          await handleSubmit(null);
        }
      },
      true
    );
    document.body.dataset.persistentMindSendListener = "true";
    console.log(
      "PersistentMind: Delegated send button listener set up on document.body."
    );
  }

  // Input Keydown Listener for Enter
  if (input && !input.dataset.persistentMindKeyListener) {
    input.addEventListener(
      "keydown",
      async (event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey
        ) {
          if (isProgrammaticClickInProgress) {
            // console.log("PersistentMind: Enter key ignored (programmatic click).");
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          console.log("PersistentMind: Enter key pressed, intercepting.");
          await handleSubmit(event);
        }
      },
      true
    );
    input.dataset.persistentMindKeyListener = "true";
    console.log("PersistentMind: Input keydown listener set up.");
  }

  console.log(
    "PersistentMind: Input event listeners setup complete for",
    currentPlatform.name
  );
}
// --- END OF FILE modules/inputHandler.js ---
