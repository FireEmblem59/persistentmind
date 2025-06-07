// --- START OF FILE modules/domUtils.js ---
export function showNotification(text) {
  const note = document.createElement("div");
  note.textContent = text;
  note.className = "persistentmind-toast"; // Use the new prefixed class
  document.body.appendChild(note);

  // Force reflow/repaint to ensure the transition is applied correctly
  // when adding the 'persistentmind-toast-show' class.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Double requestAnimationFrame for some edge cases
      note.classList.add("persistentmind-toast-show");
    });
  });

  setTimeout(() => {
    note.classList.remove("persistentmind-toast-show");
    // Wait for the fade-out transition to complete before removing the element
    note.addEventListener(
      "transitionend",
      () => {
        if (note.parentElement) {
          // Check if still in DOM before removing
          note.remove();
        }
      },
      { once: true }
    ); // Ensure listener is removed after firing

    // Fallback removal in case transitionend doesn't fire (e.g., element removed by other means)
    setTimeout(() => {
      if (note.parentElement) {
        note.remove();
      }
    }, 400); // Should be slightly longer than the transition duration
  }, 3000); // How long the toast stays visible before starting to fade
}

export function hideEntireMessageBlock(node) {
  if (!node) return;
  console.log(
    "PersistentMind: Hiding entire message block (empty after stripping):",
    node
  );
  node.style.display = "none";
}

export function waitForElement(selector, timeout = 7000, checkInterval = 16) {
  return new Promise((resolve) => {
    if (!selector) {
      console.warn(
        "PersistentMind: waitForElement called with null or empty selector."
      );
      return resolve(null);
    }

    const start = performance.now();

    const check = () => {
      let el = null;
      try {
        el = document.querySelector(selector);
      } catch (e) {
        console.error(`PersistentMind: Invalid selector "${selector}"`, e);
        return resolve(null);
      }

      if (el) {
        return resolve(el);
      }

      if (performance.now() - start > timeout) {
        console.warn(
          `PersistentMind: Element "${selector}" not found after ${timeout}ms.`
        );
        return resolve(null);
      }
      setTimeout(() => requestAnimationFrame(check), checkInterval);
    };
    check();
  });
}
// --- END OF FILE modules/domUtils.js ---
