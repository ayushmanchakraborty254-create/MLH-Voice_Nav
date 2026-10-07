"use strict";
(() => {
  // src/popup/popup.ts
  document.addEventListener("DOMContentLoaded", async () => {
    const btnToggleVoice = document.getElementById("btn-toggle-voice");
    const voiceBtnLabel = document.getElementById("voice-btn-label");
    const headerStatus = document.getElementById("header-status");
    const statusText = document.getElementById("status-text");
    const pageDomain = document.getElementById("page-domain");
    const statButtons = document.getElementById("stat-buttons");
    const statLinks = document.getElementById("stat-links");
    const statInputs = document.getElementById("stat-inputs");
    const statHeadings = document.getElementById("stat-headings");
    const lastCommand = document.getElementById("last-command");
    const lastResult = document.getElementById("last-result");
    const chipNumbers = document.getElementById("chip-numbers");
    const numbersState = document.getElementById("numbers-state");
    const chipFeedback = document.getElementById("chip-feedback");
    const feedbackState = document.getElementById("feedback-state");
    const btnDemo = document.getElementById("btn-demo");
    const btnSettings = document.getElementById("btn-settings");
    let currentTabId;
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id) {
      currentTabId = activeTab.id;
      try {
        const urlObj = new URL(activeTab.url || "");
        pageDomain.textContent = urlObj.hostname || "Active Tab";
      } catch {
        pageDomain.textContent = "Current Page";
      }
      chrome.tabs.sendMessage(
        activeTab.id,
        { type: "VOXNAV_GET_PAGE_SUMMARY" },
        (summary) => {
          if (chrome.runtime.lastError || !summary) {
            pageDomain.textContent = "VoxNav Inactive";
            statusText.textContent = "Idle";
            return;
          }
          statButtons.textContent = String(summary.buttonCount);
          statLinks.textContent = String(summary.linkCount);
          statInputs.textContent = String(summary.inputCount);
          statHeadings.textContent = String(summary.headingCount);
          if (summary.lastCommand) lastCommand.textContent = `"${summary.lastCommand}"`;
          if (summary.lastResult) lastResult.textContent = summary.lastResult;
          updateVoiceUI(summary.isVoiceActive);
          updateNumbersUI(summary.numberedModeActive);
        }
      );
    }
    chrome.storage.sync.get("voxnav_settings", (data) => {
      const settings = data.voxnav_settings;
      if (settings) {
        feedbackState.textContent = settings.voiceFeedback ? "ON" : "OFF";
        feedbackState.classList.toggle("active", settings.voiceFeedback);
      }
    });
    function updateVoiceUI(isListening) {
      if (isListening) {
        voiceBtnLabel.textContent = "Stop Listening";
        btnToggleVoice.classList.add("listening");
        headerStatus.classList.add("listening");
        statusText.textContent = "Listening";
      } else {
        voiceBtnLabel.textContent = "Start Voice Navigation";
        btnToggleVoice.classList.remove("listening");
        headerStatus.classList.remove("listening");
        statusText.textContent = "Ready";
      }
    }
    function updateNumbersUI(isActive) {
      numbersState.textContent = isActive ? "ON" : "OFF";
      numbersState.classList.toggle("active", isActive);
    }
    btnToggleVoice.addEventListener("click", () => {
      if (!currentTabId) return;
      chrome.tabs.sendMessage(
        currentTabId,
        { type: "VOXNAV_TOGGLE_VOICE" },
        (res) => {
          if (res) updateVoiceUI(res.isListening);
        }
      );
    });
    chipNumbers.addEventListener("click", () => {
      if (!currentTabId) return;
      chrome.tabs.sendMessage(
        currentTabId,
        { type: "VOXNAV_TOGGLE_NUMBERS" },
        (res) => {
          if (res) updateNumbersUI(res.active);
        }
      );
    });
    chipFeedback.addEventListener("click", async () => {
      const data = await chrome.storage.sync.get("voxnav_settings");
      const settings = data.voxnav_settings || {};
      const nextState = !settings.voiceFeedback;
      settings.voiceFeedback = nextState;
      await chrome.storage.sync.set({ voxnav_settings: settings });
      feedbackState.textContent = nextState ? "ON" : "OFF";
      feedbackState.classList.toggle("active", nextState);
      if (currentTabId) {
        chrome.tabs.sendMessage(currentTabId, {
          type: "VOXNAV_SETTINGS_UPDATED",
          settings: { voiceFeedback: nextState }
        });
      }
    });
    btnDemo.addEventListener("click", () => {
      if (!currentTabId) return;
      chrome.tabs.sendMessage(currentTabId, { type: "VOXNAV_START_DEMO" });
      window.close();
    });
    btnSettings.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  });
})();
