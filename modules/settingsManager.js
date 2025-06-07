// modules/settingsManager.js

export const DEFAULT_SETTINGS = {
  enableMemoryFeature: true,
  basePromptPrefix: `This is a special instruction for our conversation: Be extra creative and think outside the box for your initial response.
You are a helpful AI. To store new long-term information, use the specific format: [MEMORY UPDATE]The information to remember[/MEMORY UPDATE]. Do not use this format for anything else.

`,
  enablePromptPrepending: true,
  recentMemoriesCount: 5,
  debugDoNotStrip: false,
};

export const settingsKey = "persistentMindSettings";
let currentSettings = null; // Cache for current settings

/**
 * Loads settings from chrome.storage.sync or returns defaults.
 * Caches the settings for subsequent calls within the same context (e.g., content script lifecycle).
 * @param {boolean} forceRefresh - If true, bypasses cache and fetches fresh from storage.
 * @returns {Promise<Object>} The settings object.
 */
export async function getSettings(forceRefresh = false) {
  if (currentSettings && !forceRefresh) {
    return currentSettings;
  }

  try {
    const data = await chrome.storage.sync.get(settingsKey);
    currentSettings = { ...DEFAULT_SETTINGS, ...(data[settingsKey] || {}) };
    console.log("PersistentMind: Settings loaded/reloaded:", currentSettings);
    return currentSettings;
  } catch (error) {
    console.error(
      "PersistentMind: Error loading settings, returning defaults.",
      error
    );
    currentSettings = { ...DEFAULT_SETTINGS }; // Fallback to defaults on error
    return currentSettings;
  }
}

// Optional: Listen for changes in settings from other parts of the extension (e.g., settings page)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync" && changes[settingsKey]) {
    const newSettingsRaw = changes[settingsKey].newValue;
    currentSettings = { ...DEFAULT_SETTINGS, ...(newSettingsRaw || {}) };
    console.log(
      "PersistentMind: Settings updated via storage.onChanged:",
      currentSettings
    );
    // Here you could dispatch a custom event if other modules need to react immediately
    // document.dispatchEvent(new CustomEvent('persistentMindSettingsChanged', { detail: currentSettings }));
  }
});

// Initial load of settings when the module is first imported in a context
getSettings(true).then((settings) => {
  console.log("PersistentMind: Initial settings loaded by settingsManager.js");
});
