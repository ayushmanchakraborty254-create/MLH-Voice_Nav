/**
 * VoxNav - Constants & Default Configurations
 */

import { VoxNavSettings, IntentType } from "./types";

export const DEFAULT_SETTINGS: VoxNavSettings = {
  language: "en-US",
  voiceFeedback: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  numberedLabels: false,
  floatingMic: true,
  aiAssistance: true,
  aiProvider: "offline",
  showMicIndicator: true,
  sendPageContextToAi: false,
  requireHighImpactConfirmation: true,
  theme: "auto"
};

export const ALLOWED_INTENTS: Set<IntentType> = new Set([
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

export const HIGH_IMPACT_KEYWORDS = [
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

export const SYNONYM_MAP: Record<string, string[]> = {
  login: ["sign in", "log in", "enter", "signin", "authenticate", "portal", "लॉगिन", "লগইন"],
  signup: ["sign up", "register", "join", "create account", "get started", "start free", "रजिस्टर", "রেজিস্টার"],
  search: ["find", "lookup", "explore", "query", "खोज", "অনুসন্ধান"],
  cart: ["basket", "bag", "checkout", "shopping cart", "টোলি", "ঝুড়ি"],
  pricing: ["plans", "cost", "rates", "subscription", "price", "দাম", "মূল্য"],
  contact: ["contact us", "reach out", "support", "help", "संपर्क", "যোগাযোগ"],
  home: ["homepage", "main", "start", "landing", "होम", "হোম"],
  docs: ["documentation", "guide", "manual", "api", "reference"],
  settings: ["preferences", "configuration", "account", "profile"],
  submit: ["send", "save", "apply", "confirm", "proceed", "next", "जारी रखें", "জমা দিন"]
};

export const INDIC_NUMBER_MAP: Record<string, number> = {
  // Bengali numerals & words
  "০": 0, "১": 1, "২": 2, "৩": 3, "৪": 4, "৫": 5, "৬": 6, "৭": 7, "৮": 8, "৯": 9,
  "এক": 1, "দুই": 2, "তিন": 3, "চার": 4, "পাঁচ": 5, "ছয়": 6, "সাত": 7, "আট": 8, "নয়": 9, "দশ": 10,
  // Devanagari numerals & Hindi words
  "०": 0, "१": 1, "२": 2, "३": 3, "४": 4, "५": 5, "६": 6, "७": 7, "८": 8, "९": 9,
  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
  // English words
  "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
  "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10,
  "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
  "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
};

export const UI_COLORS = {
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  dark: "#0F172A",
  darkSurface: "rgba(15, 23, 42, 0.94)",
  lightBackground: "#F8FAFC",
  cardSurface: "#FFFFFF",
  borderLight: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626"
};
