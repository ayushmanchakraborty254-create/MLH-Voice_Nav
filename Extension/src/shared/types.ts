/**
 * VoxNav - Universal Voice Navigation for the Web
 * Core Type Definitions
 */

export type IntentType =
  // Navigation
  | "BACK"
  | "FORWARD"
  | "REFRESH"
  | "HOME"
  | "OPEN_LINK"
  | "SCROLL_UP"
  | "SCROLL_DOWN"
  | "SCROLL_TOP"
  | "SCROLL_BOTTOM"
  | "PAGE_DOWN"
  | "PAGE_UP"
  // Interaction
  | "CLICK"
  | "DOUBLE_CLICK"
  | "FOCUS"
  | "HOVER"
  | "SELECT"
  // Forms
  | "TYPE"
  | "CLEAR"
  | "SUBMIT"
  | "CHECK"
  | "UNCHECK"
  // Search
  | "SEARCH"
  | "FIND_ON_PAGE"
  // Accessibility & Reading
  | "READ_PAGE"
  | "READ_SECTION"
  | "DESCRIBE_PAGE"
  | "SHOW_NUMBERS"
  | "HIDE_NUMBERS"
  | "CLICK_NUMBER"
  // Browser Tabs (where allowed)
  | "NEW_TAB"
  | "CLOSE_TAB"
  | "NEXT_TAB"
  | "PREVIOUS_TAB"
  // System / Demo
  | "START_DEMO"
  | "HELP"
  | "CANCEL"
  | "CONFIRM"
  | "UNKNOWN";

export type ElementType =
  | "button"
  | "link"
  | "input"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "tab"
  | "menuitem"
  | "heading"
  | "search"
  | "generic";

export interface SemanticElement {
  id: number;
  type: ElementType;
  text: string;
  ariaLabel?: string;
  title?: string;
  placeholder?: string;
  role?: string;
  name?: string;
  href?: string;
  value?: string;
  disabled?: boolean;
  visible: boolean;
  inViewport: boolean;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  context?: string; // Nearby heading or parent label
  selectorPath?: string;
}

export interface ParsedCommand {
  raw: string;
  intent: IntentType;
  target?: string;
  targetType?: string;
  targetNumber?: number;
  value?: string;
  direction?: "UP" | "DOWN" | "TOP" | "BOTTOM";
  amount?: "SMALL" | "MEDIUM" | "LARGE";
  confidence: number;
  language: string;
  requiresConfirmation?: boolean;
  reason?: string;
}

export interface ActionStep {
  type: IntentType;
  targetId?: number;
  targetSelector?: string;
  targetNumber?: number;
  value?: string;
  description: string;
  highImpact?: boolean;
}

export interface ActionPlan {
  command: ParsedCommand;
  actions: ActionStep[];
  successMessage?: string;
  warningMessage?: string;
  clarificationCandidates?: SemanticElement[];
}

export type VoiceStatus =
  | "idle"
  | "listening"
  | "understanding"
  | "executing"
  | "done"
  | "ambiguous"
  | "error"
  | "confirming";

export interface VoiceState {
  status: VoiceStatus;
  transcript: string;
  feedbackText: string;
  activeCandidates?: SemanticElement[];
  pendingDangerousAction?: ActionStep;
}

export interface VoxNavSettings {
  language: "en-US" | "hi-IN" | "bn-IN" | "auto";
  voiceFeedback: boolean;
  speechRate: number; // 0.8 - 1.5
  speechPitch: number; // 0.8 - 1.2
  speechVoiceURI?: string;
  numberedLabels: boolean;
  floatingMic: boolean;
  aiAssistance: boolean;
  aiProvider: "offline" | "groq" | "openai" | "ollama";
  aiApiKey?: string;
  aiEndpoint?: string;
  aiModel?: string;
  showMicIndicator: boolean;
  sendPageContextToAi: boolean;
  requireHighImpactConfirmation: boolean;
  theme: "auto" | "light" | "dark";
}

export type ExtensionMessage =
  | { type: "VOXNAV_TOGGLE_VOICE" }
  | { type: "VOXNAV_START_LISTENING" }
  | { type: "VOXNAV_STOP_LISTENING" }
  | { type: "VOXNAV_EXECUTE_TEXT_COMMAND"; text: string }
  | { type: "VOXNAV_TOGGLE_NUMBERS" }
  | { type: "VOXNAV_START_DEMO" }
  | { type: "VOXNAV_GET_PAGE_SUMMARY" }
  | { type: "VOXNAV_PAGE_SUMMARY_RESPONSE"; summary: PageSummary }
  | { type: "VOXNAV_SETTINGS_UPDATED"; settings: Partial<VoxNavSettings> }
  | { type: "VOXNAV_TAB_ACTION"; action: "NEW_TAB" | "CLOSE_TAB" | "NEXT_TAB" | "PREVIOUS_TAB" }
  | { type: "VOXNAV_SPEAK"; text: string };

export interface PageSummary {
  url: string;
  title: string;
  buttonCount: number;
  linkCount: number;
  inputCount: number;
  headingCount: number;
  isVoiceActive: boolean;
  numberedModeActive: boolean;
  lastCommand?: string;
  lastResult?: string;
}
