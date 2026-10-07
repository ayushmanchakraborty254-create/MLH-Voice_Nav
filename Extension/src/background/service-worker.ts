/**
 * VoxNav - Background Service Worker (Manifest V3)
 * Handles global shortcuts, tab management, storage initialization, and tab messaging.
 */

import { DEFAULT_SETTINGS } from "../shared/constants";
import { ExtensionMessage } from "../shared/types";

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const existing = await chrome.storage.sync.get("voxnav_settings");
    if (!existing.voxnav_settings) {
      await chrome.storage.sync.set({ voxnav_settings: DEFAULT_SETTINGS });
    }
    console.log("[VoxNav Service Worker] Successfully installed and configured default settings.");
  }
});

// Handle Keyboard Shortcuts (e.g. Ctrl+Shift+V)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-voice") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: "VOXNAV_TOGGLE_VOICE" } as ExtensionMessage);
    }
  }
});

// Handle Messages from Content Script or Popup
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  if (message.type === "VOXNAV_TAB_ACTION") {
    handleTabAction(message.action, sender.tab?.id).then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "VOXNAV_SPEAK" && message.text) {
    if (chrome.tts) {
      chrome.tts.speak(message.text, { rate: 1.0 });
    }
    sendResponse({ success: true });
    return true;
  }
});

async function handleTabAction(action: string, currentTabId?: number): Promise<void> {
  switch (action) {
    case "NEW_TAB":
      await chrome.tabs.create({ url: "chrome://newtab" });
      break;

    case "CLOSE_TAB":
      if (currentTabId) {
        await chrome.tabs.remove(currentTabId);
      }
      break;

    case "NEXT_TAB": {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (tabs.length > 1 && currentTabId !== undefined) {
        const currentIndex = tabs.findIndex((t) => t.id === currentTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        if (tabs[nextIndex].id !== undefined) {
          await chrome.tabs.update(tabs[nextIndex].id!, { active: true });
        }
      }
      break;
    }

    case "PREVIOUS_TAB": {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (tabs.length > 1 && currentTabId !== undefined) {
        const currentIndex = tabs.findIndex((t) => t.id === currentTabId);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (tabs[prevIndex].id !== undefined) {
          await chrome.tabs.update(tabs[prevIndex].id!, { active: true });
        }
      }
      break;
    }
  }
}
