/**
 * VoxNav - Content Script Main Coordinator
 * Integrates speech recognition, page analysis, action execution, and UI overlay.
 * Optimized with echo cancellation, command debouncing, and jitter-free state handling.
 */

import { ElementDiscovery } from "./element-discovery";
import { PageAnalyzer } from "./page-analyzer";
import { ElementLabeler } from "./element-labeler";
import { ActionEngine } from "./action-engine";
import { FloatingOverlay } from "./overlay";
import { LoginAssistant } from "./login-assistant";
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
  private loginAssistant: LoginAssistant;
  private speechEngine: WebSpeechEngine;
  private aiPlanner: AIPlanner;

  private isListening: boolean = false;
  private isProcessingCommand: boolean = false;
  private lastExecutedCommand: string = "";
  private lastExecutedTimestamp: number = 0;

  private pendingConfirmationStep: ActionStep | null = null;
  private pendingCandidates: SemanticElement[] = [];
  private lastCommandText: string = "";
  private lastResultText: string = "";

  constructor() {
    this.discovery = new ElementDiscovery();
    this.analyzer = new PageAnalyzer(this.discovery);
    this.labeler = new ElementLabeler(this.discovery);
    this.actionEngine = new ActionEngine(this.discovery);
    this.loginAssistant = new LoginAssistant(this.discovery, this.actionEngine, this.settings);
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

    // 4. Global Spacebar Voice Activation Shortcut (when not actively typing inside input fields)
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.code === "Space" && this.settings.spacebarActivation) {
        const activeEl = document.activeElement as HTMLElement | null;
        const isInput = activeEl && (
          activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable ||
          activeEl.getAttribute("role") === "textbox" ||
          activeEl.closest("#voxnav-root")?.querySelector("input:focus")
        );

        if (!isInput) {
          e.preventDefault(); // Stop webpage from scrolling down on spacebar
          this.toggleListening();
        }
      }
    });

    // 5. Update element index
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
    this.loginAssistant.updateSettings(this.settings);

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
      return true;
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
    this.isListening = true;
    // CRITICAL: Do NOT speak "Listening" via TTS here, as the mic will hear it and glitch into a loop!
    this.speechEngine.start();
  }

  public stopListening(): void {
    this.isListening = false;
    this.speechEngine.stop();
    this.overlay.updateStatus("idle");
  }

  private handleListeningStateChange(listening: boolean): void {
    this.isListening = listening;
    this.overlay.updateStatus(listening ? "listening" : "idle");
  }

  private handleSpeechTranscript(transcript: string, isFinal: boolean): void {
    // 1. Guard against speech synthesis echo loop
    if (tts.isCurrentlySpeaking()) {
      return;
    }

    this.overlay.setTranscript(transcript);

    // 2. Only process final utterances
    if (isFinal) {
      this.handleCommand(transcript);
    }
  }

  private handleSpeechError(errorMsg: string): void {
    this.overlay.updateStatus("error", errorMsg);
  }

  public toggleNumberedMode(): boolean {
    const elements = this.analyzer.refresh();
    const isActive = this.labeler.toggle(elements);
    this.overlay.setNumbersActive(isActive);

    if (isActive) {
      this.overlay.updateStatus("done", "Numbers visible");
    } else {
      this.overlay.updateStatus("idle");
    }
    return isActive;
  }

  /**
   * Main Command Execution Pipeline with deduplication and state safety.
   */
  public async handleCommand(rawUtterance: string): Promise<void> {
    if (!rawUtterance || !rawUtterance.trim()) return;

    const cleanInput = rawUtterance.trim();

    // Deduplication check: ignore identical commands within 1.4s
    const now = Date.now();
    if (cleanInput.toLowerCase() === this.lastExecutedCommand.toLowerCase() && now - this.lastExecutedTimestamp < 1400) {
      return;
    }

    if (this.isProcessingCommand) {
      return;
    }

    this.isProcessingCommand = true;
    this.lastExecutedCommand = cleanInput;
    this.lastExecutedTimestamp = now;
    this.lastCommandText = cleanInput;

    this.overlay.updateStatus("understanding");
    this.overlay.setTranscript(cleanInput);

    try {
      // 0. Check if LoginAssistant is in an active credential dialogue
      if (this.loginAssistant.isHandlingLogin()) {
        const reply = await this.loginAssistant.handleLoginDialogue(cleanInput);
        this.finishCommand(reply);
        return;
      }

      // 1. Check for Pending High-Impact Confirmation
      if (this.pendingConfirmationStep) {
        if (/^(confirm|yes|proceed|sure|haan|thik ache)\b/i.test(cleanInput)) {
          const step = this.pendingConfirmationStep;
          this.pendingConfirmationStep = null;
          this.overlay.updateStatus("executing", step.description);
          this.actionEngine.executeStep(step);
          this.finishCommand(`Confirmed: ${step.description}`);
          return;
        } else {
          this.pendingConfirmationStep = null;
          this.finishCommand("Action cancelled.");
          return;
        }
      }

      // 2. Check for Pending Disambiguation Candidates
      if (this.pendingCandidates.length > 0) {
        const chosenNum = parseInt(cleanInput.replace(/\D/g, ""), 10);
        if (chosenNum >= 1 && chosenNum <= this.pendingCandidates.length) {
          const selected = this.pendingCandidates[chosenNum - 1];
          this.pendingCandidates = [];
          this.labeler.hide();
          this.overlay.updateStatus("executing", `Item ${chosenNum}`);
          const el = this.discovery.getElementById(selected.id);
          if (el) {
            this.actionEngine.clickElement(el);
            this.finishCommand(`Clicked option ${chosenNum}`);
          }
          return;
        }
      }

      // 3. Parse Command with Natural Language Engine
      const parsed = CommandParser.parse(cleanInput);

      // 4. Handle System / Accessibility Metacommands
      if (parsed.intent === "LOGIN_ASSIST") {
        const reply = await this.loginAssistant.startLoginAssist();
        this.finishCommand(reply);
        return;
      }
      if (parsed.intent === "START_DEMO") {
        await this.startInteractiveDemo();
        return;
      }
      if (parsed.intent === "HELP") {
        const helpMsg = "Try: click login, open pricing, scroll down, show numbers, or search.";
        this.finishCommand(helpMsg);
        return;
      }
      if (parsed.intent === "SHOW_NUMBERS") {
        this.labeler.show(this.analyzer.refresh());
        this.overlay.setNumbersActive(true);
        this.finishCommand("Numbers visible");
        return;
      }
      if (parsed.intent === "HIDE_NUMBERS") {
        this.labeler.hide();
        this.overlay.setNumbersActive(false);
        this.finishCommand("Numbers hidden");
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
            this.finishCommand(`Clicked #${parsed.targetNumber}`);
            return;
          }
        } else {
          this.finishCommand(`Badge #${parsed.targetNumber} not found.`);
          return;
        }
      }

      // 6. Browser Tab Controls
      if (["NEW_TAB", "CLOSE_TAB", "NEXT_TAB", "PREVIOUS_TAB"].includes(parsed.intent)) {
        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: "VOXNAV_TAB_ACTION", action: parsed.intent });
          this.finishCommand(`Tab: ${parsed.intent.toLowerCase().replace("_", " ")}`);
          return;
        }
      }

      // 7. Reading & Describing Accessibility
      if (parsed.intent === "READ_PAGE" || parsed.intent === "DESCRIBE_PAGE") {
        const outline = this.analyzer.getSpokenPageOutline();
        this.finishCommand(outline);
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
        this.finishCommand(`Navigating: ${parsed.intent.toLowerCase()}`);
        return;
      }

      // 10. Search Queries
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
            this.finishCommand(`Searching: "${parsed.value}"`);
            return;
          }
        } else {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(parsed.value)}`, "_blank");
          this.finishCommand(`Searching: "${parsed.value}"`);
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
              this.finishCommand(`Cleared ${best.text || "input"}`);
            } else {
              this.actionEngine.typeIntoElement(domEl, parsed.value || "");
              this.finishCommand(`Entered "${parsed.value}"`);
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
          const prompt = "Ready to submit. Say 'Confirm' to proceed.";
          this.overlay.updateStatus("ambiguous", "Say 'Confirm'");
          tts.speak(prompt);
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

        if (matches.length === 1 || (matches.length > 1 && matches[0].score - matches[1].score > 0.22)) {
          const best = matches[0].element;
          const domEl = this.discovery.getElementById(best.id);

          if (domEl) {
            const step: ActionStep = {
              type: "CLICK",
              targetId: best.id,
              description: `Click ${best.text || "target"}`
            };

            // High-impact safety check
            if (this.settings.requireHighImpactConfirmation && ActionValidator.isHighImpactAction(step, best.text)) {
              this.pendingConfirmationStep = step;
              const prompt = `Ready to ${best.text}. Say 'Confirm' to proceed.`;
              this.overlay.updateStatus("ambiguous", "Say 'Confirm'");
              tts.speak(prompt);
              return;
            }

            this.overlay.updateStatus("executing", `Clicking ${best.text.slice(0, 15) || "button"}`);
            this.actionEngine.clickElement(domEl);
            this.finishCommand(`Clicked "${best.text.slice(0, 20) || "element"}"`);
            return;
          }
        } else if (matches.length > 1) {
          // Disambiguation
          this.pendingCandidates = matches.slice(0, 3).map((m) => m.element);
          this.labeler.show(this.pendingCandidates);
          this.overlay.updateStatus("ambiguous", `Say 1 to ${this.pendingCandidates.length}`);
          tts.speak(`Found ${this.pendingCandidates.length} matches. Say 1, 2, or 3.`);
          return;
        }
      }

      // 14. Fallback to AI Planner
      if (this.settings.aiAssistance && this.settings.aiProvider !== "offline") {
        this.overlay.updateStatus("understanding", "AI planning");
        const compact = this.analyzer.getCompactRepresentation(25);
        const aiPlan = await this.aiPlanner.planWithAI(parsed, compact, document.title);

        if (aiPlan && aiPlan.actions.length > 0) {
          for (const action of aiPlan.actions) {
            this.actionEngine.executeStep(action);
          }
          this.finishCommand(aiPlan.feedbackMessage || "Action executed");
          return;
        }
      }

      // 15. Unresolved Target
      this.finishCommand(`No match found for "${cleanInput.slice(0, 24)}"`);
    } finally {
      this.isProcessingCommand = false;
    }
  }

  private finishCommand(feedback: string): void {
    this.lastResultText = feedback;
    this.overlay.updateStatus("done", feedback);

    if (this.settings.voiceFeedback) {
      tts.speak(feedback);
    }
  }

  /**
   * Hackathon Interactive Demo Mode
   */
  public async startInteractiveDemo(): Promise<void> {
    this.overlay.show();
    this.overlay.updateStatus("understanding", "Starting Demo");
    tts.speak("Welcome to VoxNav demonstration.");

    await new Promise((r) => setTimeout(r, 1600));

    // Step 1: Element Analysis & Numbered Overlay
    this.overlay.updateStatus("executing", "Step 1: Numbering elements");
    const elements = this.analyzer.refresh();
    this.labeler.show(elements);

    await new Promise((r) => setTimeout(r, 2000));

    // Step 2: Simulated Spoken Command
    this.overlay.setTranscript("Scroll down a little");
    this.overlay.updateStatus("executing", "Step 2: Scrolling");
    this.actionEngine.scroll("DOWN", "SMALL");

    await new Promise((r) => setTimeout(r, 1800));

    // Step 3: Highlight Target & Action
    this.overlay.setTranscript("Highlighting primary target");
    this.labeler.highlightBadge(1);
    this.overlay.updateStatus("done", "Ready! Speak any command.");
  }
}

// Auto-instantiate on webpage load
if (typeof window !== "undefined") {
  (window as any).__voxnav_instance = new VoxNavContentApp();
}
