// --- START OF FILE modules/memoryManager.js ---
import { MEMORY_KEY } from "./constants.js"; // Import MEMORY_KEY
import { showNotification } from "./domUtils.js"; // For notifications from processMemoryUpdatesFromText

// Your existing UUID generator
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Your existing storage functions
export async function getMemory() {
  return new Promise((resolve) => {
    chrome.storage.local.get([MEMORY_KEY], (result) => {
      try {
        const arr = result[MEMORY_KEY] ? JSON.parse(result[MEMORY_KEY]) : [];
        resolve(Array.isArray(arr) ? arr : []);
      } catch {
        resolve([]);
      }
    });
  });
}

export async function saveMemory(memoryArray) {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      { [MEMORY_KEY]: JSON.stringify(memoryArray) },
      resolve
    );
  });
}

export async function addMemoryItem(text) {
  if (!text.trim()) return false;
  const memory = await getMemory();
  if (memory.some((item) => item.text === text.trim())) return false;
  memory.push({
    id: generateUUID(),
    text: text.trim(),
    timestamp: Date.now(),
  });
  await saveMemory(memory);
  console.log(
    // Added console log for consistency
    "PersistentMind: Memory item added:",
    text.substring(0, 50) + "..."
  );
  return true;
}

export async function deleteMemoryItem(itemId) {
  let memory = await getMemory();
  memory = memory.filter((item) => item.id !== itemId);
  await saveMemory(memory);
  return true;
}

export async function updateMemoryItem(itemId, newText) {
  if (!newText.trim()) return false;
  let memory = await getMemory();
  const itemIndex = memory.findIndex((item) => item.id === itemId);
  if (itemIndex > -1) {
    memory[itemIndex].text = newText.trim();
    memory[itemIndex].timestamp = Date.now();
    await saveMemory(memory);
    return true;
  }
  return false;
}

export async function clearMemory() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [MEMORY_KEY]: JSON.stringify([]) }, () => {
      console.log("PersistentMind: Memory cleared."); // Added console log
      resolve();
    });
  });
}

// --- Functions related to memory string processing (previously in contentScript.js) ---
export function extractMemoryUpdates(text) {
  const regex = /\[MEMORY UPDATE\]([\s\S]*?)\[\/MEMORY UPDATE\]/gi;
  const results = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

export async function processMemoryUpdatesFromText(text) {
  const updates = extractMemoryUpdates(text);
  if (updates.length === 0) return;
  let newMemoryAdded = false;
  for (const updateText of updates) {
    const added = await addMemoryItem(updateText); // Uses your addMemoryItem
    if (added) newMemoryAdded = true;
  }
  if (newMemoryAdded) showNotification("🧠 Memory updated!");
}

export function stripMemoryUpdateTagsFromString(text) {
  if (!text) return "";
  return text
    .replace(/\[MEMORY UPDATE\][\s\S]*?\[\/MEMORY UPDATE\]/gi, "")
    .trim();
}
// --- END OF FILE modules/memoryManager.js ---
