// --- START OF FILE popup.js ---
import {
  getMemory,
  clearMemory,
  saveMemory,
  deleteMemoryItem,
  updateMemoryItem,
} from "./modules/memoryManager.js";

const memoryListEl = document.getElementById("memoryList");
const searchBox = document.getElementById("searchBox");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");

let memoryData = [];
let editModeItemId = null; // To track which item is being edited

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function renderMemoryList(filter = "") {
  memoryListEl.innerHTML = ""; // Clear previous items
  const filtered = memoryData.filter((item) =>
    item.text.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    memoryListEl.textContent = filter
      ? "No matching memory found."
      : "No memory items yet.";
    return;
  }

  filtered.sort((a, b) => b.timestamp - a.timestamp); // Show newest first

  for (const item of filtered) {
    const itemDiv = document.createElement("div");
    itemDiv.className = "memory-item";
    itemDiv.dataset.itemId = item.id;

    const contentDiv = document.createElement("div");
    contentDiv.className = "memory-item-content";

    const dateSpan = document.createElement("span");
    dateSpan.className = "timestamp";
    dateSpan.textContent = formatTimestamp(item.timestamp);

    const textP = document.createElement("p");
    textP.className = "text";
    textP.textContent = item.text;

    if (editModeItemId === item.id) {
      const editTextArea = document.createElement("textarea");
      editTextArea.className = "edit-textarea";
      editTextArea.value = item.text;
      editTextArea.rows = Math.max(
        3,
        Math.min(10, item.text.split("\n").length + 1)
      ); // Auto-adjust rows

      const saveEditBtn = document.createElement("button");
      saveEditBtn.textContent = "💾 Save";
      saveEditBtn.className = "edit-btn"; // Use existing class for consistency
      saveEditBtn.onclick = async () => {
        const newText = editTextArea.value;
        if (newText.trim()) {
          await updateMemoryItem(item.id, newText);
          editModeItemId = null; // Exit edit mode
          loadMemoryAndRender(); // Reload and re-render
          showStatus("Memory updated!", "green");
        } else {
          showStatus("Memory text cannot be empty.", "red");
        }
      };

      const cancelEditBtn = document.createElement("button");
      cancelEditBtn.textContent = "❌ Cancel";
      cancelEditBtn.onclick = () => {
        editModeItemId = null; // Exit edit mode
        renderMemoryList(searchBox.value); // Re-render to remove textarea
      };

      contentDiv.appendChild(editTextArea);
      itemDiv.appendChild(contentDiv); // Add contentDiv first

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "memory-item-actions";
      actionsDiv.appendChild(saveEditBtn);
      actionsDiv.appendChild(cancelEditBtn);
      itemDiv.appendChild(actionsDiv); // Then actionsDiv
    } else {
      contentDiv.appendChild(dateSpan);
      contentDiv.appendChild(textP);
      itemDiv.appendChild(contentDiv);

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "memory-item-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ Edit";
      editBtn.className = "edit-btn";
      editBtn.onclick = () => {
        editModeItemId = item.id; // Enter edit mode for this item
        renderMemoryList(searchBox.value); // Re-render to show textarea
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️ Delete";
      deleteBtn.className = "delete-btn";
      deleteBtn.onclick = async () => {
        if (
          confirm(
            `Delete this memory?\n\n"${item.text.substring(0, 100)}${
              item.text.length > 100 ? "..." : ""
            }"`
          )
        ) {
          await deleteMemoryItem(item.id);
          loadMemoryAndRender(); // Reload and re-render
          showStatus("Memory item deleted!", "green");
        }
      };
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);
      itemDiv.appendChild(actionsDiv);
    }
    memoryListEl.appendChild(itemDiv);
  }
}

async function loadMemoryAndRender() {
  memoryData = await getMemory();
  renderMemoryList(searchBox.value);
}

function showStatus(message, color = "green") {
  statusEl.textContent = message;
  statusEl.style.color = color;
  setTimeout(() => (statusEl.textContent = ""), 3000);
}

clearBtn.addEventListener("click", async () => {
  if (memoryData.length === 0) {
    showStatus("Memory is already empty.", "orange");
    return;
  }
  if (confirm("Clear all memory? This cannot be undone.")) {
    await clearMemory();
    editModeItemId = null; // Ensure exit edit mode if active
    loadMemoryAndRender();
    showStatus("🧹 Memory cleared!", "green");
  }
});

searchBox.addEventListener("input", () => {
  renderMemoryList(searchBox.value);
});

// Initialize
loadMemoryAndRender();
// --- END OF FILE popup.js ---
