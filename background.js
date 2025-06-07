// background.js

// --- CONFIGURATION ---

const VERSION_CHECK_URL =
  "https://raw.githubusercontent.com/FireEmblem59/persistentmind/main/version.json";

const UPDATE_CHECK_ALARM_NAME = "persistentMindUpdateCheck";
const NOTIFICATION_ID = "persistentMindUpdateNotification";

// --- FUNCTIONS ---

/**
 * Compares two semantic version strings (e.g., "1.2.3").
 * @param {string} v1 The first version string.
 * @param {string} v2 The second version string.
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2.
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  const len = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Shows a desktop notification to the user about the new version.
 * @param {string} newVersion The new version string (e.g., "1.1.0").
 * @param {string} detailsUrl The URL to open when the button is clicked.
 */
function showUpdateNotification(newVersion, detailsUrl) {
  chrome.notifications.create(NOTIFICATION_ID, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "PersistentMind Update Available",
    message: `A new version (${newVersion}) is available. Click below for details.`,
    buttons: [{ title: "View Update & Installation Info" }],
    priority: 2, // High priority
  });

  // Store the URL to be opened when the notification button is clicked
  chrome.storage.local.set({ updateUrl: detailsUrl });
}

/**
 * Fetches the latest version info, compares it with the current version,
 * and shows a notification if an update is available.
 */
async function checkForUpdates() {
  console.log("PersistentMind: Checking for updates...");

  try {
    const response = await fetch(VERSION_CHECK_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch version info: ${response.statusText}`);
    }

    const remoteInfo = await response.json();
    const remoteVersion = remoteInfo.version;
    const detailsUrl = remoteInfo.details_url;

    if (!remoteVersion || !detailsUrl) {
      console.error(
        "PersistentMind: Malformed version file. Missing 'version' or 'details_url'.",
        remoteInfo
      );
      return;
    }

    const localVersion = chrome.runtime.getManifest().version;

    console.log(
      `PersistentMind: Local version: ${localVersion}, Remote version: ${remoteVersion}`
    );

    if (compareVersions(remoteVersion, localVersion) > 0) {
      console.log("PersistentMind: New version found!");
      showUpdateNotification(remoteVersion, detailsUrl);
    } else {
      console.log("PersistentMind: Extension is up to date.");
    }
  } catch (error) {
    console.error("PersistentMind: Error checking for updates:", error);
  }
}

// --- EVENT LISTENERS ---

// 1. Run when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    console.log("PersistentMind: First install. Setting up update check.");
  } else if (details.reason === "update") {
    console.log(
      `PersistentMind: Updated from ${details.previousVersion} to ${
        chrome.runtime.getManifest().version
      }.`
    );
  }

  // Create an alarm to check for updates periodically.
  // We use an alarm instead of setInterval for efficiency, as it doesn't run when the browser is closed.
  await chrome.alarms.create(UPDATE_CHECK_ALARM_NAME, {
    delayInMinutes: 1, // Check 1 minute after install/update
    periodInMinutes: 1440, // Then check once every 24 hours (1440 minutes)
  });
  console.log("PersistentMind: Update check alarm created/reset.");

  // Perform an initial check immediately
  await checkForUpdates();
});

// 2. Run when the alarm fires.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_CHECK_ALARM_NAME) {
    checkForUpdates();
  }
});

// 3. Run when the user clicks the button in the notification.
chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    if (notificationId === NOTIFICATION_ID && buttonIndex === 0) {
      const data = await chrome.storage.local.get("updateUrl");
      if (data.updateUrl) {
        chrome.tabs.create({ url: data.updateUrl });
        // Clear the notification after it's been clicked
        chrome.notifications.clear(NOTIFICATION_ID);
        // Clean up the stored URL
        chrome.storage.local.remove("updateUrl");
      }
    }
  }
);

// Initial log to confirm the script is running.
console.log("Background script loaded and update checker is active.");
