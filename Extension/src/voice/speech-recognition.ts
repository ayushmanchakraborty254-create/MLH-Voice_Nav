/**
 * VoxNav - Speech Recognition Engine
 * Modular abstraction layer supporting Web Speech API with smooth restart handling and echo filtering.
 */

import { tts } from "./text-to-speech";

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
  private restartTimer: any = null;

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
        // Echo filter: ignore microphone input if TTS audio is currently speaking
        if (tts.isCurrentlySpeaking()) {
          return;
        }

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

        if (error === "no-speech") {
          // Normal silence timeout in Chrome, continue listening seamlessly
          return;
        }

        if (error === "aborted") {
          return;
        }

        let humanMessage = "Speech recognition error occurred.";
        switch (error) {
          case "not-allowed":
            humanMessage = "Microphone access blocked. Click the lock icon in the address bar to allow microphone.";
            this.shouldRestart = false;
            break;
          case "audio-capture":
            humanMessage = "Microphone unavailable or in use by another application.";
            this.shouldRestart = false;
            break;
          case "network":
            humanMessage = "Speech network connection dropped.";
            break;
          default:
            humanMessage = `Speech recognition error: ${error}`;
        }

        if (!this.shouldRestart) {
          this.callbacks.onListeningStateChange(false);
          this.callbacks.onError(humanMessage, error);
        }
      };

      this.recognition.onend = () => {
        // Only notify UI of idle state if user deliberately stopped or error occurred
        if (!this.shouldRestart) {
          this.isListening = false;
          this.callbacks.onListeningStateChange(false);
          return;
        }

        // Seamless auto-reconnect without flickering the UI
        clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          if (this.shouldRestart) {
            try {
              this.recognition.start();
            } catch (e) {
              // Device busy or already started; retry with backoff
              setTimeout(() => {
                if (this.shouldRestart) {
                  try { this.recognition.start(); } catch (err) {}
                }
              }, 400);
            }
          }
        }, 150);
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

    this.shouldRestart = true;
    clearTimeout(this.restartTimer);

    if (this.isListening) return;

    try {
      this.recognition.start();
    } catch (e) {
      // If already started, ensure state is flagged
      this.isListening = true;
      this.callbacks.onListeningStateChange(true);
    }
  }

  public stop(): void {
    this.shouldRestart = false;
    clearTimeout(this.restartTimer);
    if (this.recognition) {
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
    clearTimeout(this.restartTimer);
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
