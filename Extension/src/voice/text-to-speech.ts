/**
 * VoxNav - Text to Speech Engine
 * Abstraction layer for voice feedback with echo prevention
 */

export class TextToSpeechEngine {
  private enabled: boolean = true;
  private rate: number = 1.0;
  private pitch: number = 1.0;
  private preferredLang: string = "en-US";
  private synth: SpeechSynthesis | null = null;

  public isSpeaking: boolean = false;
  private lastSpokenTimestamp: number = 0;

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

  /**
   * Returns true while TTS is playing or within the 650ms reverberation window.
   * This is critical to prevent the microphone from picking up its own voice.
   */
  public isCurrentlySpeaking(): boolean {
    if (this.isSpeaking) return true;
    if (this.synth && this.synth.speaking) return true;
    if (Date.now() - this.lastSpokenTimestamp < 650) return true;
    return false;
  }

  public speak(text: string, onEnd?: () => void): void {
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

      this.isSpeaking = true;

      const finish = () => {
        this.isSpeaking = false;
        this.lastSpokenTimestamp = Date.now();
        if (onEnd) onEnd();
      };

      utterance.onend = finish;
      utterance.onerror = (e) => {
        console.warn("[VoxNav TTS] Speech error:", e);
        finish();
      };

      this.synth.speak(utterance);
    } catch (err) {
      console.warn("[VoxNav TTS] Exception during speech synthesis:", err);
      this.isSpeaking = false;
      this.lastSpokenTimestamp = Date.now();
      if (onEnd) onEnd();
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
    this.lastSpokenTimestamp = Date.now();
  }
}

export const tts = new TextToSpeechEngine();
