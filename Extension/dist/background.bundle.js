"use strict";
(() => {
  // src/shared/constants.ts
  var DEFAULT_SETTINGS = {
    language: "en-US",
    voiceFeedback: true,
    speechRate: 1,
    speechPitch: 1,
    numberedLabels: false,
    floatingMic: true,
    aiAssistance: true,
    aiProvider: "offline",
    showMicIndicator: true,
    sendPageContextToAi: false,
    requireHighImpactConfirmation: true,
    spacebarActivation: true,
    theme: "auto"
  };

  // src/background/service-worker.ts
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
      const existing = await chrome.storage.sync.get("voxnav_settings");
      if (!existing.voxnav_settings) {
        await chrome.storage.sync.set({ voxnav_settings: DEFAULT_SETTINGS });
      }
      console.log("[VoxNav Service Worker] Successfully installed and configured default settings.");
    }
  });
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === "toggle-voice") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "VOXNAV_TOGGLE_VOICE" });
      }
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "VOXNAV_TAB_ACTION") {
      handleTabAction(message.action, sender.tab?.id).then(() => sendResponse({ success: true }));
      return true;
    }
    if (message.type === "VOXNAV_SPEAK" && message.text) {
      if (chrome.tts) {
        chrome.tts.speak(message.text, { rate: 1 });
      }
      sendResponse({ success: true });
      return true;
    }
  });
  async function handleTabAction(action, currentTabId) {
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
        if (tabs.length > 1 && currentTabId !== void 0) {
          const currentIndex = tabs.findIndex((t) => t.id === currentTabId);
          const nextIndex = (currentIndex + 1) % tabs.length;
          if (tabs[nextIndex].id !== void 0) {
            await chrome.tabs.update(tabs[nextIndex].id, { active: true });
          }
        }
        break;
      }
      case "PREVIOUS_TAB": {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        if (tabs.length > 1 && currentTabId !== void 0) {
          const currentIndex = tabs.findIndex((t) => t.id === currentTabId);
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          if (tabs[prevIndex].id !== void 0) {
            await chrome.tabs.update(tabs[prevIndex].id, { active: true });
          }
        }
        break;
      }
    }
  }
})();
