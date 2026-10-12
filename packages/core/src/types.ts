export type SupportedLang = "en" | "bn" | "mr" | "hi";

export interface DOMElementSummary {
  id: string;
  tag: string;
  type?: string;
  text: string;
  ariaLabel?: string;
  placeholder?: string;
  name?: string;
  role?: string;
  selector: string;
  isClickable: boolean;
  isInput: boolean;
  value?: string;
  options?: string[]; // For <select> dropdowns
}

export interface DOMSnapshot {
  pageTitle: string;
  url: string;
  path: string;
  headings: string[];
  interactiveElements: DOMElementSummary[];
  forms: Array<{
    id: string;
    action?: string;
    fields: DOMElementSummary[];
  }>;
}

export type ActionType = 
  | "CLICK" 
  | "TYPE" 
  | "AUTO_FILL" 
  | "SELECT_OPTION" 
  | "SCROLL" 
  | "NAVIGATE" 
  | "CHANGE_LANGUAGE" 
  | "READ_PAGE" 
  | "HIGHLIGHT" 
  | "UNKNOWN";

export interface PlannedAction {
  type: ActionType;
  selector?: string;
  value?: string;
  targetUrl?: string;
  targetLang?: SupportedLang;
  direction?: "UP" | "DOWN" | "TOP" | "BOTTOM";
  amount?: number;
  formData?: Record<string, any>;
  explanation: string;
  confidence: number;
}

export interface VoiceDOMConfig {
  apiKey?: string;
  model?: string;
  defaultLang?: SupportedLang;
  enableSoundwave?: boolean;
  enableRadarHighlight?: boolean;
  apiEndpoint?: string;
}
