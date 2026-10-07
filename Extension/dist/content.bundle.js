"use strict";
(() => {
  // src/content/element-discovery.ts
  var ElementDiscovery = class {
    elementMap = /* @__PURE__ */ new Map();
    nextId = 1;
    reset() {
      this.elementMap.clear();
      this.nextId = 1;
    }
    getElementById(id) {
      return this.elementMap.get(id);
    }
    /**
     * Checks whether an element is truly visible and interactable.
     */
    isVisible(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
      if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) < 0.05) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (rect.bottom < 0 || rect.right < 0) return false;
      return true;
    }
    /**
     * Determines the semantic type of an element.
     */
    getElementType(el) {
      const tagName = el.tagName.toLowerCase();
      const role = el.getAttribute("role")?.toLowerCase();
      if (tagName === "button" || role === "button") return "button";
      if (tagName === "a" || role === "link") return "link";
      if (tagName === "select") return "select";
      if (tagName === "textarea") return "textarea";
      if (tagName === "input") {
        const type = el.type.toLowerCase();
        if (type === "checkbox") return "checkbox";
        if (type === "radio") return "radio";
        if (type === "search") return "search";
        if (type === "submit" || type === "button") return "button";
        return "input";
      }
      if (role === "tab") return "tab";
      if (role === "menuitem") return "menuitem";
      if (role === "checkbox") return "checkbox";
      if (role === "radio") return "radio";
      if (/^h[1-6]$/.test(tagName) || role === "heading") return "heading";
      if (el.getAttribute("contenteditable") === "true") return "textarea";
      return "generic";
    }
    /**
     * Extracts clean accessible text representation of an element.
     */
    getElementText(el) {
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
      const ariaLabelledBy = el.getAttribute("aria-labelledby");
      if (ariaLabelledBy) {
        const labelEl = document.getElementById(ariaLabelledBy);
        if (labelEl && labelEl.textContent?.trim()) {
          return labelEl.textContent.trim();
        }
      }
      const title = el.getAttribute("title");
      if (title && title.trim()) return title.trim();
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.placeholder && el.placeholder.trim()) return el.placeholder.trim();
        if (el.value && el.value.trim() && el.type !== "password") return el.value.trim();
      }
      const imgAlt = el.querySelector("img")?.getAttribute("alt");
      if (imgAlt && imgAlt.trim()) return imgAlt.trim();
      const text = el.innerText || el.textContent || "";
      return text.replace(/\s+/g, " ").trim();
    }
    /**
     * Scans the document and discovers all relevant interactive semantic elements.
     */
    discoverInteractiveElements() {
      this.reset();
      const selectors = [
        "button",
        "a[href]",
        "input:not([type='hidden'])",
        "textarea",
        "select",
        "[role='button']",
        "[role='link']",
        "[role='tab']",
        "[role='menuitem']",
        "[role='checkbox']",
        "[role='radio']",
        "[contenteditable='true']",
        "summary",
        "[tabindex]:not([tabindex='-1'])"
      ].join(", ");
      const rawNodes = document.querySelectorAll(selectors);
      const discovered = [];
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      rawNodes.forEach((node) => {
        if (node.closest("#voxnav-root") || node.id?.startsWith("voxnav")) {
          return;
        }
        if (!this.isVisible(node)) return;
        const rect = node.getBoundingClientRect();
        const inViewport = rect.top < viewportHeight && rect.bottom > 0 && rect.left < viewportWidth && rect.right > 0;
        const type = this.getElementType(node);
        const text = this.getElementText(node);
        const ariaLabel = node.getAttribute("aria-label") || void 0;
        const placeholder = node.placeholder || void 0;
        const title = node.getAttribute("title") || void 0;
        const role = node.getAttribute("role") || void 0;
        const name = node.name || void 0;
        const href = node.href || void 0;
        if (!text && !ariaLabel && !title && !placeholder && type !== "input" && type !== "select") {
          return;
        }
        const id = this.nextId++;
        this.elementMap.set(id, node);
        let context;
        const parentForm = node.closest("form");
        if (parentForm) {
          const legend = parentForm.querySelector("legend, h2, h3");
          if (legend?.textContent) context = legend.textContent.trim().slice(0, 40);
        }
        discovered.push({
          id,
          type,
          text,
          ariaLabel,
          placeholder,
          title,
          role,
          name,
          href,
          disabled: node.disabled || false,
          visible: true,
          inViewport,
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          },
          context
        });
      });
      return discovered;
    }
  };

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
    theme: "auto"
  };
  var ALLOWED_INTENTS = /* @__PURE__ */ new Set([
    "BACK",
    "FORWARD",
    "REFRESH",
    "HOME",
    "OPEN_LINK",
    "SCROLL_UP",
    "SCROLL_DOWN",
    "SCROLL_TOP",
    "SCROLL_BOTTOM",
    "PAGE_DOWN",
    "PAGE_UP",
    "CLICK",
    "DOUBLE_CLICK",
    "FOCUS",
    "HOVER",
    "SELECT",
    "TYPE",
    "CLEAR",
    "SUBMIT",
    "CHECK",
    "UNCHECK",
    "SEARCH",
    "FIND_ON_PAGE",
    "READ_PAGE",
    "READ_SECTION",
    "DESCRIBE_PAGE",
    "SHOW_NUMBERS",
    "HIDE_NUMBERS",
    "CLICK_NUMBER",
    "NEW_TAB",
    "CLOSE_TAB",
    "NEXT_TAB",
    "PREVIOUS_TAB",
    "START_DEMO",
    "HELP",
    "CANCEL",
    "CONFIRM"
  ]);
  var HIGH_IMPACT_KEYWORDS = [
    "delete",
    "remove",
    "destroy",
    "purge",
    "format",
    "pay",
    "checkout",
    "purchase",
    "buy now",
    "place order",
    "transfer",
    "send money",
    "wire",
    "reset password",
    "terminate",
    "cancel subscription",
    "unsubscribe",
    "logout",
    "log out"
  ];
  var SYNONYM_MAP = {
    login: ["sign in", "log in", "enter", "signin", "authenticate", "portal", "\u0932\u0949\u0917\u093F\u0928", "\u09B2\u0997\u0987\u09A8"],
    signup: ["sign up", "register", "join", "create account", "get started", "start free", "\u0930\u091C\u093F\u0938\u094D\u091F\u0930", "\u09B0\u09C7\u099C\u09BF\u09B8\u09CD\u099F\u09BE\u09B0"],
    search: ["find", "lookup", "explore", "query", "\u0916\u094B\u091C", "\u0985\u09A8\u09C1\u09B8\u09A8\u09CD\u09A7\u09BE\u09A8"],
    cart: ["basket", "bag", "checkout", "shopping cart", "\u099F\u09CB\u09B2\u09BF", "\u099D\u09C1\u09A1\u09BC\u09BF"],
    pricing: ["plans", "cost", "rates", "subscription", "price", "\u09A6\u09BE\u09AE", "\u09AE\u09C2\u09B2\u09CD\u09AF"],
    contact: ["contact us", "reach out", "support", "help", "\u0938\u0902\u092A\u0930\u094D\u0915", "\u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997"],
    home: ["homepage", "main", "start", "landing", "\u0939\u094B\u092E", "\u09B9\u09CB\u09AE"],
    docs: ["documentation", "guide", "manual", "api", "reference"],
    settings: ["preferences", "configuration", "account", "profile"],
    submit: ["send", "save", "apply", "confirm", "proceed", "next", "\u091C\u093E\u0930\u0940 \u0930\u0916\u0947\u0902", "\u099C\u09AE\u09BE \u09A6\u09BF\u09A8"]
  };
  var INDIC_NUMBER_MAP = {
    // Bengali numerals & words
    "\u09E6": 0,
    "\u09E7": 1,
    "\u09E8": 2,
    "\u09E9": 3,
    "\u09EA": 4,
    "\u09EB": 5,
    "\u09EC": 6,
    "\u09ED": 7,
    "\u09EE": 8,
    "\u09EF": 9,
    "\u098F\u0995": 1,
    "\u09A6\u09C1\u0987": 2,
    "\u09A4\u09BF\u09A8": 3,
    "\u099A\u09BE\u09B0": 4,
    "\u09AA\u09BE\u0981\u099A": 5,
    "\u099B\u09AF\u09BC": 6,
    "\u09B8\u09BE\u09A4": 7,
    "\u0986\u099F": 8,
    "\u09A8\u09AF\u09BC": 9,
    "\u09A6\u09B6": 10,
    // Devanagari numerals & Hindi words
    "\u0966": 0,
    "\u0967": 1,
    "\u0968": 2,
    "\u0969": 3,
    "\u096A": 4,
    "\u096B": 5,
    "\u096C": 6,
    "\u096D": 7,
    "\u096E": 8,
    "\u096F": 9,
    "\u090F\u0915": 1,
    "\u0926\u094B": 2,
    "\u0924\u0940\u0928": 3,
    "\u091A\u093E\u0930": 4,
    "\u092A\u093E\u0902\u091A": 5,
    "\u092A\u093E\u0901\u091A": 5,
    "\u091B\u0939": 6,
    "\u0938\u093E\u0924": 7,
    "\u0906\u0920": 8,
    "\u0928\u094C": 9,
    "\u0926\u0938": 10,
    // English words
    "first": 1,
    "second": 2,
    "third": 3,
    "fourth": 4,
    "fifth": 5,
    "sixth": 6,
    "seventh": 7,
    "eighth": 8,
    "ninth": 9,
    "tenth": 10,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10
  };

  // src/shared/utils.ts
  function normalizeText(text) {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s\u0980-\u09FF\u0900-\u097F]/g, " ").replace(/\s+/g, " ").trim();
  }
  function levenshteinDistance(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          // deletion
          dp[i][j - 1] + 1,
          // insertion
          dp[i - 1][j - 1] + cost
          // substitution
        );
      }
    }
    return dp[m][n];
  }
  function stringSimilarity(str1, str2) {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);
    if (s1 === s2) return 1;
    if (!s1 || !s2) return 0;
    if (s1.includes(s2) || s2.includes(s1)) {
      const minLen = Math.min(s1.length, s2.length);
      const maxLen2 = Math.max(s1.length, s2.length);
      return 0.8 + 0.2 * (minLen / maxLen2);
    }
    const tokens1 = new Set(s1.split(" "));
    const tokens2 = new Set(s2.split(" "));
    let intersection = 0;
    for (const t of tokens1) {
      if (tokens2.has(t)) intersection++;
    }
    const union = (/* @__PURE__ */ new Set([...tokens1, ...tokens2])).size;
    const jaccard = union > 0 ? intersection / union : 0;
    const maxLen = Math.max(s1.length, s2.length);
    const dist = levenshteinDistance(s1, s2);
    const levScore = 1 - dist / maxLen;
    return Math.max(jaccard, levScore);
  }
  function extractNumberFromText(text) {
    const normalized = normalizeText(text);
    const digitMatch = normalized.match(/\b\d+\b/);
    if (digitMatch) {
      return parseInt(digitMatch[0], 10);
    }
    const words = normalized.split(/\s+/);
    for (const w of words) {
      if (INDIC_NUMBER_MAP[w] !== void 0) {
        return INDIC_NUMBER_MAP[w];
      }
    }
    for (const ch of normalized) {
      if (INDIC_NUMBER_MAP[ch] !== void 0) {
        return INDIC_NUMBER_MAP[ch];
      }
    }
    return null;
  }
  function debounce(fn, delayMs) {
    let timer = null;
    return ((...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delayMs);
    });
  }
  function throttle(fn, limitMs) {
    let lastCall = 0;
    return ((...args) => {
      const now = Date.now();
      if (now - lastCall >= limitMs) {
        lastCall = now;
        fn(...args);
      }
    });
  }

  // src/content/page-analyzer.ts
  var PageAnalyzer = class {
    discovery;
    cachedElements = [];
    observer = null;
    onMutationCallback;
    constructor(discovery) {
      this.discovery = discovery;
      this.setupMutationObserver();
    }
    setupMutationObserver() {
      const debouncedRefresh = debounce(() => {
        this.refresh();
        if (this.onMutationCallback) {
          this.onMutationCallback();
        }
      }, 400);
      this.observer = new MutationObserver((mutations) => {
        let relevantChange = false;
        for (const m of mutations) {
          if (m.target?.id?.startsWith("voxnav")) continue;
          if (m.type === "childList" || m.type === "attributes") {
            relevantChange = true;
            break;
          }
        }
        if (relevantChange) {
          debouncedRefresh();
        }
      });
      if (typeof document !== "undefined" && document.body) {
        this.observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class", "style", "hidden", "aria-hidden", "disabled"]
        });
      }
    }
    setOnMutationCallback(cb) {
      this.onMutationCallback = cb;
    }
    refresh() {
      this.cachedElements = this.discovery.discoverInteractiveElements();
      return this.cachedElements;
    }
    getElements() {
      if (this.cachedElements.length === 0) {
        return this.refresh();
      }
      return this.cachedElements;
    }
    /**
     * Compact semantic snapshot suitable for local rules or AI models.
     */
    getCompactRepresentation(maxItems = 40) {
      const elements = this.getElements();
      const sorted = [...elements].sort((a, b) => {
        if (a.inViewport && !b.inViewport) return -1;
        if (!a.inViewport && b.inViewport) return 1;
        return 0;
      });
      return sorted.slice(0, maxItems).map((el) => ({
        id: el.id,
        type: el.type,
        text: el.text.slice(0, 50),
        ariaLabel: el.ariaLabel?.slice(0, 50),
        placeholder: el.placeholder?.slice(0, 50),
        visible: el.visible,
        inViewport: el.inViewport
      }));
    }
    /**
     * Resolves target matches with synonym support, fuzzy scoring, and ordinal prioritization.
     */
    findMatchingElements(targetText, targetType, minScoreThreshold = 0.55) {
      const elements = this.getElements();
      const query = normalizeText(targetText);
      const candidates = [];
      const synonyms = /* @__PURE__ */ new Set([query]);
      for (const [key, list] of Object.entries(SYNONYM_MAP)) {
        if (key === query || list.some((syn) => syn.includes(query) || query.includes(syn))) {
          synonyms.add(key);
          list.forEach((s) => synonyms.add(normalizeText(s)));
        }
      }
      elements.forEach((el) => {
        if (targetType) {
          const typeNorm = targetType.toLowerCase();
          if (typeNorm === "button" && el.type !== "button") return;
          if (typeNorm === "link" && el.type !== "link") return;
          if (typeNorm === "input" && el.type !== "input" && el.type !== "textarea") return;
        }
        let bestScore = 0;
        const elementTexts = [
          el.text,
          el.ariaLabel || "",
          el.title || "",
          el.placeholder || "",
          el.name || ""
        ].filter(Boolean);
        for (const textSample of elementTexts) {
          for (const syn of synonyms) {
            const score = stringSimilarity(syn, textSample);
            if (score > bestScore) {
              bestScore = score;
            }
          }
        }
        if (el.inViewport && bestScore >= minScoreThreshold) {
          bestScore = Math.min(1, bestScore + 0.1);
        }
        if (bestScore >= minScoreThreshold) {
          candidates.push({ element: el, score: bestScore });
        }
      });
      return candidates.sort((a, b) => b.score - a.score);
    }
    /**
     * Finds the primary search box on the current page.
     */
    findPrimarySearchInput() {
      const elements = this.getElements();
      const searchType = elements.find((el) => el.type === "search" && el.visible);
      if (searchType) return searchType;
      const searchMatch = elements.find((el) => {
        if (el.type !== "input" && el.type !== "textarea") return false;
        const t = normalizeText(`${el.placeholder || ""} ${el.name || ""} ${el.ariaLabel || ""}`);
        return t.includes("search") || t.includes("find") || t.includes("query") || t.includes("khoj");
      });
      if (searchMatch) return searchMatch;
      return null;
    }
    /**
     * Summarizes page for reading accessibility.
     */
    getPageSummary() {
      const elements = this.getElements();
      const headings = document.querySelectorAll("h1, h2, h3");
      return {
        url: window.location.href,
        title: document.title || "Untitled Page",
        buttonCount: elements.filter((e) => e.type === "button").length,
        linkCount: elements.filter((e) => e.type === "link").length,
        inputCount: elements.filter((e) => e.type === "input" || e.type === "textarea").length,
        headingCount: headings.length,
        isVoiceActive: false,
        numberedModeActive: false
      };
    }
    /**
     * Extracts text outline for "read this page" voice feedback.
     */
    getSpokenPageOutline() {
      const title = document.title || "this page";
      const h1 = document.querySelector("h1")?.textContent?.trim();
      const elements = this.getElements();
      const buttons = elements.filter((e) => e.type === "button" && e.inViewport);
      let outline = `You are on ${title}. `;
      if (h1) outline += `Main heading is: ${h1}. `;
      if (buttons.length > 0) {
        const topActions = buttons.slice(0, 3).map((b) => b.text).filter(Boolean).join(", ");
        if (topActions) {
          outline += `Main interactive actions include: ${topActions}. `;
        }
      }
      outline += "You can say 'show numbers' to see all clickable elements or speak any command.";
      return outline;
    }
  };

  // src/content/element-labeler.ts
  var ElementLabeler = class {
    discovery;
    container = null;
    isVisible = false;
    labelMap = /* @__PURE__ */ new Map();
    onScrollOrResize;
    constructor(discovery) {
      this.discovery = discovery;
      this.onScrollOrResize = throttle(() => {
        if (this.isVisible) {
          this.updatePositions();
        }
      }, 100);
      window.addEventListener("scroll", this.onScrollOrResize, { passive: true });
      window.addEventListener("resize", this.onScrollOrResize, { passive: true });
    }
    ensureContainer() {
      if (!this.container) {
        this.container = document.createElement("div");
        this.container.id = "voxnav-labels-container";
        this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147483646;
        display: none;
      `;
        document.documentElement.appendChild(this.container);
      }
      return this.container;
    }
    show(elements) {
      const container = this.ensureContainer();
      container.innerHTML = "";
      this.labelMap.clear();
      let displayIndex = 1;
      elements.forEach((el) => {
        const domEl = this.discovery.getElementById(el.id);
        if (!domEl || !this.discovery.isVisible(domEl)) return;
        const rect = domEl.getBoundingClientRect();
        if (rect.top >= window.innerHeight || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.right <= 0) {
          return;
        }
        const badgeNum = displayIndex++;
        this.labelMap.set(badgeNum, el);
        const badge = document.createElement("div");
        badge.className = "voxnav-badge";
        badge.dataset.voxnavNumber = String(badgeNum);
        badge.textContent = String(badgeNum);
        badge.style.cssText = `
        position: absolute;
        top: ${Math.max(2, rect.top - 8)}px;
        left: ${Math.max(2, rect.left - 4)}px;
        background: #2563EB;
        color: #FFFFFF;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        padding: 2px 5px;
        border-radius: 4px;
        border: 1px solid #1D4ED8;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
        transform: translateZ(0);
        transition: transform 0.15s ease, background 0.15s ease;
      `;
        container.appendChild(badge);
      });
      container.style.display = "block";
      this.isVisible = true;
    }
    updatePositions() {
      if (!this.container || !this.isVisible) return;
      const badges = this.container.querySelectorAll(".voxnav-badge");
      badges.forEach((badge) => {
        const num = parseInt(badge.dataset.voxnavNumber || "0", 10);
        const el = this.labelMap.get(num);
        if (!el) return;
        const domEl = this.discovery.getElementById(el.id);
        if (!domEl || !this.discovery.isVisible(domEl)) {
          badge.style.display = "none";
          return;
        }
        const rect = domEl.getBoundingClientRect();
        if (rect.top >= window.innerHeight || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.right <= 0) {
          badge.style.display = "none";
        } else {
          badge.style.display = "block";
          badge.style.top = `${Math.max(2, rect.top - 8)}px`;
          badge.style.left = `${Math.max(2, rect.left - 4)}px`;
        }
      });
    }
    hide() {
      if (this.container) {
        this.container.style.display = "none";
        this.container.innerHTML = "";
      }
      this.labelMap.clear();
      this.isVisible = false;
    }
    toggle(elements) {
      if (this.isVisible) {
        this.hide();
        return false;
      } else {
        this.show(elements);
        return true;
      }
    }
    getElementByNumber(number) {
      return this.labelMap.get(number);
    }
    getIsVisible() {
      return this.isVisible;
    }
    highlightBadge(number) {
      if (!this.container) return;
      const badge = this.container.querySelector(`[data-voxnav-number="${number}"]`);
      if (badge) {
        badge.style.background = "#16A34A";
        badge.style.transform = "scale(1.3)";
        setTimeout(() => {
          badge.style.background = "#2563EB";
          badge.style.transform = "scale(1)";
        }, 800);
      }
    }
  };

  // src/shared/safety.ts
  var ActionValidator = class {
    /**
     * Validates whether an intent is within the secure whitelist.
     */
    static isAllowedIntent(intent) {
      return ALLOWED_INTENTS.has(intent);
    }
    /**
     * Detects whether an action involves sensitive/irreversible operations.
     */
    static isHighImpactAction(action, targetText) {
      if (action.highImpact) return true;
      const checkText = `${action.description} ${targetText || ""} ${action.value || ""}`.toLowerCase();
      for (const keyword of HIGH_IMPACT_KEYWORDS) {
        if (checkText.includes(keyword)) {
          return true;
        }
      }
      if (action.type === "SUBMIT") {
        if (checkText.includes("pay") || checkText.includes("card") || checkText.includes("delete") || checkText.includes("order")) {
          return true;
        }
      }
      return false;
    }
    /**
     * Sanitizes text to prevent injection or unexpected control sequences.
     */
    static sanitizeInput(input) {
      return input.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
    }
    /**
     * Validates each step in an AI action plan before execution.
     */
    static validateActionPlan(actions) {
      if (!Array.isArray(actions)) {
        return { valid: false, error: "Action plan must be an array of steps." };
      }
      if (actions.length > 5) {
        return { valid: false, error: "Exceeded maximum allowed steps per command (5)." };
      }
      for (const action of actions) {
        if (!this.isAllowedIntent(action.type)) {
          return { valid: false, error: `Unauthorized action type: ${action.type}` };
        }
        if (action.type === "TYPE" && typeof action.value !== "string") {
          return { valid: false, error: "TYPE action requires a string value." };
        }
      }
      return { valid: true };
    }
  };

  // src/content/action-engine.ts
  var ActionEngine = class {
    discovery;
    constructor(discovery) {
      this.discovery = discovery;
    }
    /**
     * Highlights target element on page with an animated focus halo.
     */
    highlightElement(el, color = "#2563EB", durationMs = 1200) {
      const originalOutline = el.style.outline;
      const originalTransition = el.style.transition;
      const originalBoxShadow = el.style.boxShadow;
      el.style.transition = "all 0.25s ease-in-out";
      el.style.outline = `3px solid ${color}`;
      el.style.boxShadow = `0 0 16px ${color}88`;
      setTimeout(() => {
        el.style.outline = originalOutline;
        el.style.boxShadow = originalBoxShadow;
        el.style.transition = originalTransition;
      }, durationMs);
    }
    /**
     * Dispatches full mouse & pointer sequence to ensure click events register in modern frameworks.
     */
    clickElement(el) {
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      this.highlightElement(el, "#16A34A");
      try {
        el.focus();
      } catch (e) {
      }
      const mouseEvents = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
      mouseEvents.forEach((type) => {
        const evt = new MouseEvent(type, {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1
        });
        el.dispatchEvent(evt);
      });
      if (el instanceof HTMLAnchorElement && el.href) {
        if (el.target === "_blank") {
          window.open(el.href, "_blank");
        } else if (!el.href.startsWith("javascript:")) {
          window.location.href = el.href;
        }
      }
      return true;
    }
    doubleClickElement(el) {
      if (!el) return false;
      this.clickElement(el);
      const evt = new MouseEvent("dblclick", { view: window, bubbles: true, cancelable: true });
      el.dispatchEvent(evt);
      return true;
    }
    hoverElement(el) {
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      this.highlightElement(el, "#F59E0B");
      const events = ["pointerenter", "mouseenter", "pointerover", "mouseover"];
      events.forEach((type) => {
        el.dispatchEvent(new MouseEvent(type, { view: window, bubbles: true, cancelable: true }));
      });
      return true;
    }
    /**
     * Types text into input/textarea, compatible with React/Vue synthetic event models.
     */
    typeIntoElement(el, textToType, append = false) {
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      this.highlightElement(el, "#2563EB");
      el.focus();
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const currentValue = append ? el.value : "";
        const newValue = currentValue + textToType;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value"
        )?.set;
        if (el instanceof HTMLInputElement && nativeInputValueSetter) {
          nativeInputValueSetter.call(el, newValue);
        } else if (el instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(el, newValue);
        } else {
          el.value = newValue;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      } else if (el.isContentEditable) {
        if (!append) el.innerText = "";
        el.innerText += textToType;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
      return false;
    }
    clearElement(el) {
      if (!el) return false;
      return this.typeIntoElement(el, "", false);
    }
    selectOption(el, optionTextOrValue) {
      if (!(el instanceof HTMLSelectElement)) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      this.highlightElement(el);
      const query = optionTextOrValue.toLowerCase();
      let matchedOption = null;
      for (let i = 0; i < el.options.length; i++) {
        const opt = el.options[i];
        if (opt.text.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query)) {
          matchedOption = opt;
          break;
        }
      }
      if (matchedOption) {
        el.value = matchedOption.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      return false;
    }
    setCheckbox(el, checked) {
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        this.highlightElement(el);
        el.checked = checked;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      return false;
    }
    submitForm(el) {
      const form = el instanceof HTMLFormElement ? el : el?.closest("form") || document.querySelector("form");
      if (form) {
        this.highlightElement(form, "#16A34A");
        const submitBtn = form.querySelector("button[type='submit'], input[type='submit']");
        if (submitBtn) {
          return this.clickElement(submitBtn);
        } else {
          form.requestSubmit();
          return true;
        }
      }
      return false;
    }
    scroll(direction, amount = "MEDIUM") {
      let delta = 450;
      if (amount === "SMALL") delta = 200;
      if (amount === "LARGE") delta = window.innerHeight * 0.85;
      switch (direction) {
        case "DOWN":
          window.scrollBy({ top: delta, behavior: "smooth" });
          return true;
        case "UP":
          window.scrollBy({ top: -delta, behavior: "smooth" });
          return true;
        case "TOP":
          window.scrollTo({ top: 0, behavior: "smooth" });
          return true;
        case "BOTTOM":
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
          return true;
      }
    }
    /**
     * Executes a single ActionStep safely.
     */
    executeStep(step) {
      if (!ActionValidator.isAllowedIntent(step.type)) {
        console.warn("[VoxNav Safety] Blocked unallowed action:", step.type);
        return false;
      }
      let targetEl;
      if (step.targetId) {
        targetEl = this.discovery.getElementById(step.targetId);
      } else if (step.targetSelector) {
        targetEl = document.querySelector(step.targetSelector) || void 0;
      }
      switch (step.type) {
        case "CLICK":
          return targetEl ? this.clickElement(targetEl) : false;
        case "DOUBLE_CLICK":
          return targetEl ? this.doubleClickElement(targetEl) : false;
        case "FOCUS":
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
            targetEl.focus();
            this.highlightElement(targetEl);
            return true;
          }
          return false;
        case "HOVER":
          return targetEl ? this.hoverElement(targetEl) : false;
        case "TYPE":
          return targetEl ? this.typeIntoElement(targetEl, step.value || "") : false;
        case "CLEAR":
          return targetEl ? this.clearElement(targetEl) : false;
        case "SUBMIT":
          return this.submitForm(targetEl);
        case "CHECK":
          return targetEl ? this.setCheckbox(targetEl, true) : false;
        case "UNCHECK":
          return targetEl ? this.setCheckbox(targetEl, false) : false;
        case "SELECT":
          return targetEl ? this.selectOption(targetEl, step.value || "") : false;
        case "SCROLL_DOWN":
          return this.scroll("DOWN", "MEDIUM");
        case "SCROLL_UP":
          return this.scroll("UP", "MEDIUM");
        case "SCROLL_TOP":
          return this.scroll("TOP");
        case "SCROLL_BOTTOM":
          return this.scroll("BOTTOM");
        case "PAGE_DOWN":
          return this.scroll("DOWN", "LARGE");
        case "PAGE_UP":
          return this.scroll("UP", "LARGE");
        case "BACK":
          window.history.back();
          return true;
        case "FORWARD":
          window.history.forward();
          return true;
        case "REFRESH":
          window.location.reload();
          return true;
        case "HOME":
          window.location.href = window.location.origin;
          return true;
        default:
          return false;
      }
    }
  };

  // src/content/overlay.ts
  var FloatingOverlay = class {
    host = null;
    shadow = null;
    callbacks;
    isVisible = false;
    isNumbersActive = false;
    // DOM Elements inside Shadow
    micButton = null;
    statusBadge = null;
    transcriptText = null;
    commandInput = null;
    numberButton = null;
    containerEl = null;
    constructor(callbacks) {
      this.callbacks = callbacks;
    }
    init() {
      if (this.host) return;
      this.host = document.createElement("div");
      this.host.id = "voxnav-root";
      this.host.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      pointer-events: none;
    `;
      this.shadow = this.host.attachShadow({ mode: "open" });
      this.render();
      document.documentElement.appendChild(this.host);
      this.setupEvents();
      this.setupDraggable();
      this.isVisible = true;
    }
    render() {
      if (!this.shadow) return;
      const style = document.createElement("style");
      style.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      .voxnav-container {
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        padding: 12px 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
        color: #F8FAFC;
        min-width: 320px;
        max-width: 440px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
      }

      .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: grab;
      }

      .header-row:active {
        cursor: grabbing;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: -0.2px;
        color: #FFFFFF;
      }

      .brand-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #2563EB;
      }

      .status-pill {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.1);
        color: #94A3B8;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;
      }

      .status-pill.listening {
        background: rgba(239, 68, 68, 0.2);
        color: #F87171;
        border: 1px solid rgba(239, 68, 68, 0.4);
      }

      .status-pill.understanding {
        background: rgba(37, 99, 235, 0.2);
        color: #60A5FA;
        border: 1px solid rgba(37, 99, 235, 0.4);
      }

      .status-pill.done {
        background: rgba(22, 163, 74, 0.2);
        color: #4ADE80;
        border: 1px solid rgba(22, 163, 74, 0.4);
      }

      .status-pill.ambiguous {
        background: rgba(245, 158, 11, 0.2);
        color: #FBBF24;
        border: 1px solid rgba(245, 158, 11, 0.4);
      }

      .controls-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
      }

      .mic-btn {
        background: #2563EB;
        color: #FFFFFF;
        border: none;
        border-radius: 10px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .mic-btn:hover {
        background: #1D4ED8;
      }

      .mic-btn.active {
        background: #DC2626;
        box-shadow: 0 0 14px rgba(220, 38, 38, 0.6);
        animation: pulse 1.5s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.85; }
      }

      .command-form {
        display: flex;
        flex: 1;
        gap: 4px;
      }

      .command-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        padding: 7px 10px;
        color: #FFFFFF;
        font-size: 12px;
        outline: none;
        transition: border-color 0.2s;
      }

      .command-input::placeholder {
        color: #64748B;
      }

      .command-input:focus {
        border-color: #2563EB;
        background: rgba(255, 255, 255, 0.12);
      }

      .action-btn {
        background: rgba(255, 255, 255, 0.08);
        color: #94A3B8;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .action-btn:hover {
        background: rgba(255, 255, 255, 0.16);
        color: #FFFFFF;
      }

      .action-btn.active {
        background: #2563EB;
        color: #FFFFFF;
        border-color: #3B82F6;
      }

      .transcript-box {
        margin-top: 8px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12px;
        color: #CBD5E1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 28px;
        word-break: break-word;
      }

      .transcript-text {
        font-style: italic;
        color: #93C5FD;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: #64748B;
        font-size: 14px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .close-btn:hover {
        color: #EF4444;
      }
    `;
      this.shadow.appendChild(style);
      const container = document.createElement("div");
      container.className = "voxnav-container";
      container.innerHTML = `
      <div class="header-row">
        <div class="brand">
          <div class="brand-dot"></div>
          <span>VoxNav</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="status-pill" id="voxnav-status">\u25CF Ready</span>
          <button class="action-btn" id="voxnav-num-toggle" title="Toggle Numbered Navigation">123</button>
          <button class="close-btn" id="voxnav-close" title="Minimize">\u2715</button>
        </div>
      </div>

      <div class="controls-row">
        <button class="mic-btn" id="voxnav-mic">
          <span>\u{1F399}\uFE0F</span>
          <span id="voxnav-mic-text">Speak</span>
        </button>
        <form class="command-form" id="voxnav-form">
          <input type="text" class="command-input" id="voxnav-input" placeholder="Say or type command (e.g. 'Click login')" autocomplete="off" />
        </form>
      </div>

      <div class="transcript-box" id="voxnav-transcript-box" style="display: none;">
        <span class="transcript-text" id="voxnav-transcript">""</span>
      </div>
    `;
      this.shadow.appendChild(container);
      this.containerEl = container;
      this.micButton = this.shadow.getElementById("voxnav-mic");
      this.statusBadge = this.shadow.getElementById("voxnav-status");
      this.transcriptText = this.shadow.getElementById("voxnav-transcript");
      this.commandInput = this.shadow.getElementById("voxnav-input");
      this.numberButton = this.shadow.getElementById("voxnav-num-toggle");
    }
    setupEvents() {
      if (!this.shadow) return;
      this.micButton?.addEventListener("click", () => {
        this.callbacks.onToggleMic();
      });
      this.numberButton?.addEventListener("click", () => {
        this.isNumbersActive = !this.isNumbersActive;
        this.numberButton?.classList.toggle("active", this.isNumbersActive);
        this.callbacks.onToggleNumbers();
      });
      const form = this.shadow.getElementById("voxnav-form");
      form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const val = this.commandInput?.value.trim();
        if (val) {
          this.callbacks.onSubmitTextCommand(val);
          if (this.commandInput) this.commandInput.value = "";
        }
      });
      const closeBtn = this.shadow.getElementById("voxnav-close");
      closeBtn?.addEventListener("click", () => {
        this.hide();
        this.callbacks.onClose();
      });
    }
    setupDraggable() {
      if (!this.containerEl || !this.host) return;
      const handle = this.containerEl.querySelector(".header-row");
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialRight = 24;
      let initialBottom = 24;
      handle.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = this.host.getBoundingClientRect();
        initialRight = window.innerWidth - rect.right;
        initialBottom = window.innerHeight - rect.bottom;
        e.preventDefault();
      });
      window.addEventListener("mousemove", (e) => {
        if (!isDragging || !this.host) return;
        const dx = startX - e.clientX;
        const dy = startY - e.clientY;
        this.host.style.right = `${Math.max(10, initialRight + dx)}px`;
        this.host.style.bottom = `${Math.max(10, initialBottom + dy)}px`;
      });
      window.addEventListener("mouseup", () => {
        isDragging = false;
      });
    }
    updateStatus(status, detailText) {
      if (!this.statusBadge || !this.micButton) return;
      this.statusBadge.className = `status-pill ${status}`;
      const micTextEl = this.shadow?.getElementById("voxnav-mic-text");
      switch (status) {
        case "listening":
          this.statusBadge.textContent = "\u25CF Listening...";
          this.micButton.classList.add("active");
          if (micTextEl) micTextEl.textContent = "Stop";
          break;
        case "understanding":
          this.statusBadge.textContent = "\u25CC Understanding...";
          this.micButton.classList.remove("active");
          if (micTextEl) micTextEl.textContent = "Speak";
          break;
        case "executing":
          this.statusBadge.textContent = `\u2192 ${detailText || "Executing"}`;
          break;
        case "done":
          this.statusBadge.textContent = `\u2713 ${detailText || "Done"}`;
          this.micButton.classList.remove("active");
          if (micTextEl) micTextEl.textContent = "Speak";
          break;
        case "ambiguous":
          this.statusBadge.textContent = `\u26A0 ${detailText || "Which one?"}`;
          break;
        case "error":
          this.statusBadge.textContent = `\u2715 ${detailText || "Error"}`;
          this.micButton.classList.remove("active");
          if (micTextEl) micTextEl.textContent = "Speak";
          break;
        case "idle":
        default:
          this.statusBadge.textContent = "\u25CF Ready";
          this.micButton.classList.remove("active");
          if (micTextEl) micTextEl.textContent = "Speak";
      }
    }
    setTranscript(text) {
      const box = this.shadow?.getElementById("voxnav-transcript-box");
      if (!this.transcriptText || !box) return;
      if (text) {
        this.transcriptText.textContent = `"${text}"`;
        box.style.display = "flex";
      } else {
        box.style.display = "none";
      }
    }
    setNumbersActive(active) {
      this.isNumbersActive = active;
      this.numberButton?.classList.toggle("active", active);
    }
    show() {
      if (this.host) {
        this.host.style.display = "block";
        this.isVisible = true;
      } else {
        this.init();
      }
    }
    hide() {
      if (this.host) {
        this.host.style.display = "none";
        this.isVisible = false;
      }
    }
    toggle() {
      if (this.isVisible) {
        this.hide();
        return false;
      } else {
        this.show();
        return true;
      }
    }
  };

  // src/voice/speech-recognition.ts
  var WebSpeechEngine = class {
    recognition = null;
    isListening = false;
    currentLanguage = "en-US";
    callbacks;
    shouldRestart = false;
    constructor(callbacks) {
      this.callbacks = callbacks;
      this.initRecognition();
    }
    initRecognition() {
      if (typeof window === "undefined") return;
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn("[VoxNav Speech] Web Speech API not supported in this browser context.");
        return;
      }
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLanguage;
        this.recognition.maxAlternatives = 1;
        this.recognition.onstart = () => {
          this.isListening = true;
          this.callbacks.onListeningStateChange(true);
        };
        this.recognition.onresult = (event) => {
          let interimTranscript = "";
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          if (finalTranscript.trim()) {
            this.callbacks.onTranscript(finalTranscript.trim(), true);
          } else if (interimTranscript.trim()) {
            this.callbacks.onTranscript(interimTranscript.trim(), false);
          }
        };
        this.recognition.onerror = (event) => {
          const error = event.error;
          let humanMessage = "Speech recognition error occurred.";
          switch (error) {
            case "not-allowed":
              humanMessage = "Microphone access was denied. Please allow microphone permissions in Chrome.";
              this.shouldRestart = false;
              break;
            case "no-speech":
              return;
            case "audio-capture":
              humanMessage = "No microphone was found or microphone is busy.";
              this.shouldRestart = false;
              break;
            case "network":
              humanMessage = "Speech recognition network connection dropped.";
              break;
            default:
              humanMessage = `Speech error: ${error}`;
          }
          this.callbacks.onError(humanMessage, error);
        };
        this.recognition.onend = () => {
          this.isListening = false;
          this.callbacks.onListeningStateChange(false);
          if (this.shouldRestart) {
            try {
              this.recognition.start();
            } catch (e) {
            }
          }
        };
      } catch (e) {
        console.error("[VoxNav Speech] Error initializing recognition:", e);
      }
    }
    setLanguage(lang) {
      this.currentLanguage = lang;
      if (this.recognition) {
        this.recognition.lang = lang;
      }
    }
    start() {
      if (!this.recognition) {
        this.callbacks.onError("Speech recognition API is unavailable in this tab.");
        return;
      }
      if (this.isListening) return;
      this.shouldRestart = true;
      try {
        this.recognition.start();
      } catch (e) {
        console.warn("[VoxNav Speech] Recognition start error:", e);
      }
    }
    stop() {
      this.shouldRestart = false;
      if (this.recognition && this.isListening) {
        try {
          this.recognition.stop();
        } catch (e) {
        }
      }
      this.isListening = false;
      this.callbacks.onListeningStateChange(false);
    }
    abort() {
      this.shouldRestart = false;
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) {
        }
      }
      this.isListening = false;
      this.callbacks.onListeningStateChange(false);
    }
    isAvailable() {
      return this.recognition !== null;
    }
  };

  // src/voice/multilingual.ts
  var MultilingualEngine = class {
    /**
     * Pre-cleans conversational phrases and translates colloquial patterns into standard English command structures.
     */
    static normalize(rawUtterance) {
      let text = rawUtterance.trim().toLowerCase();
      let detectedLang = "en";
      if (/[\u0980-\u09FF]/.test(text) || /\b(koro|dekhao|kholo|jaao|niche|upore|ei|eta)\b/i.test(text)) {
        detectedLang = "bn";
      } else if (/[\u0900-\u097F]/.test(text) || /\b(karo|kholo|jao|neeche|upar|dikhao|kijiye|dabaao)\b/i.test(text)) {
        detectedLang = "hi";
      }
      const extractedNumber = extractNumberFromText(text);
      if (detectedLang === "bn") {
        text = text.replace(/লগইন|লগ ইন/g, "login").replace(/বাটনে ক্লিক করো|এ ক্লিক করো|ক্লিক করো|চাপ দাও/g, "click").replace(/খোল|খোলো|ওপেন করো/g, "open").replace(/নিচে স্ক্রোল করো|নিচে যাও/g, "scroll down").replace(/উপরে স্ক্রোল করো|উপরে যাও/g, "scroll up").replace(/সবচেয়ে উপরে যাও/g, "scroll to top").replace(/সবচেয়ে নিচে যাও/g, "scroll to bottom").replace(/সার্চ করো|খোঁজ করো/g, "search").replace(/ফর্ম জমা দাও|জমা দাও|সাবমিট করো/g, "submit").replace(/পেজটা পড়ো|পড়ে শোনাও/g, "read page").replace(/নম্বর দেখাও|সংখ্যা দেখাও/g, "show numbers").replace(/নম্বর লুকাও/g, "hide numbers").replace(/পিছনে যাও/g, "go back").replace(/সামনে যাও/g, "go forward").replace(/রিফ্রেশ করো/g, "refresh");
        text = text.replace(/\b(pe click koro|te click koro|click koro|te chap dao)\b/gi, "click").replace(/\b(kholo|open koro)\b/gi, "open").replace(/\b(niche scroll koro|niche jao)\b/gi, "scroll down").replace(/\b(upore scroll koro|upore jao)\b/gi, "scroll up").replace(/\b(search koro|khonjo)\b/gi, "search").replace(/\b(submit koro|joma dao)\b/gi, "submit").replace(/\b(read koro|pore shonao)\b/gi, "read page").replace(/\b(number dekhao|numbers dekhao)\b/gi, "show numbers").replace(/\b(number lukao)\b/gi, "hide numbers").replace(/\b(pichone jao|back jao)\b/gi, "go back");
      }
      if (detectedLang === "hi") {
        text = text.replace(/लॉगिन/g, "login").replace(/पर क्लिक करो|क्लिक करो|दबाओ/g, "click").replace(/खोलो|ओपन करो/g, "open").replace(/नीचे स्क्रॉल करो|नीचे जाओ/g, "scroll down").replace(/ऊपर स्क्रॉल करो|ऊपर जाओ/g, "scroll up").replace(/सर्च करो|ढूंढो/g, "search").replace(/सबमिट करो|जमा करो/g, "submit").replace(/पेज पढ़ो|पढ़कर सुनाओ/g, "read page").replace(/नंबर दिखाओ|संख्याएं दिखाओ/g, "show numbers").replace(/नंबर छुपाओ/g, "hide numbers").replace(/पीछे जाओ/g, "go back").replace(/आगे जाओ/g, "go forward").replace(/रिफ्रेश करो/g, "refresh");
        text = text.replace(/\b(pe click karo|par click karo|click karo|dabao)\b/gi, "click").replace(/\b(kholo|open karo)\b/gi, "open").replace(/\b(neeche scroll karo|neeche jao|thoda neeche karo)\b/gi, "scroll down").replace(/\b(upar scroll karo|upar jao|thoda upar karo)\b/gi, "scroll up").replace(/\b(search karo|dhoondo)\b/gi, "search").replace(/\b(submit karo|bhejo)\b/gi, "submit").replace(/\b(padho|read karo)\b/gi, "read page").replace(/\b(number dikhao|numbers dikhao)\b/gi, "show numbers").replace(/\b(number chupao)\b/gi, "hide numbers").replace(/\b(peeche jao|back jao)\b/gi, "go back");
      }
      text = text.replace(/\b(please|can you|could you|kindly|just|hey|voxnav)\b/gi, "").replace(/\s+/g, " ").trim();
      return {
        cleanedText: text,
        detectedLang,
        extractedNumber
      };
    }
  };

  // src/voice/command-parser.ts
  var CommandParser = class {
    /**
     * Main parsing method converting speech input to a structured ParsedCommand.
     */
    static parse(rawUtterance) {
      if (!rawUtterance || !rawUtterance.trim()) {
        return {
          raw: "",
          intent: "UNKNOWN",
          confidence: 0,
          language: "en"
        };
      }
      const normalized = MultilingualEngine.normalize(rawUtterance);
      const text = normalized.cleanedText;
      const lang = normalized.detectedLang;
      if (/^(confirm|yes|proceed|sure|haan|thik ache|ha)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "CONFIRM", confidence: 0.99, language: lang };
      }
      if (/^(cancel|no|stop|abort|nah|na|bondho koro|roko)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "CANCEL", confidence: 0.99, language: lang };
      }
      if (/\b(start demo|run demo|demo mode|demonstrate)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "START_DEMO", confidence: 0.98, language: lang };
      }
      if (/\b(help|what can i say|commands|how to use)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "HELP", confidence: 0.95, language: lang };
      }
      if (/\b(show numbers|show navigation|navigation options|display numbers|turn on numbers|number dekhao)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "SHOW_NUMBERS", confidence: 0.98, language: lang };
      }
      if (/\b(hide numbers|remove numbers|turn off numbers|number chupao|number bondho)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "HIDE_NUMBERS", confidence: 0.98, language: lang };
      }
      const directNumberMatch = text.match(/\b(?:click|open|select|press|choose|number)?\s*([0-9]+)\b/i);
      if (directNumberMatch && (text.length <= 15 || /^(click|open|select|press|choose|number)?\s*\d+$/i.test(text))) {
        const num = parseInt(directNumberMatch[1], 10);
        if (!isNaN(num)) {
          return {
            raw: rawUtterance,
            intent: "CLICK_NUMBER",
            targetNumber: num,
            confidence: 0.98,
            language: lang
          };
        }
      }
      if (normalized.extractedNumber && /^(click|open|select|choose|number)?\s*(one|two|three|four|five|six|seven|eight|nine|ten|ek|dui|tin|do|teen)\b/i.test(text)) {
        return {
          raw: rawUtterance,
          intent: "CLICK_NUMBER",
          targetNumber: normalized.extractedNumber,
          confidence: 0.95,
          language: lang
        };
      }
      if (/\b(new tab|open a new tab|create tab)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "NEW_TAB", confidence: 0.95, language: lang };
      }
      if (/\b(close tab|close this tab|exit tab)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "CLOSE_TAB", confidence: 0.95, language: lang };
      }
      if (/\b(next tab|switch to next tab)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "NEXT_TAB", confidence: 0.95, language: lang };
      }
      if (/\b(previous tab|prev tab)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "PREVIOUS_TAB", confidence: 0.95, language: lang };
      }
      if (/\b(go back|previous page|back)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "BACK", confidence: 0.95, language: lang };
      }
      if (/\b(go forward|next page|forward)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "FORWARD", confidence: 0.95, language: lang };
      }
      if (/\b(refresh|reload|reload page|refresh the page)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "REFRESH", confidence: 0.95, language: lang };
      }
      if (/\b(go home|home page|homepage|home)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "HOME", confidence: 0.92, language: lang };
      }
      if (/\b(scroll to top|go to top|top of page|all the way up)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "SCROLL_TOP", direction: "TOP", confidence: 0.96, language: lang };
      }
      if (/\b(scroll to bottom|go to bottom|bottom of page|all the way down)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "SCROLL_BOTTOM", direction: "BOTTOM", confidence: 0.96, language: lang };
      }
      if (/\b(scroll down|down a little|move down|downward)\b/i.test(text)) {
        const isSmall = /\b(a little|slightly|bit|thoda|ektu)\b/i.test(text);
        return {
          raw: rawUtterance,
          intent: "SCROLL_DOWN",
          direction: "DOWN",
          amount: isSmall ? "SMALL" : "MEDIUM",
          confidence: 0.95,
          language: lang
        };
      }
      if (/\b(scroll up|up a little|move up|upward)\b/i.test(text)) {
        const isSmall = /\b(a little|slightly|bit|thoda|ektu)\b/i.test(text);
        return {
          raw: rawUtterance,
          intent: "SCROLL_UP",
          direction: "UP",
          amount: isSmall ? "SMALL" : "MEDIUM",
          confidence: 0.95,
          language: lang
        };
      }
      if (/\b(page down)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "PAGE_DOWN", direction: "DOWN", amount: "LARGE", confidence: 0.95, language: lang };
      }
      if (/\b(page up)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "PAGE_UP", direction: "UP", amount: "LARGE", confidence: 0.95, language: lang };
      }
      if (/\b(read this page|read page|read out loud|speak page)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "READ_PAGE", confidence: 0.95, language: lang };
      }
      if (/\b(what is this page about|describe this page|summarize page|page summary)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "DESCRIBE_PAGE", confidence: 0.95, language: lang };
      }
      const readSecMatch = text.match(/\bread (?:the )?(?:section |heading )?(.+)\b/i);
      if (readSecMatch && !readSecMatch[1].includes("page")) {
        return { raw: rawUtterance, intent: "READ_SECTION", target: readSecMatch[1].trim(), confidence: 0.9, language: lang };
      }
      const searchMatch = text.match(/\b(?:search for|search|look for|find)\s+(.+)/i);
      if (searchMatch) {
        const query = searchMatch[1].replace(/\b(on this page|in google)\b/i, "").trim();
        if (query) {
          return {
            raw: rawUtterance,
            intent: "SEARCH",
            value: query,
            confidence: 0.94,
            language: lang
          };
        }
      }
      const typePattern1 = text.match(/\b(?:fill|enter|type|write|input)\s+(?:my\s+)?(.+?)\s+(?:as|with|to be)\s+(.+)/i);
      if (typePattern1) {
        return {
          raw: rawUtterance,
          intent: "TYPE",
          target: typePattern1[1].trim(),
          value: typePattern1[2].trim(),
          confidence: 0.95,
          language: lang
        };
      }
      const typePattern2 = text.match(/\b(?:type|write|enter)\s+(.+?)\s+(?:in|into|on)\s+(?:the\s+)?(.+)/i);
      if (typePattern2) {
        return {
          raw: rawUtterance,
          intent: "TYPE",
          target: typePattern2[2].trim(),
          value: typePattern2[1].trim(),
          confidence: 0.94,
          language: lang
        };
      }
      const typePattern3 = text.match(/\b(?:fill|enter|type)\s+(?:my\s+)?(name|email|phone|address|password|username)\b/i);
      if (typePattern3) {
        return {
          raw: rawUtterance,
          intent: "FOCUS",
          target: typePattern3[1].trim(),
          targetType: "input",
          confidence: 0.88,
          language: lang
        };
      }
      const clearMatch = text.match(/\b(?:clear|erase|empty)\s+(?:the\s+)?(.+)/i);
      if (clearMatch) {
        return {
          raw: rawUtterance,
          intent: "CLEAR",
          target: clearMatch[1].trim(),
          confidence: 0.9,
          language: lang
        };
      }
      const selectMatch = text.match(/\b(?:select|choose|pick)\s+(?:option\s+)?(.+)/i);
      if (selectMatch && !/\b(first|second|third|1|2|3|4|5)\b/i.test(selectMatch[1])) {
        return {
          raw: rawUtterance,
          intent: "SELECT",
          value: selectMatch[1].trim(),
          confidence: 0.9,
          language: lang
        };
      }
      const checkMatch = text.match(/\bcheck\s+(?:the\s+)?(.+)/i);
      if (checkMatch) {
        return {
          raw: rawUtterance,
          intent: "CHECK",
          target: checkMatch[1].trim(),
          confidence: 0.92,
          language: lang
        };
      }
      const uncheckMatch = text.match(/\buncheck\s+(?:the\s+)?(.+)/i);
      if (uncheckMatch) {
        return {
          raw: rawUtterance,
          intent: "UNCHECK",
          target: uncheckMatch[1].trim(),
          confidence: 0.92,
          language: lang
        };
      }
      if (/\b(submit the form|submit form|submit|send form)\b/i.test(text)) {
        return { raw: rawUtterance, intent: "SUBMIT", confidence: 0.95, language: lang };
      }
      const ordinalMatch = text.match(/\b(?:click|open|select|press)?\s*(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th)\s+(link|result|button|item|card|product)?/i);
      if (ordinalMatch) {
        const ordNum = extractNumberFromText(ordinalMatch[1]) || 1;
        const elemType = ordinalMatch[2] ? ordinalMatch[2].toLowerCase() : "link";
        return {
          raw: rawUtterance,
          intent: "CLICK",
          targetType: elemType,
          targetNumber: ordNum,
          confidence: 0.93,
          language: lang
        };
      }
      const openMatch = text.match(/\b(?:open|go to|navigate to)\s+(?:the\s+)?(.+?)(?:\s+(?:page|section|tab|link))?$/i);
      if (openMatch) {
        const targetStr = openMatch[1].trim();
        return {
          raw: rawUtterance,
          intent: "OPEN_LINK",
          target: targetStr,
          confidence: 0.9,
          language: lang
        };
      }
      const clickSaysMatch = text.match(/\bclick\s+(?:the\s+)?(?:button|link|item)?\s*(?:that says|saying|named|called)\s+["']?(.+?)["']?$/i);
      if (clickSaysMatch) {
        return {
          raw: rawUtterance,
          intent: "CLICK",
          target: clickSaysMatch[1].trim(),
          confidence: 0.96,
          language: lang
        };
      }
      const clickGeneralMatch = text.match(/\b(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+(?:button|link|icon|tab|menu))?$/i);
      if (clickGeneralMatch) {
        const targetStr = clickGeneralMatch[1].trim();
        let targetType = "button";
        if (text.includes("link")) targetType = "link";
        if (text.includes("tab")) targetType = "tab";
        return {
          raw: rawUtterance,
          intent: "CLICK",
          target: targetStr,
          targetType,
          confidence: 0.89,
          language: lang
        };
      }
      if (text.length > 2 && text.length < 25) {
        return {
          raw: rawUtterance,
          intent: "CLICK",
          target: text,
          confidence: 0.7,
          language: lang
        };
      }
      return {
        raw: rawUtterance,
        intent: "UNKNOWN",
        confidence: 0.3,
        language: lang
      };
    }
  };

  // src/voice/text-to-speech.ts
  var TextToSpeechEngine = class {
    enabled = true;
    rate = 1;
    pitch = 1;
    preferredLang = "en-US";
    synth = null;
    constructor() {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        this.synth = window.speechSynthesis;
      }
    }
    setConfig(enabled, rate = 1, pitch = 1, lang = "en-US") {
      this.enabled = enabled;
      this.rate = Math.max(0.7, Math.min(rate, 1.6));
      this.pitch = Math.max(0.8, Math.min(pitch, 1.4));
      this.preferredLang = lang;
    }
    speak(text, onEnd) {
      if (!this.enabled || !text) {
        if (onEnd) onEnd();
        return;
      }
      if (!this.synth) {
        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: "VOXNAV_SPEAK", text });
        }
        if (onEnd) onEnd();
        return;
      }
      try {
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;
        utterance.lang = this.preferredLang;
        const voices = this.synth.getVoices();
        const matchingVoice = voices.find((v) => v.lang.startsWith(this.preferredLang.slice(0, 2)));
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
        utterance.onend = () => {
          if (onEnd) onEnd();
        };
        utterance.onerror = (e) => {
          console.warn("[VoxNav TTS] Speech error:", e);
          if (onEnd) onEnd();
        };
        this.synth.speak(utterance);
      } catch (err) {
        console.warn("[VoxNav TTS] Exception during speech synthesis:", err);
        if (onEnd) onEnd();
      }
    }
    stop() {
      if (this.synth) {
        this.synth.cancel();
      }
    }
  };
  var tts = new TextToSpeechEngine();

  // src/ai/prompts.ts
  var SYSTEM_PLANNER_PROMPT = `You are VoxNav, an autonomous browser interaction agent.
Your objective is to translate a user's natural language voice command into a safe, sequential list of browser actions on the current webpage.

CRITICAL SAFETY RULES:
1. NEVER output JavaScript code, eval, URLs to unknown scripts, or shell commands.
2. Only select action types from this exact whitelist:
   - CLICK, DOUBLE_CLICK, FOCUS, HOVER, TYPE, CLEAR, SELECT, CHECK, UNCHECK, SUBMIT, SCROLL_DOWN, SCROLL_UP, SCROLL_TOP, SCROLL_BOTTOM, BACK, FORWARD, REFRESH.
3. Every target element must be identified by its "targetId" from the provided semantic elements list.
4. Output MUST be ONLY valid JSON matching this schema:
{
  "reasoning": "brief explanation",
  "actions": [
    {
      "type": "CLICK",
      "targetId": 12,
      "description": "Click the pricing button"
    }
  ],
  "feedbackMessage": "Opening pricing page"
}
Do not enclose in markdown blocks if possible, or use standard json formatting.`;
  function buildPlannerUserPrompt(userUtterance, compactElements, pageTitle) {
    return `Current Page: "${pageTitle}"
User Spoken Command: "${userUtterance}"

Visible Interactive Elements:
${JSON.stringify(compactElements, null, 2)}

Identify the best target element(s) to fulfill the user's command and return the JSON action plan:`;
  }

  // src/ai/schemas.ts
  function validateAIResponse(json) {
    if (!json || typeof json !== "object") {
      return { valid: false, error: "AI response is not a valid JSON object." };
    }
    if (!Array.isArray(json.actions)) {
      return { valid: false, error: "AI response must contain an 'actions' array." };
    }
    const validatedSteps = [];
    for (const item of json.actions) {
      if (!item.type || typeof item.type !== "string") {
        return { valid: false, error: "Action step missing valid 'type'." };
      }
      if (!ActionValidator.isAllowedIntent(item.type)) {
        return { valid: false, error: `Action '${item.type}' is not in the allowed intent whitelist.` };
      }
      validatedSteps.push({
        type: item.type,
        targetId: typeof item.targetId === "number" ? item.targetId : void 0,
        targetSelector: typeof item.targetSelector === "string" ? item.targetSelector : void 0,
        value: typeof item.value === "string" ? ActionValidator.sanitizeInput(item.value) : void 0,
        description: typeof item.description === "string" ? item.description : item.type
      });
    }
    return {
      valid: true,
      data: {
        reasoning: typeof json.reasoning === "string" ? json.reasoning : "",
        actions: validatedSteps,
        feedbackMessage: typeof json.feedbackMessage === "string" ? json.feedbackMessage : void 0
      }
    };
  }

  // src/ai/planner.ts
  var AIPlanner = class {
    settings;
    constructor(settings) {
      this.settings = settings;
    }
    updateSettings(settings) {
      this.settings = settings;
    }
    /**
     * Resolves complex commands using configured LLM provider (Groq / OpenAI / Ollama).
     */
    async planWithAI(command, compactElements, pageTitle) {
      if (this.settings.aiProvider === "offline" || !this.settings.aiAssistance) {
        return null;
      }
      const apiKey = this.settings.aiApiKey;
      const provider = this.settings.aiProvider;
      let endpoint = "";
      let headers = { "Content-Type": "application/json" };
      let model = this.settings.aiModel || "llama-3.3-70b-versatile";
      if (provider === "groq") {
        endpoint = "https://api.groq.com/openai/v1/chat/completions";
        if (!apiKey) return null;
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else if (provider === "openai") {
        endpoint = "https://api.openai.com/v1/chat/completions";
        model = this.settings.aiModel || "gpt-4o-mini";
        if (!apiKey) return null;
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else if (provider === "ollama") {
        endpoint = this.settings.aiEndpoint || "http://localhost:11434/api/generate";
      }
      try {
        const userPrompt = buildPlannerUserPrompt(command.raw, compactElements, pageTitle);
        let requestBody;
        if (provider === "ollama") {
          requestBody = {
            model: this.settings.aiModel || "qwen2.5:latest",
            system: SYSTEM_PLANNER_PROMPT,
            prompt: userPrompt,
            stream: false,
            format: "json"
          };
        } else {
          requestBody = {
            model,
            messages: [
              { role: "system", content: SYSTEM_PLANNER_PROMPT },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
          };
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody)
        });
        if (!res.ok) {
          console.warn("[VoxNav AI] Request failed:", res.status, res.statusText);
          return null;
        }
        const data = await res.json();
        let rawContent = "";
        if (provider === "ollama") {
          rawContent = data.response;
        } else {
          rawContent = data.choices?.[0]?.message?.content || "";
        }
        const parsedJSON = JSON.parse(rawContent);
        const validation = validateAIResponse(parsedJSON);
        if (validation.valid && validation.data) {
          return validation.data;
        } else {
          console.warn("[VoxNav AI] Validation error:", validation.error);
          return null;
        }
      } catch (err) {
        console.warn("[VoxNav AI] Exception during LLM planning:", err);
        return null;
      }
    }
  };

  // src/content/content-main.ts
  var VoxNavContentApp = class {
    settings = { ...DEFAULT_SETTINGS };
    discovery;
    analyzer;
    labeler;
    actionEngine;
    overlay;
    speechEngine;
    aiPlanner;
    isListening = false;
    pendingConfirmationStep = null;
    pendingCandidates = [];
    lastCommandText = "";
    lastResultText = "";
    constructor() {
      this.discovery = new ElementDiscovery();
      this.analyzer = new PageAnalyzer(this.discovery);
      this.labeler = new ElementLabeler(this.discovery);
      this.actionEngine = new ActionEngine(this.discovery);
      this.aiPlanner = new AIPlanner(this.settings);
      this.overlay = new FloatingOverlay({
        onToggleMic: () => this.toggleListening(),
        onSubmitTextCommand: (text) => this.handleCommand(text),
        onToggleNumbers: () => this.toggleNumberedMode(),
        onClose: () => this.stopListening()
      });
      this.speechEngine = new WebSpeechEngine({
        onTranscript: (transcript, isFinal) => this.handleSpeechTranscript(transcript, isFinal),
        onError: (msg) => this.handleSpeechError(msg),
        onListeningStateChange: (listening) => this.handleListeningStateChange(listening)
      });
      this.init();
    }
    async init() {
      if (typeof chrome !== "undefined" && chrome.storage?.sync) {
        try {
          const stored = await chrome.storage.sync.get("voxnav_settings");
          if (stored.voxnav_settings) {
            this.settings = { ...this.settings, ...stored.voxnav_settings };
            this.applySettings();
          }
        } catch (e) {
        }
      }
      if (this.settings.floatingMic) {
        this.overlay.init();
      }
      this.setupMessageListener();
      this.analyzer.refresh();
    }
    applySettings() {
      tts.setConfig(
        this.settings.voiceFeedback,
        this.settings.speechRate,
        this.settings.speechPitch,
        this.settings.language === "auto" ? "en-US" : this.settings.language
      );
      this.speechEngine.setLanguage(this.settings.language === "auto" ? "en-US" : this.settings.language);
      this.aiPlanner.updateSettings(this.settings);
      if (this.settings.floatingMic) {
        this.overlay.show();
      } else {
        this.overlay.hide();
      }
    }
    setupMessageListener() {
      if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return;
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        switch (message.type) {
          case "VOXNAV_TOGGLE_VOICE":
            this.toggleListening();
            sendResponse({ success: true, isListening: this.isListening });
            break;
          case "VOXNAV_START_LISTENING":
            this.startListening();
            sendResponse({ success: true });
            break;
          case "VOXNAV_STOP_LISTENING":
            this.stopListening();
            sendResponse({ success: true });
            break;
          case "VOXNAV_EXECUTE_TEXT_COMMAND":
            this.handleCommand(message.text);
            sendResponse({ success: true });
            break;
          case "VOXNAV_TOGGLE_NUMBERS":
            const active = this.toggleNumberedMode();
            sendResponse({ success: true, active });
            break;
          case "VOXNAV_START_DEMO":
            this.startInteractiveDemo();
            sendResponse({ success: true });
            break;
          case "VOXNAV_GET_PAGE_SUMMARY":
            const summary = this.analyzer.getPageSummary();
            summary.isVoiceActive = this.isListening;
            summary.numberedModeActive = this.labeler.getIsVisible();
            summary.lastCommand = this.lastCommandText;
            summary.lastResult = this.lastResultText;
            sendResponse(summary);
            break;
          case "VOXNAV_SETTINGS_UPDATED":
            this.settings = { ...this.settings, ...message.settings };
            this.applySettings();
            sendResponse({ success: true });
            break;
        }
        return true;
      });
    }
    toggleListening() {
      if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    }
    startListening() {
      this.overlay.show();
      this.overlay.updateStatus("listening");
      this.speechEngine.start();
      this.isListening = true;
      tts.speak("Listening");
    }
    stopListening() {
      this.speechEngine.stop();
      this.isListening = false;
      this.overlay.updateStatus("idle");
    }
    handleListeningStateChange(listening) {
      this.isListening = listening;
      this.overlay.updateStatus(listening ? "listening" : "idle");
    }
    handleSpeechTranscript(transcript, isFinal) {
      this.overlay.setTranscript(transcript);
      if (isFinal) {
        this.handleCommand(transcript);
      }
    }
    handleSpeechError(errorMsg) {
      this.overlay.updateStatus("error", errorMsg);
      tts.speak(errorMsg);
    }
    toggleNumberedMode() {
      const elements = this.analyzer.refresh();
      const isActive = this.labeler.toggle(elements);
      this.overlay.setNumbersActive(isActive);
      if (isActive) {
        tts.speak("Numbered mode active. Say a number to click.");
        this.overlay.updateStatus("done", "Numbers visible");
      } else {
        tts.speak("Numbered mode closed.");
        this.overlay.updateStatus("idle");
      }
      return isActive;
    }
    /**
     * Main Command Execution Pipeline
     */
    async handleCommand(rawUtterance) {
      if (!rawUtterance || !rawUtterance.trim()) return;
      this.lastCommandText = rawUtterance;
      this.overlay.updateStatus("understanding");
      this.overlay.setTranscript(rawUtterance);
      if (this.pendingConfirmationStep) {
        if (/^(confirm|yes|proceed|sure|haan|thik ache)\b/i.test(rawUtterance)) {
          const step = this.pendingConfirmationStep;
          this.pendingConfirmationStep = null;
          this.overlay.updateStatus("executing", step.description);
          this.actionEngine.executeStep(step);
          this.finishCommand(`Action confirmed and executed: ${step.description}`);
          return;
        } else {
          this.pendingConfirmationStep = null;
          this.finishCommand("Action cancelled.");
          return;
        }
      }
      if (this.pendingCandidates.length > 0) {
        const chosenNum = parseInt(rawUtterance.replace(/\D/g, ""), 10);
        if (chosenNum >= 1 && chosenNum <= this.pendingCandidates.length) {
          const selected = this.pendingCandidates[chosenNum - 1];
          this.pendingCandidates = [];
          this.labeler.hide();
          this.overlay.updateStatus("executing", `Clicking ${selected.text || "item"}`);
          const el = this.discovery.getElementById(selected.id);
          if (el) {
            this.actionEngine.clickElement(el);
            this.finishCommand(`Selected item ${chosenNum} clicked`);
          }
          return;
        }
      }
      const parsed = CommandParser.parse(rawUtterance);
      if (parsed.intent === "START_DEMO") {
        this.startInteractiveDemo();
        return;
      }
      if (parsed.intent === "HELP") {
        const helpMsg = "You can say: click login, open pricing, scroll down, show numbers, search for topics, or read this page.";
        tts.speak(helpMsg);
        this.finishCommand(helpMsg);
        return;
      }
      if (parsed.intent === "SHOW_NUMBERS") {
        this.labeler.show(this.analyzer.refresh());
        this.overlay.setNumbersActive(true);
        this.finishCommand("Numbers displayed. Say a number to click.");
        return;
      }
      if (parsed.intent === "HIDE_NUMBERS") {
        this.labeler.hide();
        this.overlay.setNumbersActive(false);
        this.finishCommand("Numbers hidden.");
        return;
      }
      if (parsed.intent === "CLICK_NUMBER" && parsed.targetNumber !== void 0) {
        const matchedSemantic = this.labeler.getElementByNumber(parsed.targetNumber);
        if (matchedSemantic) {
          const targetEl = this.discovery.getElementById(matchedSemantic.id);
          if (targetEl) {
            this.labeler.highlightBadge(parsed.targetNumber);
            this.overlay.updateStatus("executing", `Item ${parsed.targetNumber}`);
            this.actionEngine.clickElement(targetEl);
            this.finishCommand(`Clicked item ${parsed.targetNumber}`);
            return;
          }
        } else {
          this.finishCommand(`Item number ${parsed.targetNumber} not found on this screen.`);
          return;
        }
      }
      if (["NEW_TAB", "CLOSE_TAB", "NEXT_TAB", "PREVIOUS_TAB"].includes(parsed.intent)) {
        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: "VOXNAV_TAB_ACTION", action: parsed.intent });
          this.finishCommand(`Browser tab action: ${parsed.intent}`);
          return;
        }
      }
      if (parsed.intent === "READ_PAGE" || parsed.intent === "DESCRIBE_PAGE") {
        const outline = this.analyzer.getSpokenPageOutline();
        tts.speak(outline);
        this.finishCommand("Page overview read.");
        return;
      }
      if (["SCROLL_DOWN", "SCROLL_UP", "SCROLL_TOP", "SCROLL_BOTTOM", "PAGE_DOWN", "PAGE_UP"].includes(parsed.intent)) {
        this.actionEngine.executeStep({
          type: parsed.intent,
          description: `Scroll ${parsed.direction || "page"}`
        });
        this.finishCommand(`Scrolled ${parsed.direction?.toLowerCase() || "page"}`);
        return;
      }
      if (["BACK", "FORWARD", "REFRESH", "HOME"].includes(parsed.intent)) {
        this.actionEngine.executeStep({
          type: parsed.intent,
          description: `Navigate ${parsed.intent}`
        });
        this.finishCommand(`Navigating: ${parsed.intent}`);
        return;
      }
      if (parsed.intent === "SEARCH" && parsed.value) {
        const searchBox = this.analyzer.findPrimarySearchInput();
        if (searchBox) {
          const el = this.discovery.getElementById(searchBox.id);
          if (el) {
            this.actionEngine.typeIntoElement(el, parsed.value);
            const form = el.closest("form");
            if (form) {
              form.requestSubmit();
            } else {
              el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
            }
            this.finishCommand(`Searching for "${parsed.value}"`);
            return;
          }
        } else {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(parsed.value)}`, "_blank");
          this.finishCommand(`Searching Google for "${parsed.value}"`);
          return;
        }
      }
      if (parsed.intent === "TYPE" || parsed.intent === "CLEAR") {
        const targetQuery = parsed.target || "input";
        const matches = this.analyzer.findMatchingElements(targetQuery, "input");
        if (matches.length > 0) {
          const best = matches[0].element;
          const domEl = this.discovery.getElementById(best.id);
          if (domEl) {
            if (parsed.intent === "CLEAR") {
              this.actionEngine.clearElement(domEl);
              this.finishCommand(`Cleared ${best.text || "field"}`);
            } else {
              this.actionEngine.typeIntoElement(domEl, parsed.value || "");
              this.finishCommand(`Entered text into ${best.placeholder || best.text || "field"}`);
            }
            return;
          }
        }
      }
      if (parsed.intent === "SUBMIT") {
        const step = { type: "SUBMIT", description: "Submit form" };
        if (this.settings.requireHighImpactConfirmation && ActionValidator.isHighImpactAction(step)) {
          this.pendingConfirmationStep = step;
          const prompt = "VoxNav is ready to submit this form. Say 'Confirm' to continue.";
          tts.speak(prompt);
          this.overlay.updateStatus("ambiguous", "Say 'Confirm' to proceed");
          return;
        } else {
          this.actionEngine.submitForm();
          this.finishCommand("Form submitted");
          return;
        }
      }
      if (parsed.intent === "CLICK" || parsed.intent === "OPEN_LINK" || parsed.target) {
        const targetQuery = parsed.target || parsed.raw;
        const matches = this.analyzer.findMatchingElements(targetQuery, parsed.targetType);
        if (matches.length === 1 || matches.length > 1 && matches[0].score - matches[1].score > 0.25) {
          const best = matches[0].element;
          const domEl = this.discovery.getElementById(best.id);
          if (domEl) {
            const step = {
              type: "CLICK",
              targetId: best.id,
              description: `Click ${best.text || "target"}`
            };
            if (this.settings.requireHighImpactConfirmation && ActionValidator.isHighImpactAction(step, best.text)) {
              this.pendingConfirmationStep = step;
              const prompt = `VoxNav is ready to ${best.text}. Say 'Confirm' to proceed.`;
              tts.speak(prompt);
              this.overlay.updateStatus("ambiguous", "Say 'Confirm' to proceed");
              return;
            }
            this.overlay.updateStatus("executing", `Clicking ${best.text || "button"}`);
            this.actionEngine.clickElement(domEl);
            this.finishCommand(`Clicked "${best.text || "element"}"`);
            return;
          }
        } else if (matches.length > 1) {
          this.pendingCandidates = matches.slice(0, 4).map((m) => m.element);
          this.labeler.show(this.pendingCandidates);
          const prompt = `I found ${this.pendingCandidates.length} matching items. Say 1, 2, or 3.`;
          tts.speak(prompt);
          this.overlay.updateStatus("ambiguous", `Say 1 to ${this.pendingCandidates.length}`);
          return;
        }
      }
      if (this.settings.aiAssistance && this.settings.aiProvider !== "offline") {
        this.overlay.updateStatus("understanding", "Consulting AI model");
        const compact = this.analyzer.getCompactRepresentation(30);
        const aiPlan = await this.aiPlanner.planWithAI(parsed, compact, document.title);
        if (aiPlan && aiPlan.actions.length > 0) {
          for (const action of aiPlan.actions) {
            this.actionEngine.executeStep(action);
          }
          this.finishCommand(aiPlan.feedbackMessage || "AI action plan executed");
          return;
        }
      }
      this.finishCommand(`I couldn't find a matching element for "${rawUtterance}" on this page.`);
    }
    finishCommand(feedback) {
      this.lastResultText = feedback;
      this.overlay.updateStatus("done", feedback);
      tts.speak(feedback);
    }
    /**
     * Hackathon Interactive Demo Mode
     */
    async startInteractiveDemo() {
      this.overlay.show();
      this.overlay.updateStatus("understanding", "Starting VoxNav Demo");
      tts.speak("Welcome to VoxNav. Starting interactive demonstration.");
      await new Promise((r) => setTimeout(r, 1800));
      this.overlay.updateStatus("executing", "Step 1: Discovering elements");
      const elements = this.analyzer.refresh();
      this.labeler.show(elements);
      tts.speak(`Detected ${elements.length} interactive elements. Numbering targets.`);
      await new Promise((r) => setTimeout(r, 2200));
      this.overlay.setTranscript("Scroll down a little");
      this.overlay.updateStatus("executing", "Step 2: Voice command executed");
      this.actionEngine.scroll("DOWN", "SMALL");
      tts.speak("Scrolling page down.");
      await new Promise((r) => setTimeout(r, 2e3));
      this.overlay.setTranscript("Highlighting primary navigation");
      this.labeler.highlightBadge(1);
      this.overlay.updateStatus("done", "Demo complete! Speak any command.");
      tts.speak("VoxNav is ready. Speak, navigate, control the web.");
    }
  };
  if (typeof window !== "undefined") {
    window.__voxnav_instance = new VoxNavContentApp();
  }
})();
