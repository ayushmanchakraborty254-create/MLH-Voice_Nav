/**
 * VoxNav - Options Page Controller
 * Manages configuration persistence and interactive playground feedback.
 */

import { VoxNavSettings, ExtensionMessage } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/constants";

document.addEventListener("DOMContentLoaded", async () => {
  const optLanguage = document.getElementById("opt-language") as HTMLSelectElement;
  const optVoiceFeedback = document.getElementById("opt-voice-feedback") as HTMLInputElement;
  const optSpeechRate = document.getElementById("opt-speech-rate") as HTMLInputElement;
  const rateValue = document.getElementById("rate-value") as HTMLSpanElement;

  const optFloatingMic = document.getElementById("opt-floating-mic") as HTMLInputElement;
  const optNumberedLabels = document.getElementById("opt-numbered-labels") as HTMLInputElement;
  const optHighImpactConfirm = document.getElementById("opt-high-impact-confirm") as HTMLInputElement;
  const optSpacebarActivation = document.getElementById("opt-spacebar-activation") as HTMLInputElement;

  const optProfileUsername = document.getElementById("opt-profile-username") as HTMLInputElement;
  const optProfileName = document.getElementById("opt-profile-name") as HTMLInputElement;
  const optProfilePhone = document.getElementById("opt-profile-phone") as HTMLInputElement;

  const optAiAssist = document.getElementById("opt-ai-assist") as HTMLInputElement;
  const optAiProvider = document.getElementById("opt-ai-provider") as HTMLSelectElement;
  const groupApiKey = document.getElementById("group-api-key") as HTMLDivElement;
  const optAiApiKey = document.getElementById("opt-ai-api-key") as HTMLInputElement;
  const groupEndpoint = document.getElementById("group-endpoint") as HTMLDivElement;
  const optAiEndpoint = document.getElementById("opt-ai-endpoint") as HTMLInputElement;

  const optShowMicIndicator = document.getElementById("opt-show-mic-indicator") as HTMLInputElement;
  const optSendContext = document.getElementById("opt-send-context") as HTMLInputElement;

  const btnSave = document.getElementById("btn-save") as HTMLButtonElement;

  // Playground Elements
  const playBtn1 = document.getElementById("play-btn-1") as HTMLButtonElement;
  const playBtn2 = document.getElementById("play-btn-2") as HTMLButtonElement;
  const playSelect = document.getElementById("play-select") as HTMLSelectElement;
  const playInput = document.getElementById("play-input") as HTMLInputElement;
  const playFeedback = document.getElementById("play-feedback") as HTMLDivElement;

  // 1. Load Stored Settings
  const data = await chrome.storage.sync.get("voxnav_settings");
  const settings: VoxNavSettings = { ...DEFAULT_SETTINGS, ...(data.voxnav_settings || {}) };

  optLanguage.value = settings.language;
  optVoiceFeedback.checked = settings.voiceFeedback;
  optSpeechRate.value = String(settings.speechRate);
  rateValue.textContent = `${settings.speechRate}x`;

  optFloatingMic.checked = settings.floatingMic;
  optNumberedLabels.checked = settings.numberedLabels;
  optHighImpactConfirm.checked = settings.requireHighImpactConfirmation;
  optSpacebarActivation.checked = settings.spacebarActivation !== false;

  optProfileUsername.value = settings.savedProfile?.username || settings.savedProfile?.email || "";
  optProfileName.value = settings.savedProfile?.name || "";
  optProfilePhone.value = settings.savedProfile?.phone || "";

  optAiAssist.checked = settings.aiAssistance;
  optAiProvider.value = settings.aiProvider;
  optAiApiKey.value = settings.aiApiKey || "";
  optAiEndpoint.value = settings.aiEndpoint || "";

  optShowMicIndicator.checked = settings.showMicIndicator;
  optSendContext.checked = settings.sendPageContextToAi;

  updateProviderFields();

  // Dynamic Event Listeners
  optSpeechRate.addEventListener("input", () => {
    rateValue.textContent = `${optSpeechRate.value}x`;
  });

  optAiProvider.addEventListener("change", updateProviderFields);

  function updateProviderFields() {
    const provider = optAiProvider.value;
    if (provider === "groq" || provider === "openai") {
      groupApiKey.style.display = "flex";
      groupEndpoint.style.display = "none";
    } else if (provider === "ollama") {
      groupApiKey.style.display = "none";
      groupEndpoint.style.display = "flex";
    } else {
      groupApiKey.style.display = "none";
      groupEndpoint.style.display = "none";
    }
  }

  // 2. Save Settings
  btnSave.addEventListener("click", async () => {
    const updatedSettings: VoxNavSettings = {
      ...settings,
      language: optLanguage.value as any,
      voiceFeedback: optVoiceFeedback.checked,
      speechRate: parseFloat(optSpeechRate.value),
      floatingMic: optFloatingMic.checked,
      numberedLabels: optNumberedLabels.checked,
      requireHighImpactConfirmation: optHighImpactConfirm.checked,
      spacebarActivation: optSpacebarActivation.checked,
      savedProfile: {
        username: optProfileUsername.value.trim(),
        email: optProfileUsername.value.trim(),
        name: optProfileName.value.trim(),
        phone: optProfilePhone.value.trim()
      },
      aiAssistance: optAiAssist.checked,
      aiProvider: optAiProvider.value as any,
      aiApiKey: optAiApiKey.value.trim(),
      aiEndpoint: optAiEndpoint.value.trim(),
      showMicIndicator: optShowMicIndicator.checked,
      sendPageContextToAi: optSendContext.checked
    };

    await chrome.storage.sync.set({ voxnav_settings: updatedSettings });

    // Notify all active tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "VOXNAV_SETTINGS_UPDATED",
          settings: updatedSettings
        } as ExtensionMessage).catch(() => {});
      }
    }

    btnSave.textContent = "✓ Settings Saved!";
    setTimeout(() => {
      btnSave.textContent = "Save Settings";
    }, 1800);
  });

  // 3. Playground Interactivity
  playBtn1.addEventListener("click", () => {
    playFeedback.textContent = "Action Captured: 'Get Started Free' clicked successfully!";
    playFeedback.style.color = "#16A34A";
  });

  playBtn2.addEventListener("click", () => {
    playFeedback.textContent = "Action Captured: 'View Documentation' clicked successfully!";
    playFeedback.style.color = "#2563EB";
  });

  playSelect.addEventListener("change", () => {
    playFeedback.textContent = `Action Captured: Plan changed to '${playSelect.value}'!`;
    playFeedback.style.color = "#D97706";
  });

  playInput.addEventListener("input", () => {
    playFeedback.textContent = `Action Captured: Typing input '${playInput.value}'!`;
    playFeedback.style.color = "#4338CA";
  });
});
