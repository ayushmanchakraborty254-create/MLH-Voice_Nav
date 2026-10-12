import { DOMScanner } from "./domScanner";
import { ActionExecutor } from "./actionExecutor";
import { SpeechPipeline } from "./speechPipeline";
import { AIEngine } from "./aiEngine";
import { DOMSnapshot, PlannedAction, SupportedLang, VoiceDOMConfig } from "./types";

export class VoiceDOM {
  private config: VoiceDOMConfig;
  public scanner: DOMScanner;
  public executor: ActionExecutor;
  public speech: SpeechPipeline;
  public ai: AIEngine;
  public currentLang: SupportedLang = "en";

  constructor(config: VoiceDOMConfig = {}) {
    this.config = config;
    this.scanner = new DOMScanner();
    this.executor = new ActionExecutor();
    this.speech = new SpeechPipeline();
    this.ai = new AIEngine(config);
    this.currentLang = config.defaultLang || "en";
  }

  public async processVoiceQuery(query: string): Promise<{ action: PlannedAction; result: any }> {
    const snapshot = DOMScanner.scanPage();
    const plannedAction = await this.ai.planAction(query, snapshot, this.currentLang);
    const result = await ActionExecutor.execute(plannedAction);
    
    if (plannedAction.explanation) {
      await this.speech.speak(plannedAction.explanation, this.currentLang);
    }
    return { action: plannedAction, result };
  }
}

export * from "./types";
export * from "./domScanner";
export * from "./actionExecutor";
export * from "./speechPipeline";
export * from "./aiEngine";
