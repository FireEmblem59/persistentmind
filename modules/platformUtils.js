// --- START OF FILE modules/platformUtils.js ---
import { PLATFORMS } from "./constants.js";

// Import all adapter modules
import * as openaiAdapter from "../platforms/openaiAdapter.js";
import * as deepseekAdapter from "../platforms/deepseekAdapter.js";
import * as geminiAdapter from "../platforms/geminiAdapter.js";
import * as aistudioAdapter from "../platforms/aistudioAdapter.js";
import * as commonAdapterFunctions from "../platforms/common.js"; // For truly common functions if any

// Map platform keys (from constants.js) to their adapter modules
const platformAdapterMap = {
  OPENAI: openaiAdapter,
  DEEPSEEK: deepseekAdapter,
  GEMINI: geminiAdapter,
  AISTUDIO: aistudioAdapter,
};

export let currentPlatformConfig = null;
export let currentAdapter = null; // This will hold the active adapter's functions

export function determineCurrentPlatform() {
  const hostname = window.location.hostname;
  currentPlatformConfig = null; // Reset
  currentAdapter = null; // Reset

  for (const key in PLATFORMS) {
    if (hostname.includes(PLATFORMS[key].name)) {
      currentPlatformConfig = PLATFORMS[key];
      currentPlatformConfig.key = key; // Add key for easier reference

      currentAdapter = platformAdapterMap[key]; // Get the adapter from the map

      if (!currentAdapter || Object.keys(currentAdapter).length === 0) {
        // Check if adapter exists and has exports
        console.warn(
          `PersistentMind: Platform determined: ${currentPlatformConfig.name} (Key: ${currentPlatformConfig.key}), but NO specific adapter functions found or adapter file is empty. Generic handlers will be used.`
        );
        // currentAdapter = commonAdapterFunctions; // Or some default adapter with generic methods
      } else {
        console.log(
          `PersistentMind: Platform determined: ${currentPlatformConfig.name} (Key: ${currentPlatformConfig.key}). Adapter loaded.`
        );
      }
      return currentPlatformConfig;
    }
  }
  console.log("PersistentMind: Unknown platform.");
  return null;
}

export function getPlatformConfig() {
  return currentPlatformConfig;
}

export function getAdapter() {
  return currentAdapter;
}

// Initialize on load so currentPlatformConfig and currentAdapter are available.
determineCurrentPlatform();
// --- END OF FILE modules/platformUtils.js ---
