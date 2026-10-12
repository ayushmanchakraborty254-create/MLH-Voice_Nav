const apiKeyInput = document.getElementById("vdom-api-key");
const toggleInput = document.getElementById("vdom-toggle");
const statusLabel = document.getElementById("toggle-status-label");
const statusDot = document.getElementById("status-dot");
const activateBtn = document.getElementById("activate-btn");
const btnText = document.getElementById("btn-text");

// Initialize API Key from storage or local config
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

// Update UI toggle appearance
function updateToggleUI(enabled) {
  if (statusLabel) {
    statusLabel.textContent = enabled ? "Enabled (ON)" : "Disabled (OFF)";
    statusLabel.style.color = enabled ? "#B45309" : "#8C6239";
  }
  if (statusDot) {
    if (enabled) {
      statusDot.classList.remove("off");
    } else {
      statusDot.classList.add("off");
    }
  }
  if (btnText) {
    btnText.textContent = enabled ? "Activate Voice Controller" : "Turn ON & Activate";
  }
}

// Initialize ON/OFF Toggle State
async function initToggle() {
  if (toggleInput && typeof chrome !== "undefined" && chrome?.storage?.local) {
    const res = await chrome.storage.local.get(["CIPHER_ENABLED"]);
    const isEnabled = res.CIPHER_ENABLED !== false; // Default true
    toggleInput.checked = isEnabled;
    updateToggleUI(isEnabled);

    toggleInput.addEventListener("change", async () => {
      const checked = toggleInput.checked;
      updateToggleUI(checked);
      await chrome.storage.local.set({ CIPHER_ENABLED: checked });

      // Notify active tab of state change
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { 
          action: "TOGGLE_EXTENSION", 
          enabled: checked 
        });
      }
    });
  }
}

initKey();
initToggle();

// Activate Controller button handler
activateBtn?.addEventListener("click", async () => {
  if (apiKeyInput && typeof chrome !== "undefined" && chrome?.storage?.local) {
    await chrome.storage.local.set({ GROQ_API_KEY: apiKeyInput.value.trim() });
  }

  // If currently toggled OFF, switch it ON
  if (toggleInput && !toggleInput.checked) {
    toggleInput.checked = true;
    updateToggleUI(true);
    if (chrome?.storage?.local) {
      await chrome.storage.local.set({ CIPHER_ENABLED: true });
    }
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { 
      action: "ACTIVATE_VOICEDOM",
      enabled: true 
    });
  }

  // Quick feedback
  if (btnText) {
    const orig = btnText.textContent;
    btnText.textContent = "⚡ Activated on Tab!";
    setTimeout(() => {
      btnText.textContent = orig;
    }, 1200);
  }
});
