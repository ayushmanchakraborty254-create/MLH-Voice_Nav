(function() {
  if (window.top !== window.self) return;
  if (window.__voicedom_injected) return;
  window.__voicedom_injected = true;

  let GROQ_API_KEY = "";

  async function loadGroqKey() {
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      try {
        const stored = await chrome.storage.local.get(["GROQ_API_KEY"]);
        if (stored?.GROQ_API_KEY) {
          GROQ_API_KEY = stored.GROQ_API_KEY;
          return;
        }
      } catch (_) {}
    }
    if (typeof window !== "undefined" && window.CIPHER_LOCAL_KEY) {
      GROQ_API_KEY = window.CIPHER_LOCAL_KEY;
      return;
    }
    try {
      if (typeof chrome !== "undefined" && chrome?.runtime?.getURL) {
        const url = chrome.runtime.getURL("config.local.js");
        const resp = await fetch(url);
        if (resp.ok) {
          const text = await resp.text();
          const match = text.match(/gsk_[A-Za-z0-9]+/);
          if (match && match[0]) {
            GROQ_API_KEY = match[0];
            if (chrome?.storage?.local) {
              chrome.storage.local.set({ GROQ_API_KEY: match[0] });
            }
          }
        }
      }
    } catch (_) {}
  }
  loadGroqKey();

  if (typeof chrome !== "undefined" && chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.GROQ_API_KEY?.newValue) {
        GROQ_API_KEY = changes.GROQ_API_KEY.newValue;
      }
    });
  }
  const GROQ_MODEL = "qwen/qwen3.8-27b";

  let isListening = false;
  let isProcessing = false;
  let isSpeaking = false;
  let recognition = null;
  let silenceTimer = null;
  let currentTranscript = "";
  let lastProcessedQuery = "";
  let lastProcessedTime = 0;
  let activeHighlightPin = null;

  const conversationHistory = [];
  let lastActiveField = null;

  function isTabActiveAndVisible() {
    return document.visibilityState === "visible" && !document.hidden;
  }

  // Speech Recognition Setup
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
  }

  // Inject Floating Voice Radar Bar
  const overlay = document.createElement("div");
  overlay.id = "voicedom-extension-overlay";
  overlay.innerHTML = `
    <style>
      #voicedom-ext-bar {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        background: #FEF9E7;
        backdrop-filter: blur(18px);
        border: 1.5px solid #ECD9B0;
        box-shadow: 0 12px 35px rgba(60, 35, 10, 0.22), 0 0 20px rgba(245, 158, 11, 0.2);
        border-radius: 16px;
        padding: 12px 16px;
        color: #38210D;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        width: 380px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-sizing: border-box;
        transition: all 0.25s ease;
      }
      .vdom-ext-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        font-weight: 700;
        color: #38210D;
      }
      .vdom-ext-badge {
        font-size: 9.5px;
        background: #F8E5B8;
        color: #78350F;
        border: 1px solid #ECD9B0;
        padding: 2px 7px;
        border-radius: 9999px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .vdom-ext-close {
        background: transparent;
        border: none;
        color: #8C6239;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 6px;
        transition: all 0.15s ease;
      }
      .vdom-ext-close:hover {
        background: #F4E4BC;
        color: #38210D;
      }
      .vdom-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
      }
      .vdom-ext-input {
        width: 100%;
        background: #FFFFFF;
        border: 1.5px solid #ECD9B0;
        border-radius: 9px;
        padding: 8px 34px 8px 12px;
        color: #38210D;
        font-size: 12px;
        font-family: inherit;
        outline: none;
        transition: all 0.2s;
        box-sizing: border-box;
      }
      .vdom-ext-input:focus {
        border-color: #D97706;
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25);
        background: #FFFFFF;
      }
      .vdom-ext-input::placeholder {
        color: #A89078;
        font-size: 11.5px;
      }
      .vdom-input-send {
        position: absolute;
        right: 8px;
        background: transparent;
        border: none;
        color: #D97706;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: transform 0.15s;
      }
      .vdom-input-send:hover {
        transform: scale(1.15);
        color: #B45309;
      }
      .vdom-ext-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      .vdom-ext-status {
        font-size: 11px;
        color: #755233;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 170px;
        font-weight: 500;
      }
      .vdom-btn-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .vdom-ext-btn {
        background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%);
        border: 1px solid #D97706;
        color: #381E04;
        padding: 6px 12px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 11px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(217, 119, 6, 0.25);
      }
      .vdom-ext-btn:hover {
        background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
      }
      .vdom-ext-btn.rec {
        background: #ef4444;
        border-color: #dc2626;
        color: white;
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
        animation: vdom-pulse 1.5s infinite;
      }
      .vdom-read-btn {
        background: #FFFDF5;
        border: 1.5px solid #ECD9B0;
        color: #78350F;
        box-shadow: none;
      }
      .vdom-read-btn:hover {
        background: #FDF4D4;
        border-color: #DDAF60;
        transform: translateY(-1px);
      }
      @keyframes vdom-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.85; transform: scale(0.97); }
      }
      @keyframes vdom-target-radar {
        0% { outline: 4px solid #F59E0B; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.8); }
        50% { outline: 4px solid #D97706; box-shadow: 0 0 0 16px rgba(245, 158, 11, 0); }
        100% { outline: 4px solid #F59E0B; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
      }
      .vdom-radar-highlight {
        animation: vdom-target-radar 1.5s infinite !important;
        border-radius: 6px !important;
        transition: all 0.3s !important;
      }
      .vdom-pin-badge {
        position: absolute;
        z-index: 2147483646;
        background: #F59E0B;
        color: #381E04;
        font-weight: 700;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 6px;
        box-shadow: 0 4px 14px rgba(60, 30, 10, 0.3);
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 4px;
        animation: vdom-pin-float 2s infinite ease-in-out;
      }
      @keyframes vdom-pin-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
    </style>
    <div id="voicedom-ext-bar">
      <div class="vdom-ext-head">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>🎙️ Cipher</span>
          <span class="vdom-ext-badge" id="vdom-modal-badge">ACTIVE TAB</span>
        </div>
        <button id="vdom-btn-close" class="vdom-ext-close" title="Turn OFF Cipher">✕</button>
      </div>
      <div class="vdom-input-wrapper">
        <input 
          type="text" 
          id="vdom-ext-input" 
          class="vdom-ext-input" 
          placeholder="Ask Cipher: click, fill, scroll, read..." 
          autocomplete="off"
        />
        <button id="vdom-btn-send" class="vdom-input-send" title="Send command (Enter)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
      <div class="vdom-ext-footer">
        <span class="vdom-ext-status" id="vdom-ext-status">Ready</span>
        <div class="vdom-btn-group">
          <button class="vdom-ext-btn vdom-read-btn" id="vdom-btn-read" title="Read page or active modal out loud">🔊 Read</button>
          <button class="vdom-ext-btn" id="vdom-ext-mic">🎙️ Speak</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const inputEl = document.getElementById("vdom-ext-input");
  const sendBtn = document.getElementById("vdom-btn-send");
  const statusBox = document.getElementById("vdom-ext-status");
  const micBtn = document.getElementById("vdom-ext-mic");
  const readBtn = document.getElementById("vdom-btn-read");
  const modalBadge = document.getElementById("vdom-modal-badge");

  function isElementVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  function getActiveTrueModalContainer() {
    const modalSelectors = [
      'dialog[open]',
      '[role="dialog"][aria-modal="true"]',
      '.swal2-popup',
      '.MuiDialog-paper',
      '.chakra-modal__content',
      '.ant-modal-content',
      '.modal.show .modal-content',
      '.modal.in .modal-content'
    ];

    for (const sel of modalSelectors) {
      const el = document.querySelector(sel);
      if (el && isElementVisible(el) && el.id !== "voicedom-extension-overlay" && !el.closest("#voicedom-extension-overlay")) {
        return el;
      }
    }

    const candidates = Array.from(document.querySelectorAll("div[style*='z-index']"));
    const viewportWidth = window.innerWidth;

    for (const el of candidates) {
      if (el.id === "voicedom-extension-overlay" || el.closest("#voicedom-extension-overlay")) continue;
      const style = window.getComputedStyle(el);
      const z = parseInt(style.zIndex, 10);

      if (z >= 100 && (style.position === "fixed" || style.position === "absolute") && isElementVisible(el)) {
        const rect = el.getBoundingClientRect();
        const isNotSidebar = rect.left > (viewportWidth * 0.08) && rect.right < (viewportWidth * 0.92);
        if (isNotSidebar && rect.width > 250 && rect.height > 150) {
          if (el.querySelector("button, [role='button'], .btn, a, input")) {
            return el;
          }
        }
      }
    }

    return null;
  }

  function getReadablePageContent() {
    const trueModal = getActiveTrueModalContainer();
    const root = trueModal || document.body;

    let title = "";
    if (trueModal) {
      const header = trueModal.querySelector("h1, h2, h3, h4, h5, [class*='title' i], [class*='header' i]");
      title = header ? header.innerText.trim() : "Modal Instructions";
    } else {
      title = document.title;
    }

    const textNodes = Array.from(root.querySelectorAll("h1, h2, h3, h4, p, li, [class*='instruction' i], [class*='alert' i], [class*='card-text' i]"))
      .filter(n => isElementVisible(n) && !n.closest("#voicedom-extension-overlay"))
      .map(n => n.innerText.trim())
      .filter(t => t.length > 5);

    const uniqueTexts = Array.from(new Set(textNodes));
    const fullContent = (title ? `${title}\n\n` : "") + uniqueTexts.join("\n");
    return fullContent.slice(0, 1500);
  }

  function getDOMSnapshot(userQuery = "") {
    const trueModal = getActiveTrueModalContainer();
    if (modalBadge) {
      if (trueModal) {
        modalBadge.innerText = "MODAL OPEN";
        modalBadge.style.background = "#F8E5B8";
        modalBadge.style.color = "#78350F";
      } else {
        modalBadge.innerText = "ACTIVE TAB";
        modalBadge.style.background = "#F8E5B8";
        modalBadge.style.color = "#78350F";
      }
    }

    const interactiveQuery = `
      button, 
      a[href], 
      input:not([type="hidden"]), 
      select, 
      textarea, 
      [role="button"], 
      [role="checkbox"], 
      [role="tab"], 
      [role="link"],
      [onclick],
      .btn
    `;

    const rawElements = Array.from(document.querySelectorAll(interactiveQuery));
    let counter = 1;
    const scoredList = [];
    const queryTokens = (userQuery || "").toLowerCase().split(/\s+/).filter(t => t.length > 2);

    for (const el of rawElements) {
      if (!isElementVisible(el)) continue;
      if (el.closest("#voicedom-extension-overlay")) continue;
      if (el.disabled || el.getAttribute("aria-disabled") === "true") continue;

      let id = el.id;
      if (!id) {
        id = el.getAttribute("data-vdom-id");
        if (!id) {
          id = `vdom-el-${counter++}`;
          el.setAttribute("data-vdom-id", id);
        }
      }

      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute("type") || "").toLowerCase();
      let text = (el.innerText || el.textContent || "").trim().slice(0, 50);

      let associatedLabel = "";
      if (tag === "input" && (type === "checkbox" || type === "radio")) {
        if (el.id) {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          if (lbl) associatedLabel = (lbl.innerText || "").trim().slice(0, 50);
        }
        if (!associatedLabel && el.parentElement) {
          associatedLabel = (el.parentElement.innerText || "").trim().slice(0, 50);
        }
      }

      const ariaLabel = (el.getAttribute("aria-label") || "").trim().slice(0, 50);
      const placeholder = (el.getAttribute("placeholder") || "").trim().slice(0, 35);
      const name = (el.getAttribute("name") || "").trim().slice(0, 35);
      const currentValue = (tag === "input" || tag === "textarea" || tag === "select") ? (el.value || "").slice(0, 35) : "";
      const isChecked = el.checked === true || el.getAttribute("aria-checked") === "true";
      const inModal = trueModal ? trueModal.contains(el) : false;
      const selector = el.id ? `#${el.id}` : `[data-vdom-id="${id}"]`;

      const finalLabel = text || associatedLabel || ariaLabel || placeholder || name;
      if (!finalLabel && tag === "a") continue;

      // Relevance score
      let score = 0;
      if (inModal) score += 50;

      const rect = el.getBoundingClientRect();
      const inViewport = rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
      if (inViewport) score += 15;

      const fullSearchStr = `${finalLabel} ${name} ${placeholder}`.toLowerCase();
      for (const tok of queryTokens) {
        if (fullSearchStr.includes(tok)) score += 30;
      }

      // Compact payload format
      const compactItem = {
        selector,
        tag: tag === "a" ? "link" : tag,
        label: finalLabel.slice(0, 45)
      };
      if (type && type !== "button" && type !== "submit") compactItem.type = type;
      if (placeholder) compactItem.placeholder = placeholder;
      if (name) compactItem.name = name;
      if (currentValue) compactItem.value = currentValue;
      if (isChecked) compactItem.checked = true;

      scoredList.push({ item: compactItem, score, inModal });
    }

    scoredList.sort((a, b) => b.score - a.score);

    // Limit to top 25 high-priority elements (~500 tokens total)
    const elements = scoredList.slice(0, 25).map(s => s.item);

    return {
      title: (document.title || "").slice(0, 60),
      url: window.location.pathname,
      hasActiveModal: !!trueModal,
      elements
    };
  }

  function toggleCheckboxElement(el, shouldCheck) {
    if (!el) return;

    let input = null;
    if (el.tagName.toLowerCase() === "input" && (el.type === "checkbox" || el.type === "radio")) {
      input = el;
    } else if (el.querySelector) {
      input = el.querySelector('input[type="checkbox"], input[type="radio"]');
    }
    if (!input && el.getAttribute && el.getAttribute("for")) {
      input = document.getElementById(el.getAttribute("for"));
    }

    const target = input || el;

    if (target.tagName && target.tagName.toLowerCase() === "input" && (target.type === "checkbox" || target.type === "radio")) {
      const isCurrentlyChecked = target.checked;
      const targetState = shouldCheck !== undefined ? shouldCheck : !isCurrentlyChecked;

      target.click();

      if (target.checked !== targetState) {
        try {
          const proto = window.HTMLInputElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, "checked");
          if (desc && desc.set) {
            desc.set.call(target, targetState);
          } else {
            target.checked = targetState;
          }
        } catch (e) {
          target.checked = targetState;
        }
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else {
      if (el.getAttribute && el.getAttribute("role") === "checkbox") {
        const isAriaChecked = el.getAttribute("aria-checked") === "true";
        el.setAttribute("aria-checked", (!isAriaChecked).toString());
      }
      el.click();
    }
  }

  function speakText(text, onComplete) {
    if (!window.speechSynthesis || !isTabActiveAndVisible()) return;

    stopListening();
    window.speechSynthesis.cancel();
    isSpeaking = true;
    readBtn.innerText = "⏹️ Stop";
    statusBox.innerText = "🔊 Speaking...";

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      isSpeaking = false;
      readBtn.innerText = "🔊 Read";
      statusBox.innerText = "Ready";
      if (onComplete) onComplete();
    };

    utterance.onerror = () => {
      isSpeaking = false;
      readBtn.innerText = "🔊 Read";
      statusBox.innerText = "Ready";
    };

    window.speechSynthesis.speak(utterance);
  }

  function locateAndHighlightTarget(el, labelText) {
    if (!el) return;

    if (activeHighlightPin && activeHighlightPin.parentNode) {
      activeHighlightPin.parentNode.removeChild(activeHighlightPin);
      activeHighlightPin = null;
    }

    document.querySelectorAll(".vdom-radar-highlight").forEach(node => {
      node.classList.remove("vdom-radar-highlight");
    });

    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    el.classList.add("vdom-radar-highlight");

    const rect = el.getBoundingClientRect();
    const pin = document.createElement("div");
    pin.className = "vdom-pin-badge";
    pin.innerHTML = `📍 <span>${labelText || "Target"}</span>`;
    pin.style.top = `${window.scrollY + rect.top - 32}px`;
    pin.style.left = `${window.scrollX + rect.left}px`;
    document.body.appendChild(pin);
    activeHighlightPin = pin;

    setTimeout(() => {
      el.classList.remove("vdom-radar-highlight");
      if (pin && pin.parentNode) pin.parentNode.removeChild(pin);
      if (activeHighlightPin === pin) activeHighlightPin = null;
    }, 6000);
  }

  function triggerRealClick(el) {
    if (!el) return;
    el.focus();
    el.click();
  }

  // Robust Field Replacement Type Dispatcher (Overwrites & Cleans Old Text)
  async function executeTypeOnElement(el, value) {
    if (!el) return;
    locateAndHighlightTarget(el, `Replaced: ${value}`);
    el.focus();

    try {
      // 1. Clear previous value cleanly
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));

      // 2. Set new replacement value using prototype descriptor
      const proto = window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) {
        desc.set.call(el, value || "");
      } else {
        el.value = value || "";
      }
    } catch (e) {
      el.value = value || "";
    }

    // 3. Dispatch change & input events so framework state updates
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function executeAction(action) {
    if (!action) return;

    // 1. Direct Page Navigation URL
    if (action.type === "NAVIGATE" && action.targetUrl) {
      statusBox.innerText = `Navigating to ${action.targetUrl}...`;
      window.location.href = action.targetUrl;
      return;
    }

    // 2. Read Page / Modal
    if (action.type === "READ_PAGE") {
      const textToRead = action.value || getReadablePageContent();
      inputEl.value = "🔊 Reading: " + textToRead.slice(0, 60) + "...";
      speakText(textToRead);
      return;
    }

    // 3. Locate & Scroll to Element
    if (action.type === "LOCATE_ELEMENT" || action.type === "HIGHLIGHT") {
      let targetEl = action.selector ? document.querySelector(action.selector) : null;
      if (!targetEl && action.value) {
        const searchVal = action.value.toLowerCase();
        const candidates = Array.from(document.querySelectorAll("button, a, input, [role='button'], h1, h2, h3, p, label"));
        targetEl = candidates.find(c => (c.innerText || c.textContent || "").toLowerCase().includes(searchVal));
      }
      if (targetEl) {
        locateAndHighlightTarget(targetEl, action.label || action.value || "Target Element");
      }
      return;
    }

    // 4. Generic Scroll
    if (action.type === "SCROLL") {
      const amount = action.direction === "UP" ? -400 : 400;
      window.scrollBy({ top: amount, behavior: "smooth" });
      return;
    }

    // 5. Click / Navigation / Checkbox Toggle
    if ((action.type === "CLICK" || action.type === "TOGGLE_CHECKBOX") && action.selector) {
      let el = document.querySelector(action.selector);

      if (!el && action.label) {
        const searchVal = action.label.toLowerCase();
        const candidates = Array.from(document.querySelectorAll("button, a, .btn, [role='button'], input[type='button'], input[type='submit']"));
        el = candidates.find(c => (c.innerText || c.textContent || c.value || "").toLowerCase().includes(searchVal));
      }

      if (el) {
        locateAndHighlightTarget(el, "Clicked");
        await new Promise(r => setTimeout(r, 150));

        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute("type") || "").toLowerCase();
        const isCheckboxOrRadio = (tag === "input" && (type === "checkbox" || type === "radio")) || el.getAttribute("role") === "checkbox" || el.querySelector('input[type="checkbox"], input[type="radio"]');

        if (isCheckboxOrRadio) {
          toggleCheckboxElement(el);
        } else {
          triggerRealClick(el);
        }
      }
      return;
    }

    // 6. Single Field Type (Replace)
    if (action.type === "TYPE" && action.selector) {
      const el = document.querySelector(action.selector);
      if (el) {
        await executeTypeOnElement(el, action.value || "");
        lastActiveField = {
          name: el.name || el.placeholder || el.id,
          selector: action.selector,
          tag: el.tagName.toLowerCase()
        };
      }
      return;
    }

    // 7. Multi-Field Auto-Fill & Full Replacement
    if (action.type === "AUTO_FILL" && action.formData) {
      for (const [k, v] of Object.entries(action.formData)) {
        if (!v) continue;
        const target = document.querySelector(
          `input[name*="${k}" i], input[id*="${k}" i], input[placeholder*="${k}" i], textarea[name*="${k}" i]`
        );
        if (target) {
          await executeTypeOnElement(target, String(v));
          lastActiveField = {
            name: k,
            selector: target.id ? `#${target.id}` : `input[name="${target.name}"]`,
            tag: target.tagName.toLowerCase()
          };
        }
      }
      return;
    }
  }

  // AI Reasoning
  async function processQuery(query) {
    if (!query || !query.trim()) return;
    if (!isTabActiveAndVisible()) return;

    const now = Date.now();
    const cleanQuery = query.trim();

    if (isProcessing || (cleanQuery.toLowerCase() === lastProcessedQuery && now - lastProcessedTime < 2500)) {
      return;
    }

    isProcessing = true;
    lastProcessedQuery = cleanQuery.toLowerCase();
    lastProcessedTime = now;

    stopListening();

    inputEl.value = cleanQuery;
    statusBox.innerText = "⚡ Thinking...";
    const snapshot = getDOMSnapshot(cleanQuery);

    try {
      let activeKey = GROQ_API_KEY;
      if (!activeKey && typeof chrome !== "undefined" && chrome?.storage?.local) {
        try {
          const stored = await chrome.storage.local.get(["GROQ_API_KEY"]);
          if (stored?.GROQ_API_KEY) activeKey = stored.GROQ_API_KEY;
        } catch (_) {}
      }
      if (!activeKey && typeof window !== "undefined" && window.CIPHER_LOCAL_KEY) {
        activeKey = window.CIPHER_LOCAL_KEY;
      }
      if (!activeKey) {
        statusBox.innerText = "⚠️ Please set Groq API Key in Cipher popup";
        return;
      }

      async function requestInference(model, elements) {
        const prompt = `You are Cipher: autonomous Web Navigation & Form Autopilot.
Page: "${snapshot.title}" (${snapshot.url})
Modal Open: ${snapshot.hasActiveModal ? "YES" : "NO"}
Interactive Elements:
${JSON.stringify(elements)}

User Command: "${cleanQuery}"

Return strict JSON object with:
{
  "type": "CLICK" | "TYPE" | "AUTO_FILL" | "SCROLL" | "READ_PAGE" | "LOCATE_ELEMENT" | "UNKNOWN",
  "selector": "<css selector or null>",
  "targetUrl": "<url or null>",
  "label": "<label or null>",
  "value": "<text or null>",
  "formData": null,
  "direction": "UP" | "DOWN" | null,
  "reply": "<short spoken confirmation in user's language>"
}`;

        return fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${activeKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: "You are Cipher AI assistant. Return valid json format." },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          })
        });
      }

      // 1. Primary inference with compact elements (<600 tokens)
      let res = await requestInference(GROQ_MODEL, snapshot.elements);

      // 2. Resilient fallback if 413 (Payload too large) or 429 (Rate limit)
      if (res.status === 413 || res.status === 429) {
        statusBox.innerText = "⚡ Adapting request...";
        const topElements = snapshot.elements.slice(0, 12);
        res = await requestInference("openai/gpt-oss-20b", topElements);
        if (!res.ok) {
          res = await requestInference(GROQ_MODEL, topElements);
        }
      }

      if (res.ok) {
        const data = await res.json();
        const contentStr = data.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(contentStr);
        await executeAction(parsed);

        conversationHistory.push({ role: "user", content: query });
        conversationHistory.push({ role: "assistant", content: parsed.reply || "Done" });
        if (conversationHistory.length > 6) conversationHistory.splice(0, conversationHistory.length - 6);
        
        if (parsed.type !== "READ_PAGE") {
          statusBox.innerText = `✅ ${parsed.reply || "Action Completed"}`;
          if (window.speechSynthesis && parsed.reply) {
            speakText(parsed.reply);
          }
        }
      } else {
        const errText = await res.text();
        console.error("Groq API error:", res.status, errText);
        statusBox.innerText = `⚠️ AI error (${res.status})`;
      }
    } catch (e) {
      console.error("Cipher process error:", e);
      statusBox.innerText = "⚠️ Connection error";
    } finally {
      setTimeout(() => {
        isProcessing = false;
      }, 800);
    }
  }

  function handleManualInputSubmit() {
    const text = inputEl.value.trim();
    if (text) {
      processQuery(text);
    }
  }

  inputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleManualInputSubmit();
    }
  });

  sendBtn?.addEventListener("click", () => {
    handleManualInputSubmit();
  });

  function stopListening() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    if (recognition && isListening) {
      try {
        recognition.abort();
      } catch (e) {}
    }
    isListening = false;
    micBtn.classList.remove("rec");
    micBtn.innerText = "🎙️ Speak";
  }

  if (recognition) {
    recognition.onresult = (e) => {
      if (!isTabActiveAndVisible() || isProcessing || isSpeaking) {
        stopListening();
        return;
      }

      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < e.results.length; i++) {
        const item = e.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript + " ";
        } else {
          interimTranscript += item[0].transcript + " ";
        }
      }

      currentTranscript = (finalTranscript || interimTranscript).trim();
      if (currentTranscript) {
        inputEl.value = currentTranscript;
      }

      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        const queryToProcess = currentTranscript;
        stopListening();
        if (queryToProcess && !isProcessing && !isSpeaking && isTabActiveAndVisible()) {
          processQuery(queryToProcess);
        }
      }, 950);
    };

    recognition.onerror = (e) => {
      stopListening();
      statusBox.innerText = "Ready";
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove("rec");
      micBtn.innerText = "🎙️ Speak";
    };
  }

  micBtn?.addEventListener("click", () => {
    if (!recognition) {
      alert("Web Speech API not supported in this browser.");
      return;
    }

    if (isListening) {
      stopListening();
      statusBox.innerText = "Ready";
    } else {
      if (isSpeaking && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        readBtn.innerText = "🔊 Read";
      }

      isListening = true;
      currentTranscript = "";
      micBtn.classList.add("rec");
      micBtn.innerText = "⏹️ Stop";
      statusBox.innerText = "🎙️ Listening...";
      inputEl.placeholder = "Speak now...";
      try {
        recognition.start();
      } catch (e) {}
    }
  });

  readBtn?.addEventListener("click", () => {
    if (isSpeaking) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      isSpeaking = false;
      readBtn.innerText = "🔊 Read";
      statusBox.innerText = "Ready";
    } else {
      const content = getReadablePageContent();
      inputEl.value = "🔊 Reading page content...";
      speakText(content);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopListening();
      if (window.speechSynthesis && isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        readBtn.innerText = "🔊 Read";
      }
    }
  });

  window.addEventListener("blur", () => {
    if (isListening) {
      stopListening();
    }
  });

  // Close / Hide button handler on the floating bar
  document.getElementById("vdom-btn-close")?.addEventListener("click", () => {
    setExtensionEnabled(false);
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      chrome.storage.local.set({ CIPHER_ENABLED: false });
    }
  });

  // Extension ON / OFF State Machine
  let isExtensionEnabled = true;

  function setExtensionEnabled(enabled) {
    isExtensionEnabled = Boolean(enabled);
    const bar = document.getElementById("voicedom-ext-bar");
    if (bar) {
      bar.style.display = isExtensionEnabled ? "flex" : "none";
    }
    if (!isExtensionEnabled) {
      stopListening();
      if (window.speechSynthesis && isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        if (readBtn) readBtn.innerText = "🔊 Read";
      }
      if (activeHighlightPin) {
        activeHighlightPin.remove();
        activeHighlightPin = null;
      }
    } else {
      if (statusBox) statusBox.innerText = "Ready";
    }
  }

  // Load initial ON / OFF state from chrome.storage
  if (typeof chrome !== "undefined" && chrome?.storage?.local) {
    chrome.storage.local.get(["CIPHER_ENABLED"], (res) => {
      if (res && res.CIPHER_ENABLED === false) {
        setExtensionEnabled(false);
      }
    });
  }

  // Listen for toggle / activate commands from the Extension popup
  if (typeof chrome !== "undefined" && chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === "TOGGLE_EXTENSION") {
        setExtensionEnabled(msg.enabled);
        sendResponse({ success: true, enabled: isExtensionEnabled });
      } else if (msg.action === "ACTIVATE_VOICEDOM") {
        setExtensionEnabled(true);
        if (inputEl) inputEl.focus();
        sendResponse({ success: true, enabled: true });
      } else if (msg.action === "GET_STATUS") {
        sendResponse({ enabled: isExtensionEnabled });
      }
      return true;
    });
  }

  function handleUrlOrDomChange() {
    getDOMSnapshot();
  }

  window.addEventListener("popstate", handleUrlOrDomChange);
  window.addEventListener("hashchange", handleUrlOrDomChange);

  const origPushState = history.pushState;
  history.pushState = function() {
    origPushState.apply(this, arguments);
    handleUrlOrDomChange();
  };

  const origReplaceState = history.replaceState;
  history.replaceState = function() {
    origReplaceState.apply(this, arguments);
    handleUrlOrDomChange();
  };

  console.log("Cipher (Cipher_Jarvis) Universal AI Injected with Clean Field Overwrite & Replace Support.");
})();
