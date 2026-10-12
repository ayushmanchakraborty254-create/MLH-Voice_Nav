const apiKeyInput = document.getElementById("vdom-api-key");

if (apiKeyInput && typeof chrome !== "undefined" && chrome?.storage?.local) {
  chrome.storage.local.get(["GROQ_API_KEY"], (result) => {
    if (result?.GROQ_API_KEY) {
      apiKeyInput.value = result.GROQ_API_KEY;
    }
  });

  apiKeyInput.addEventListener("change", () => {
    chrome.storage.local.set({ GROQ_API_KEY: apiKeyInput.value.trim() });
  });
}

document.getElementById("activate-btn")?.addEventListener("click", async () => {
  if (apiKeyInput && typeof chrome !== "undefined" && chrome?.storage?.local) {
    await chrome.storage.local.set({ GROQ_API_KEY: apiKeyInput.value.trim() });
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "ACTIVATE_VOICEDOM" });
  }
});

