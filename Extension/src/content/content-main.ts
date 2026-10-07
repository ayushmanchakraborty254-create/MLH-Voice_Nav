/**
 * VoxNav - Content Script Main Coordinator
 * Integrates speech recognition, page analysis, action execution, and UI overlay.
 */

import { ElementDiscovery } from "./element-discovery";
import { PageAnalyzer } from "./page-analyzer";
import { ElementLabeler } from "./element-labeler";
import { ActionEngine } from "./action-engine";
import { FloatingOverlay } from "./overlay";
import { WebSpeechEngine } from "../voice/speech-recognition";
import { CommandParser } from "../voice/command-parser";
import { tts } from "../voice/text-to-speech";
import { AIPlanner } from "../ai/planner";
import { ActionValidator } from "../shared/safety";
import { DEFAULT_SETTINGS } from "../shared/constants";
import {
  VoxNavSettings,
  ParsedCommand,
  ActionStep,
  SemanticElement,
  ExtensionMessage
} from "../shared/types";

export class VoxNavContentApp {
  private settings: VoxNavSettings = { ...DEFAULT_SETTINGS };
  private discovery: ElementDiscovery;
  private analyzer: PageAnalyzer;
  private labeler: ElementLabeler;
  private actionEngine: ActionEngine;
  private overlay: FloatingOverlay;
  private speechEngine: WebSpeechEngine;
  private aiPlanner: AIPlanner;

  private isListening: boolean = false;
  private pendingConfirmationStep: ActionStep | null = null;
  private pendingCandidates: SemanticElement[] = [];
  private lastCommandText: string = "";
  private lastResultText: string = "";

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

  private async init(): Promise<void> {
    // 1. Load settings from chrome storage
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      try {
        const stored = await chrome.storage.sync.get("voxnav_settings");
        if (stored.voxnav_settings) {
          this.settings = { ...this.settings, ...stored.voxnav_settings };
          this.applySettings();
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Initialize overlay if enabled
    if (this.settings.floatingMic) {
      this.overlay.init();
    }

    // 3. Register message listeners from background or popup
    this.setupMessageListener();

    // 4. Update element index
    this.analyzer.refresh();
  }

  private applySettings(): void {
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

  private setupMessageListener(): void {
    if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return;

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
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
      return true; // Keep message channel open for async response
    });
  }

  public toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  public startListening(): void {
    this.overlay.show();
    this.overlay.updateStatus("listening");
    this.speechEngine.start();
    this.isListening = true;
    tts.speak("Listening");
  }

  public stopListening(): void {
    this.speechEngine.stop();
    this.isListening = false;
    this.overlay.updateStatus("idle");
  }

  private handleListeningStateChange(listening: boolean): void {
    this.isListening = listening;
    this.overlay.updateStatus(listening ? "listening" : "idle");
  }

  private handleSpeechTranscript(transcript: string, isFinal: boolean): void {
    this.overlay.setTranscript(transcript);

    if (isFinal) {
      this.handleCommand(transcript);
    }
  }

  private handleSpeechError(errorMsg: string): void {
    this.overlay.updateStatus("error", errorMsg);
    tts.speak(errorMsg);
  }

  public toggleNumberedMode(): boolean {
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
  public async handleCommand(rawUtterance: string): Promise<void> {
    if (!rawUtterance || !rawUtterance.trim()) return;

    this.lastCommandText = rawUtterance;
    this.overlay.updateStatus("understanding");
    this.overlay.setTranscript(rawUtterance);

    // 1. Check for Pending High-Impact Confirmation
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

    // 2. Check for Pending Disambiguation Candidates
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

    // 3. Parse Command with Natural Language Engine
    const parsed = CommandParser.parse(rawUtterance);

    // 4. Handle System / Accessibility Metacommands
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

    // 5. Direct Number Target Selection
    if (parsed.intent === "CLICK_NUMBER" && parsed.targetNumber !== undefined) {
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

    // 6. Browser Tab Controls (Dispatched to background)
    if (["NEW_TAB", "CLOSE_TAB", "NEXT_TAB", "PREVIOUS_TAB"].includes(parsed.intent)) {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: "VOXNAV_TAB_ACTION", action: parsed.intent });
        this.finishCommand(`Browser tab action: ${parsed.intent}`);
        return;
      }
    }

    // 7. Reading & Describing Accessibility
    if (parsed.intent === "READ_PAGE" || parsed.intent === "DESCRIBE_PAGE") {
      const outline = this.analyzer.getSpokenPageOutline();
      tts.speak(outline);
      this.finishCommand("Page overview read.");
      return;
    }

    // 8. Scrolling Navigation
    if (["SCROLL_DOWN", "SCROLL_UP", "SCROLL_TOP", "SCROLL_BOTTOM", "PAGE_DOWN", "PAGE_UP"].includes(parsed.intent)) {
      this.actionEngine.executeStep({
        type: parsed.intent,
        description: `Scroll ${parsed.direction || "page"}`
      });
      this.finishCommand(`Scrolled ${parsed.direction?.toLowerCase() || "page"}`);
      return;
    }

    // 9. Standard Browser History Navigation
    if (["BACK", "FORWARD", "REFRESH", "HOME"].includes(parsed.intent)) {
      this.actionEngine.executeStep({
        type: parsed.intent,
        description: `Navigate ${parsed.intent}`
      });
      this.finishCommand(`Navigating: ${parsed.intent}`);
      return;
    }

    // 10. Search Queries
    if (parsed.intent === "SEARCH" && parsed.value) {
      const searchBox = this.analyzer.findPrimarySearchInput();
      if (searchBox) {
        const el = this.discovery.getElementById(searchBox.id);
        if (el) {
          this.actionEngine.typeIntoElement(el, parsed.value);
          // Try submitting form or press Enter
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
        // Fallback: search in Google in new tab
        window.open(`https://www.google.com/search?q=${encodeURIComponent(parsed.value)}`, "_blank");
        this.finishCommand(`Searching Google for "${parsed.value}"`);
        return;
      }
    }

    // 11. Form Input Typing & Clearing
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

    // 12. Form Submission
    if (parsed.intent === "SUBMIT") {
      const step: ActionStep = { type: "SUBMIT", description: "Submit form" };
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

    // 13. Element Clicking & Target Resolution
    if (parsed.intent === "CLICK" || parsed.intent === "OPEN_LINK" || parsed.target) {
      const targetQuery = parsed.target || parsed.raw;
      const matches = this.analyzer.findMatchingElements(targetQuery, parsed.targetType);

      if (matches.length === 1 || (matches.length > 1 && matches[0].score - matches[1].score > 0.25)) {
        const best = matches[0].element;
        const domEl = this.discovery.getElementById(best.id);

        if (domEl) {
          const step: ActionStep = {
            type: "CLICK",
            targetId: best.id,
            description: `Click ${best.text || "target"}`
          };

          // High-impact safety confirmation check
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
        // Disambiguation Flow: Show top candidates
        this.pendingCandidates = matches.slice(0, 4).map((m) => m.element);
        this.labeler.show(this.pendingCandidates);

        const prompt = `I found ${this.pendingCandidates.length} matching items. Say 1, 2, or 3.`;
        tts.speak(prompt);
        this.overlay.updateStatus("ambiguous", `Say 1 to ${this.pendingCandidates.length}`);
        return;
      }
    }

    // 14. Fallback to AI Planner for Complex Commands
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

    // 15. Unresolved Target
    this.finishCommand(`I couldn't find a matching element for "${rawUtterance}" on this page.`);
  }

  private finishCommand(feedback: string): void {
    this.lastResultText = feedback;
    this.overlay.updateStatus("done", feedback);
    tts.speak(feedback);
  }

  /**
   * Hackathon Interactive Demo Mode
   */
  public async startInteractiveDemo(): Promise<void> {
    this.overlay.show();
    this.overlay.updateStatus("understanding", "Starting VoxNav Demo");
    tts.speak("Welcome to VoxNav. Starting interactive demonstration.");

    await new Promise((r) => setTimeout(r, 1800));

    // Step 1: Element Analysis & Numbered Overlay
    this.overlay.updateStatus("executing", "Step 1: Discovering elements");
    const elements = this.analyzer.refresh();
    this.labeler.show(elements);
    tts.speak(`Detected ${elements.length} interactive elements. Numbering targets.`);

    await new Promise((r) => setTimeout(r, 2200));

    // Step 2: Simulated Spoken Command
    this.overlay.setTranscript("Scroll down a little");
    this.overlay.updateStatus("executing", "Step 2: Voice command executed");
    this.actionEngine.scroll("DOWN", "SMALL");
    tts.speak("Scrolling page down.");

    await new Promise((r) => setTimeout(r, 2000));

    // Step 3: Highlight Target & Action
    this.overlay.setTranscript("Highlighting primary navigation");
    this.labeler.highlightBadge(1);
    this.overlay.updateStatus("done", "Demo complete! Speak any command.");
    tts.speak("VoxNav is ready. Speak, navigate, control the web.");
  }
}

// Auto-instantiate on webpage load
if (typeof window !== "undefined") {
  (window as any).__voxnav_instance = new VoxNavContentApp();
}
