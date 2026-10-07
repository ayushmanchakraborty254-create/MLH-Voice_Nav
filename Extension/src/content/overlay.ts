/**
 * VoxNav - Floating Voice UI Overlay
 * Modern, non-obtrusive, draggable floating control rendered inside an isolated Shadow DOM.
 */

import { VoiceStatus } from "../shared/types";

export interface OverlayCallbacks {
  onToggleMic: () => void;
  onSubmitTextCommand: (text: string) => void;
  onToggleNumbers: () => void;
  onClose: () => void;
}

export class FloatingOverlay {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private callbacks: OverlayCallbacks;
  private isVisible: boolean = false;
  private isNumbersActive: boolean = false;

  // DOM Elements inside Shadow
  private micButton: HTMLButtonElement | null = null;
  private statusBadge: HTMLSpanElement | null = null;
  private transcriptText: HTMLDivElement | null = null;
  private commandInput: HTMLInputElement | null = null;
  private numberButton: HTMLButtonElement | null = null;
  private containerEl: HTMLDivElement | null = null;

  constructor(callbacks: OverlayCallbacks) {
    this.callbacks = callbacks;
  }

  public init(): void {
    if (this.host) return;

    this.host = document.createElement("div");
    this.host.id = "voxnav-root";
    this.host.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      pointer-events: none;
    `;

    this.shadow = this.host.attachShadow({ mode: "open" });
    this.render();
    document.documentElement.appendChild(this.host);
    this.setupEvents();
    this.setupDraggable();
    this.isVisible = true;
  }

  private render(): void {
    if (!this.shadow) return;

    const style = document.createElement("style");
    style.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      .voxnav-container {
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        padding: 12px 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
        color: #F8FAFC;
        min-width: 320px;
        max-width: 440px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
      }

      .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: grab;
      }

      .header-row:active {
        cursor: grabbing;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: -0.2px;
        color: #FFFFFF;
      }

      .brand-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #2563EB;
      }

      .status-pill {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.1);
        color: #94A3B8;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;
      }

      .status-pill.listening {
        background: rgba(239, 68, 68, 0.2);
        color: #F87171;
        border: 1px solid rgba(239, 68, 68, 0.4);
      }

      .status-pill.understanding {
        background: rgba(37, 99, 235, 0.2);
        color: #60A5FA;
        border: 1px solid rgba(37, 99, 235, 0.4);
      }

      .status-pill.done {
        background: rgba(22, 163, 74, 0.2);
        color: #4ADE80;
        border: 1px solid rgba(22, 163, 74, 0.4);
      }

      .status-pill.ambiguous {
        background: rgba(245, 158, 11, 0.2);
        color: #FBBF24;
        border: 1px solid rgba(245, 158, 11, 0.4);
      }

      .controls-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
      }

      .mic-btn {
        background: #2563EB;
        color: #FFFFFF;
        border: none;
        border-radius: 10px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .mic-btn:hover {
        background: #1D4ED8;
      }

      .mic-btn.active {
        background: #DC2626;
        box-shadow: 0 0 14px rgba(220, 38, 38, 0.6);
        animation: pulse 1.5s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.85; }
      }

      .command-form {
        display: flex;
        flex: 1;
        gap: 4px;
      }

      .command-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        padding: 7px 10px;
        color: #FFFFFF;
        font-size: 12px;
        outline: none;
        transition: border-color 0.2s;
      }

      .command-input::placeholder {
        color: #64748B;
      }

      .command-input:focus {
        border-color: #2563EB;
        background: rgba(255, 255, 255, 0.12);
      }

      .action-btn {
        background: rgba(255, 255, 255, 0.08);
        color: #94A3B8;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .action-btn:hover {
        background: rgba(255, 255, 255, 0.16);
        color: #FFFFFF;
      }

      .action-btn.active {
        background: #2563EB;
        color: #FFFFFF;
        border-color: #3B82F6;
      }

      .transcript-box {
        margin-top: 8px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12px;
        color: #CBD5E1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 28px;
        word-break: break-word;
      }

      .transcript-text {
        font-style: italic;
        color: #93C5FD;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: #64748B;
        font-size: 14px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .close-btn:hover {
        color: #EF4444;
      }
    `;

    this.shadow.appendChild(style);

    const container = document.createElement("div");
    container.className = "voxnav-container";
    container.innerHTML = `
      <div class="header-row">
        <div class="brand">
          <div class="brand-dot"></div>
          <span>VoxNav</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="status-pill" id="voxnav-status">● Ready</span>
          <button class="action-btn" id="voxnav-num-toggle" title="Toggle Numbered Navigation">123</button>
          <button class="close-btn" id="voxnav-close" title="Minimize">✕</button>
        </div>
      </div>

      <div class="controls-row">
        <button class="mic-btn" id="voxnav-mic">
          <span>🎙️</span>
          <span id="voxnav-mic-text">Speak</span>
        </button>
        <form class="command-form" id="voxnav-form">
          <input type="text" class="command-input" id="voxnav-input" placeholder="Say or type command (e.g. 'Click login')" autocomplete="off" />
        </form>
      </div>

      <div class="transcript-box" id="voxnav-transcript-box" style="display: none;">
        <span class="transcript-text" id="voxnav-transcript">""</span>
      </div>
    `;

    this.shadow.appendChild(container);

    this.containerEl = container;
    this.micButton = this.shadow.getElementById("voxnav-mic") as HTMLButtonElement;
    this.statusBadge = this.shadow.getElementById("voxnav-status") as HTMLSpanElement;
    this.transcriptText = this.shadow.getElementById("voxnav-transcript") as HTMLDivElement;
    this.commandInput = this.shadow.getElementById("voxnav-input") as HTMLInputElement;
    this.numberButton = this.shadow.getElementById("voxnav-num-toggle") as HTMLButtonElement;
  }

  private setupEvents(): void {
    if (!this.shadow) return;

    this.micButton?.addEventListener("click", () => {
      this.callbacks.onToggleMic();
    });

    this.numberButton?.addEventListener("click", () => {
      this.isNumbersActive = !this.isNumbersActive;
      this.numberButton?.classList.toggle("active", this.isNumbersActive);
      this.callbacks.onToggleNumbers();
    });

    const form = this.shadow.getElementById("voxnav-form");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = this.commandInput?.value.trim();
      if (val) {
        this.callbacks.onSubmitTextCommand(val);
        if (this.commandInput) this.commandInput.value = "";
      }
    });

    const closeBtn = this.shadow.getElementById("voxnav-close");
    closeBtn?.addEventListener("click", () => {
      this.hide();
      this.callbacks.onClose();
    });
  }

  private setupDraggable(): void {
    if (!this.containerEl || !this.host) return;

    const handle = this.containerEl.querySelector(".header-row") as HTMLElement;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialRight = 24;
    let initialBottom = 24;

    handle.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.host!.getBoundingClientRect();
      initialRight = window.innerWidth - rect.right;
      initialBottom = window.innerHeight - rect.bottom;
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging || !this.host) return;
      const dx = startX - e.clientX;
      const dy = startY - e.clientY;
      this.host.style.right = `${Math.max(10, initialRight + dx)}px`;
      this.host.style.bottom = `${Math.max(10, initialBottom + dy)}px`;
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  public updateStatus(status: VoiceStatus, detailText?: string): void {
    if (!this.statusBadge || !this.micButton) return;

    this.statusBadge.className = `status-pill ${status}`;
    const micTextEl = this.shadow?.getElementById("voxnav-mic-text");

    switch (status) {
      case "listening":
        this.statusBadge.textContent = "● Listening...";
        this.micButton.classList.add("active");
        if (micTextEl) micTextEl.textContent = "Stop";
        break;
      case "understanding":
        this.statusBadge.textContent = "◌ Understanding...";
        this.micButton.classList.remove("active");
        if (micTextEl) micTextEl.textContent = "Speak";
        break;
      case "executing":
        this.statusBadge.textContent = `→ ${detailText || "Executing"}`;
        break;
      case "done":
        this.statusBadge.textContent = `✓ ${detailText || "Done"}`;
        this.micButton.classList.remove("active");
        if (micTextEl) micTextEl.textContent = "Speak";
        break;
      case "ambiguous":
        this.statusBadge.textContent = `⚠ ${detailText || "Which one?"}`;
        break;
      case "error":
        this.statusBadge.textContent = `✕ ${detailText || "Error"}`;
        this.micButton.classList.remove("active");
        if (micTextEl) micTextEl.textContent = "Speak";
        break;
      case "idle":
      default:
        this.statusBadge.textContent = "● Ready";
        this.micButton.classList.remove("active");
        if (micTextEl) micTextEl.textContent = "Speak";
    }
  }

  public setTranscript(text: string): void {
    const box = this.shadow?.getElementById("voxnav-transcript-box");
    if (!this.transcriptText || !box) return;

    if (text) {
      this.transcriptText.textContent = `"${text}"`;
      box.style.display = "flex";
    } else {
      box.style.display = "none";
    }
  }

  public setNumbersActive(active: boolean): void {
    this.isNumbersActive = active;
    this.numberButton?.classList.toggle("active", active);
  }

  public show(): void {
    if (this.host) {
      this.host.style.display = "block";
      this.isVisible = true;
    } else {
      this.init();
    }
  }

  public hide(): void {
    if (this.host) {
      this.host.style.display = "none";
      this.isVisible = false;
    }
  }

  public toggle(): boolean {
    if (this.isVisible) {
      this.hide();
      return false;
    } else {
      this.show();
      return true;
    }
  }
}
