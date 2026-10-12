import { SupportedLang } from "./types";

export class SpeechPipeline {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private silenceTimer: any = null;
  private currentTranscript: string = "";

  constructor() {
    if (typeof window !== "undefined") {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        this.recognition = new SR();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
      }
    }
  }

  public isSupported(): boolean {
    return typeof window !== "undefined" && this.recognition !== null;
  }

  public startListening(
    lang: SupportedLang = "en",
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onStatusChange: (isListening: boolean, err?: string) => void
  ): void {
    if (!this.recognition) {
      onStatusChange(false, "Web Speech API not supported in this browser.");
      return;
    }

    this.stopSpeaking();
    this.stopListening();

    const langMap: Record<SupportedLang, string> = {
      en: "en-IN",
      bn: "bn-IN",
      mr: "mr-IN",
      hi: "hi-IN"
    };
    this.recognition.lang = langMap[lang] || "en-IN";
    this.currentTranscript = "";

    const resetTimer = () => {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        if (this.currentTranscript.trim()) {
          const finalCandidate = this.currentTranscript.trim();
          this.stopListening();
          onFinal(finalCandidate);
        }
      }, 1200);
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      onStatusChange(true);
    };

    this.recognition.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      const combined = (final + interim).trim();
      if (combined) {
        this.currentTranscript = combined;
        onInterim(combined);
        resetTimer();
      }
    };

    this.recognition.onerror = (e: any) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        onStatusChange(false, e.error);
      }
    };

    this.recognition.onend = () => {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.isListening = false;
      onStatusChange(false);
      if (this.currentTranscript.trim()) {
        const text = this.currentTranscript.trim();
        this.currentTranscript = "";
        onFinal(text);
      }
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      this.isListening = false;
      onStatusChange(false, e.message);
    }
  }

  public stopListening(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.recognition && this.isListening) {
      try { this.recognition.stop(); } catch (e) {}
      this.isListening = false;
    }
  }

  public speak(text: string, lang: SupportedLang = "en"): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !text) {
        resolve();
        return;
      }

      this.stopSpeaking();
      this.isSpeaking = true;

      const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`~[\]()]/g, "").trim());
      const langMap: Record<SupportedLang, string> = {
        en: "en-IN",
        bn: "bn-IN",
        mr: "mr-IN",
        hi: "hi-IN"
      };
      utterance.lang = langMap[lang] || "en-IN";
      utterance.rate = 1.0;

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }
}
