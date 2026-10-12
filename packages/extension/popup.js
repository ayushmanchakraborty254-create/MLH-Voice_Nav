const apiKeyInput = document.getElementById("vdom-api-key");

async function initKey() {
  if (apiKeyInput && typeof chrome !== "undefined" && chrome?.storage?.local) {
    const res = await chrome.storage.local.get(["GROQ_API_KEY"]);
    if (res?.GROQ_API_KEY) {
      apiKeyInput.value = res.GROQ_API_KEY;
    } else {
      try {
        const url = chrome.runtime.getURL("config.local.js");
        const resp = await fetch(url);
        if (resp.ok) {
          const text = await resp.text();
          const match = text.match(/gsk_[A-Za-z0-9]+/);
          if (match && match[0]) {
            apiKeyInput.value = match[0];
            await chrome.storage.local.set({ GROQ_API_KEY: match[0] });
          }
        }
      } catch (_) {}
    }

    apiKeyInput.addEventListener("change", () => {
      chrome.storage.local.set({ GROQ_API_KEY: apiKeyInput.value.trim() });
    });
  }
}
initKey();

document.getElementById("activate-btn")?.addEventListener("click", async () => {
  if (apiKeyInput && typeof chrome !== "undefined" && chrome?.storage?.local) {
    await chrome.storage.local.set({ GROQ_API_KEY: apiKeyInput.value.trim() });
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "ACTIVATE_VOICEDOM" });
  }
});

