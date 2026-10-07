/**
 * VoxNav - Speech Recognition Engine
 * Modular abstraction layer supporting Web Speech API with pluggable adapter for Whisper or remote STT.
 */

export interface SpeechEngineCallbacks {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (errorMessage: string, errorType?: string) => void;
  onListeningStateChange: (isListening: boolean) => void;
}

export interface ISpeechEngine {
  start(): void;
  stop(): void;
  abort(): void;
  setLanguage(lang: string): void;
  isAvailable(): boolean;
}

export class WebSpeechEngine implements ISpeechEngine {
  private recognition: any = null;
  private isListening: boolean = false;
  private currentLanguage: string = "en-US";
  private callbacks: SpeechEngineCallbacks;
  private shouldRestart: boolean = false;

  constructor(callbacks: SpeechEngineCallbacks) {
    this.callbacks = callbacks;
    this.initRecognition();
  }

  private initRecognition(): void {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

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

      this.recognition.onresult = (event: any) => {
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

      this.recognition.onerror = (event: any) => {
        const error = event.error;
        let humanMessage = "Speech recognition error occurred.";

        switch (error) {
          case "not-allowed":
            humanMessage = "Microphone access was denied. Please allow microphone permissions in Chrome.";
            this.shouldRestart = false;
            break;
          case "no-speech":
            // Normal timeout when quiet, keep listening if active
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

        // Auto-restart if user still wants voice mode active
        if (this.shouldRestart) {
          try {
            this.recognition.start();
          } catch (e) {
            // Already started or terminated
          }
        }
      };
    } catch (e) {
      console.error("[VoxNav Speech] Error initializing recognition:", e);
    }
  }

  public setLanguage(lang: string): void {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public start(): void {
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

  public stop(): void {
    this.shouldRestart = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
    this.callbacks.onListeningStateChange(false);
  }

  public abort(): void {
    this.shouldRestart = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
    this.callbacks.onListeningStateChange(false);
  }

  public isAvailable(): boolean {
    return this.recognition !== null;
  }
}
