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

  // src/options/options.ts
  document.addEventListener("DOMContentLoaded", async () => {
    const optLanguage = document.getElementById("opt-language");
    const optVoiceFeedback = document.getElementById("opt-voice-feedback");
    const optSpeechRate = document.getElementById("opt-speech-rate");
    const rateValue = document.getElementById("rate-value");
    const optFloatingMic = document.getElementById("opt-floating-mic");
    const optNumberedLabels = document.getElementById("opt-numbered-labels");
    const optHighImpactConfirm = document.getElementById("opt-high-impact-confirm");
    const optSpacebarActivation = document.getElementById("opt-spacebar-activation");
    const optProfileUsername = document.getElementById("opt-profile-username");
    const optProfileName = document.getElementById("opt-profile-name");
    const optProfilePhone = document.getElementById("opt-profile-phone");
    const optAiAssist = document.getElementById("opt-ai-assist");
    const optAiProvider = document.getElementById("opt-ai-provider");
    const groupApiKey = document.getElementById("group-api-key");
    const optAiApiKey = document.getElementById("opt-ai-api-key");
    const groupEndpoint = document.getElementById("group-endpoint");
    const optAiEndpoint = document.getElementById("opt-ai-endpoint");
    const optShowMicIndicator = document.getElementById("opt-show-mic-indicator");
    const optSendContext = document.getElementById("opt-send-context");
    const btnSave = document.getElementById("btn-save");
    const playBtn1 = document.getElementById("play-btn-1");
    const playBtn2 = document.getElementById("play-btn-2");
    const playSelect = document.getElementById("play-select");
    const playInput = document.getElementById("play-input");
    const playFeedback = document.getElementById("play-feedback");
    const data = await chrome.storage.sync.get("voxnav_settings");
    const settings = { ...DEFAULT_SETTINGS, ...data.voxnav_settings || {} };
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
    btnSave.addEventListener("click", async () => {
      const updatedSettings = {
        ...settings,
        language: optLanguage.value,
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
        aiProvider: optAiProvider.value,
        aiApiKey: optAiApiKey.value.trim(),
        aiEndpoint: optAiEndpoint.value.trim(),
        showMicIndicator: optShowMicIndicator.checked,
        sendPageContextToAi: optSendContext.checked
      };
      await chrome.storage.sync.set({ voxnav_settings: updatedSettings });
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "VOXNAV_SETTINGS_UPDATED",
            settings: updatedSettings
          }).catch(() => {
          });
        }
      }
      btnSave.textContent = "\u2713 Settings Saved!";
      setTimeout(() => {
        btnSave.textContent = "Save Settings";
      }, 1800);
    });
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
})();
