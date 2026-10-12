import { VoiceDOM } from "@voicedom/core";
import { SupportedLang } from "@voicedom/core";

export class VoiceWidget {
  private vdom: VoiceDOM;
  private container: HTMLElement | null = null;
  private isListening: boolean = false;
  private statusText: HTMLElement | null = null;
  private orbElement: HTMLElement | null = null;
  private micBtn: HTMLElement | null = null;
  private transcriptEl: HTMLElement | null = null;

  constructor(apiKey?: string, defaultLang: SupportedLang = "en") {
    this.vdom = new VoiceDOM({
      apiKey: apiKey || (typeof window !== "undefined" && (window as any).__VOICEDOM_API_KEY) || "",
      defaultLang
    });
    this.injectWidget();
  }

  private injectWidget() {
    if (typeof document === "undefined") return;

    // Check if already injected
    if (document.getElementById("voicedom-root")) return;

    const root = document.createElement("div");
    root.id = "voicedom-root";
    root.innerHTML = `
      <style>
        #voicedom-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999999;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
          pointer-events: none;
        }
        #voicedom-card {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 25px rgba(16, 185, 129, 0.2);
          border-radius: 18px;
          padding: 14px 18px;
          color: #f8fafc;
          width: 320px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: auto;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: bottom right;
        }
        .vdom-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .vdom-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #10b981;
        }
        .vdom-badge {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 10px;
        }
        .vdom-lang-select {
          display: flex;
          gap: 4px;
          background: rgba(0, 0, 0, 0.3);
          padding: 3px;
          border-radius: 8px;
        }
        .vdom-lang-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 600;
          padding: 3px 6px;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .vdom-lang-btn.active {
          background: #10b981;
          color: #ffffff;
        }
        .vdom-transcript {
          font-size: 12px;
          color: #e2e8f0;
          min-height: 24px;
          max-height: 48px;
          overflow-y: auto;
          line-height: 1.4;
          font-style: italic;
        }
        .vdom-status {
          font-size: 11px;
          color: #38bdf8;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .vdom-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 8px;
        }
        .vdom-mic-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: white;
          padding: 7px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .vdom-mic-btn.listening {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          animation: vdom-pulse 1.5s infinite;
        }
        @keyframes vdom-pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      </style>

      <div id="voicedom-container">
        <div id="voicedom-card">
          <div class="vdom-header">
            <div class="vdom-title">
              <span>🎙️ VoiceDOM</span>
              <span class="vdom-badge">AI AGENT</span>
            </div>
            <div class="vdom-lang-select">
              <button class="vdom-lang-btn active" data-lang="en">EN</button>
              <button class="vdom-lang-btn" data-lang="bn">বাংলা</button>
              <button class="vdom-lang-btn" data-lang="mr">मराठी</button>
              <button class="vdom-lang-btn" data-lang="hi">हिन्दी</button>
            </div>
          </div>
          <div class="vdom-transcript" id="vdom-transcript-box">Say anything to navigate or fill forms...</div>
          <div class="vdom-status" id="vdom-status-box">● Standby (Whisper + Qwen Ready)</div>
          <div class="vdom-controls">
            <span style="font-size: 10px; color: #64748b;">Universal DOM Autopilot</span>
            <button class="vdom-mic-btn" id="vdom-mic-trigger">
              <span>🎤</span> <span id="vdom-mic-label">Speak</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    this.container = root;
    this.statusText = document.getElementById("vdom-status-box");
    this.transcriptEl = document.getElementById("vdom-transcript-box");
    this.micBtn = document.getElementById("vdom-mic-trigger");

    this.bindEvents();
  }

  private bindEvents() {
    if (!this.container) return;

    // Language buttons
    this.container.querySelectorAll(".vdom-lang-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.container?.querySelectorAll(".vdom-lang-btn").forEach(b => b.classList.remove("active"));
        const target = e.target as HTMLElement;
        target.classList.add("active");
        const lang = target.getAttribute("data-lang") as SupportedLang;
        this.vdom.currentLang = lang;
        if (this.statusText) this.statusText.innerText = `● Language: ${target.innerText}`;
      });
    });

    // Mic button
    this.micBtn?.addEventListener("click", () => {
      this.toggleListening();
    });
  }

  private toggleListening() {
    if (this.isListening) {
      this.vdom.speech.stopListening();
      this.isListening = false;
      this.updateMicUI(false);
    } else {
      this.isListening = true;
      this.updateMicUI(true);

      this.vdom.speech.startListening(
        this.vdom.currentLang,
        (interim) => {
          if (this.transcriptEl) this.transcriptEl.innerText = interim;
        },
        async (finalText) => {
          if (this.transcriptEl) this.transcriptEl.innerText = `"${finalText}"`;
          if (this.statusText) this.statusText.innerText = "⚡ Thinking with Qwen 2.5/3.8...";
          
          try {
            const res = await this.vdom.processVoiceQuery(finalText);
            if (this.statusText) this.statusText.innerText = `✅ ${res.action.explanation || "Completed"}`;
          } catch (err: any) {
            if (this.statusText) this.statusText.innerText = `⚠️ Error: ${err.message}`;
          }
          this.isListening = false;
          this.updateMicUI(false);
        },
        (listening, err) => {
          this.isListening = listening;
          this.updateMicUI(listening);
          if (err && this.statusText) {
            this.statusText.innerText = `⚠️ Mic: ${err}`;
          }
        }
      );
    }
  }

  private updateMicUI(listening: boolean) {
    if (!this.micBtn) return;
    const label = document.getElementById("vdom-mic-label");
    if (listening) {
      this.micBtn.classList.add("listening");
      if (label) label.innerText = "Listening...";
      if (this.statusText) this.statusText.innerText = "🔴 Listening to your voice...";
    } else {
      this.micBtn.classList.remove("listening");
      if (label) label.innerText = "Speak";
    }
  }
}

