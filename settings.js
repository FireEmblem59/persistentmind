// settings.js

// Define default settings
const DEFAULT_SETTINGS = {
  enableMemoryFeature: true,
  basePromptPrefix: `This is a special instruction for our conversation: Be extra creative and think outside the box for your initial response.
You are a helpful AI. To store new long-term information, use the specific format: [MEMORY UPDATE]The information to remember[/MEMORY UPDATE]. Do not use this format for anything else.

`, // Note: Textareas handle newlines well.
  enablePromptPrepending: true,
  recentMemoriesCount: 5,
  debugDoNotStrip: false,
};

const settingsKey = "persistentMindSettings";

// UI Elements
const enableMemoryFeatureEl = document.getElementById("enableMemoryFeature");
const basePromptPrefixEl = document.getElementById("basePromptPrefix");
const enablePromptPrependingEl = document.getElementById(
  "enablePromptPrepending"
);
const recentMemoriesCountEl = document.getElementById("recentMemoriesCount");
const debugDoNotStripEl = document.getElementById("debugDoNotStrip");
const saveButton = document.getElementById("saveSettings");
const statusMessageEl = document.getElementById("statusMessage");

// Load settings from storage
async function loadSettings() {
  const data = await chrome.storage.sync.get(settingsKey);
  const currentSettings = { ...DEFAULT_SETTINGS, ...(data[settingsKey] || {}) };

  enableMemoryFeatureEl.checked = currentSettings.enableMemoryFeature;
  basePromptPrefixEl.value = currentSettings.basePromptPrefix;
  enablePromptPrependingEl.checked = currentSettings.enablePromptPrepending;
  recentMemoriesCountEl.value = currentSettings.recentMemoriesCount;
  debugDoNotStripEl.checked = currentSettings.debugDoNotStrip;

  // Initial UI state based on loaded settings
  toggleDependentSettings(currentSettings.enableMemoryFeature);
}

// Save settings to storage
async function saveSettings() {
  const newSettings = {
    enableMemoryFeature: enableMemoryFeatureEl.checked,
    basePromptPrefix: basePromptPrefixEl.value,
    enablePromptPrepending: enablePromptPrependingEl.checked,
    recentMemoriesCount: parseInt(recentMemoriesCountEl.value, 10),
    debugDoNotStrip: debugDoNotStripEl.checked,
  };

  // Validate recentMemoriesCount
  if (
    isNaN(newSettings.recentMemoriesCount) ||
    newSettings.recentMemoriesCount < 0 ||
    newSettings.recentMemoriesCount > 10
  ) {
    newSettings.recentMemoriesCount = DEFAULT_SETTINGS.recentMemoriesCount; // Reset to default if invalid
    recentMemoriesCountEl.value = newSettings.recentMemoriesCount; // Update UI
  }

  await chrome.storage.sync.set({ [settingsKey]: newSettings });
  showStatus("Settings saved successfully!", "success");
  toggleDependentSettings(newSettings.enableMemoryFeature);
}

function showStatus(message, type = "success") {
  statusMessageEl.textContent = message;
  statusMessageEl.className = type; // 'success' or 'error'
  setTimeout(() => {
    statusMessageEl.textContent = "";
    statusMessageEl.className = "";
  }, 3000);
}

// Toggle dependent settings based on master switch
function toggleDependentSettings(isMasterEnabled) {
  basePromptPrefixEl.disabled =
    !isMasterEnabled || !enablePromptPrependingEl.checked;
  enablePromptPrependingEl.disabled = !isMasterEnabled;
  recentMemoriesCountEl.disabled =
    !isMasterEnabled || !enablePromptPrependingEl.checked;
  // debugDoNotStripEl is independent of the master switch for debugging purposes.
}

// Event Listeners
saveButton.addEventListener("click", saveSettings);

enableMemoryFeatureEl.addEventListener("change", (event) => {
  toggleDependentSettings(event.target.checked);
});

enablePromptPrependingEl.addEventListener("change", (event) => {
  // If master enable is on, then prompt prepending controls related fields
  if (enableMemoryFeatureEl.checked) {
    basePromptPrefixEl.disabled = !event.target.checked;
    recentMemoriesCountEl.disabled = !event.target.checked;
  }
});

// Initial load
document.addEventListener("DOMContentLoaded", loadSettings);
