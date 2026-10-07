/**
 * VoxNav - Popup Script
 * Manages popup controls, live page statistics, and user interactions.
 */

import { PageSummary, ExtensionMessage } from "../shared/types";

document.addEventListener("DOMContentLoaded", async () => {
  const btnToggleVoice = document.getElementById("btn-toggle-voice") as HTMLButtonElement;
  const voiceBtnLabel = document.getElementById("voice-btn-label") as HTMLSpanElement;
  const headerStatus = document.getElementById("header-status") as HTMLDivElement;
  const statusText = document.getElementById("status-text") as HTMLSpanElement;
  const pageDomain = document.getElementById("page-domain") as HTMLSpanElement;

  const statButtons = document.getElementById("stat-buttons") as HTMLSpanElement;
  const statLinks = document.getElementById("stat-links") as HTMLSpanElement;
  const statInputs = document.getElementById("stat-inputs") as HTMLSpanElement;
  const statHeadings = document.getElementById("stat-headings") as HTMLSpanElement;

  const lastCommand = document.getElementById("last-command") as HTMLSpanElement;
  const lastResult = document.getElementById("last-result") as HTMLSpanElement;

  const chipNumbers = document.getElementById("chip-numbers") as HTMLButtonElement;
  const numbersState = document.getElementById("numbers-state") as HTMLSpanElement;
  const chipFeedback = document.getElementById("chip-feedback") as HTMLButtonElement;
  const feedbackState = document.getElementById("feedback-state") as HTMLSpanElement;

  const btnDemo = document.getElementById("btn-demo") as HTMLButtonElement;
  const btnSettings = document.getElementById("btn-settings") as HTMLButtonElement;

  let currentTabId: number | undefined;

  // 1. Get Active Tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && activeTab.id) {
    currentTabId = activeTab.id;

    try {
      const urlObj = new URL(activeTab.url || "");
      pageDomain.textContent = urlObj.hostname || "Active Tab";
    } catch {
      pageDomain.textContent = "Current Page";
    }

    // 2. Query Page Summary from Content Script
    chrome.tabs.sendMessage(
      activeTab.id,
      { type: "VOXNAV_GET_PAGE_SUMMARY" } as ExtensionMessage,
      (summary: PageSummary) => {
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

  // 3. Load Persistent Settings for Feedback
  chrome.storage.sync.get("voxnav_settings", (data) => {
    const settings = data.voxnav_settings;
    if (settings) {
      feedbackState.textContent = settings.voiceFeedback ? "ON" : "OFF";
      feedbackState.classList.toggle("active", settings.voiceFeedback);
    }
  });

  function updateVoiceUI(isListening: boolean) {
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

  function updateNumbersUI(isActive: boolean) {
    numbersState.textContent = isActive ? "ON" : "OFF";
    numbersState.classList.toggle("active", isActive);
  }

  // Toggle Voice
  btnToggleVoice.addEventListener("click", () => {
    if (!currentTabId) return;
    chrome.tabs.sendMessage(
      currentTabId,
      { type: "VOXNAV_TOGGLE_VOICE" } as ExtensionMessage,
      (res) => {
        if (res) updateVoiceUI(res.isListening);
      }
    );
  });

  // Toggle Numbered Navigation
  chipNumbers.addEventListener("click", () => {
    if (!currentTabId) return;
    chrome.tabs.sendMessage(
      currentTabId,
      { type: "VOXNAV_TOGGLE_NUMBERS" } as ExtensionMessage,
      (res) => {
        if (res) updateNumbersUI(res.active);
      }
    );
  });

  // Toggle Voice Feedback
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
      } as ExtensionMessage);
    }
  });

  // Run Demo
  btnDemo.addEventListener("click", () => {
    if (!currentTabId) return;
    chrome.tabs.sendMessage(currentTabId, { type: "VOXNAV_START_DEMO" } as ExtensionMessage);
    window.close(); // Close popup so user sees demo on page
  });

  // Open Settings
  btnSettings.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
