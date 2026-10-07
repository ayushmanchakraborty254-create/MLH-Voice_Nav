/**
 * VoxNav - Text to Speech Engine
 * Abstraction layer for voice feedback
 */

export class TextToSpeechEngine {
  private enabled: boolean = true;
  private rate: number = 1.0;
  private pitch: number = 1.0;
  private preferredLang: string = "en-US";
  private synth: SpeechSynthesis | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public setConfig(enabled: boolean, rate: number = 1.0, pitch: number = 1.0, lang: string = "en-US") {
    this.enabled = enabled;
    this.rate = Math.max(0.7, Math.min(rate, 1.6));
    this.pitch = Math.max(0.8, Math.min(pitch, 1.4));
    this.preferredLang = lang;
  }

  public speak(text: string, onEnd?: () => void): void {
    if (!this.enabled || !text) {
      if (onEnd) onEnd();
      return;
    }

    if (!this.synth) {
      // Fallback: Notify background if window.speechSynthesis is unavailable
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: "VOXNAV_SPEAK", text });
      }
      if (onEnd) onEnd();
      return;
    }

    try {
      this.synth.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.lang = this.preferredLang;

      // Select voice matching preferred language if available
      const voices = this.synth.getVoices();
      const matchingVoice = voices.find(v => v.lang.startsWith(this.preferredLang.slice(0, 2)));
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

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const tts = new TextToSpeechEngine();
