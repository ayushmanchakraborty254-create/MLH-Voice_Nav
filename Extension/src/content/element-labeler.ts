/**
 * VoxNav - Element Labeler (Numbered Navigation Mode)
 * Renders non-invasive, accessible numbered badges over interactive elements for zero-friction voice targetting.
 */

import { ElementDiscovery } from "./element-discovery";
import { SemanticElement } from "../shared/types";
import { throttle } from "../shared/utils";

export class ElementLabeler {
  private discovery: ElementDiscovery;
  private container: HTMLDivElement | null = null;
  private isVisible: boolean = false;
  private labelMap: Map<number, SemanticElement> = new Map();
  private onScrollOrResize: () => void;

  constructor(discovery: ElementDiscovery) {
    this.discovery = discovery;
    this.onScrollOrResize = throttle(() => {
      if (this.isVisible) {
        this.updatePositions();
      }
    }, 100);

    window.addEventListener("scroll", this.onScrollOrResize, { passive: true });
    window.addEventListener("resize", this.onScrollOrResize, { passive: true });
  }

  private ensureContainer(): HTMLDivElement {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "voxnav-labels-container";
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147483646;
        display: none;
      `;
      document.documentElement.appendChild(this.container);
    }
    return this.container;
  }

  public show(elements: SemanticElement[]): void {
    const container = this.ensureContainer();
    container.innerHTML = "";
    this.labelMap.clear();

    let displayIndex = 1;

    elements.forEach((el) => {
      const domEl = this.discovery.getElementById(el.id);
      if (!domEl || !this.discovery.isVisible(domEl)) return;

      const rect = domEl.getBoundingClientRect();
      // Only label visible elements in viewport
      if (
        rect.top >= window.innerHeight ||
        rect.bottom <= 0 ||
        rect.left >= window.innerWidth ||
        rect.right <= 0
      ) {
        return;
      }

      const badgeNum = displayIndex++;
      this.labelMap.set(badgeNum, el);

      const badge = document.createElement("div");
      badge.className = "voxnav-badge";
      badge.dataset.voxnavNumber = String(badgeNum);
      badge.textContent = String(badgeNum);

      badge.style.cssText = `
        position: absolute;
        top: ${Math.max(2, rect.top - 8)}px;
        left: ${Math.max(2, rect.left - 4)}px;
        background: #2563EB;
        color: #FFFFFF;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        padding: 2px 5px;
        border-radius: 4px;
        border: 1px solid #1D4ED8;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
        transform: translateZ(0);
        transition: transform 0.15s ease, background 0.15s ease;
      `;

      container.appendChild(badge);
    });

    container.style.display = "block";
    this.isVisible = true;
  }

  public updatePositions(): void {
    if (!this.container || !this.isVisible) return;

    const badges = this.container.querySelectorAll<HTMLDivElement>(".voxnav-badge");
    badges.forEach((badge) => {
      const num = parseInt(badge.dataset.voxnavNumber || "0", 10);
      const el = this.labelMap.get(num);
      if (!el) return;

      const domEl = this.discovery.getElementById(el.id);
      if (!domEl || !this.discovery.isVisible(domEl)) {
        badge.style.display = "none";
        return;
      }

      const rect = domEl.getBoundingClientRect();
      if (
        rect.top >= window.innerHeight ||
        rect.bottom <= 0 ||
        rect.left >= window.innerWidth ||
        rect.right <= 0
      ) {
        badge.style.display = "none";
      } else {
        badge.style.display = "block";
        badge.style.top = `${Math.max(2, rect.top - 8)}px`;
        badge.style.left = `${Math.max(2, rect.left - 4)}px`;
      }
    });
  }

  public hide(): void {
    if (this.container) {
      this.container.style.display = "none";
      this.container.innerHTML = "";
    }
    this.labelMap.clear();
    this.isVisible = false;
  }

  public toggle(elements: SemanticElement[]): boolean {
    if (this.isVisible) {
      this.hide();
      return false;
    } else {
      this.show(elements);
      return true;
    }
  }

  public getElementByNumber(number: number): SemanticElement | undefined {
    return this.labelMap.get(number);
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  public highlightBadge(number: number): void {
    if (!this.container) return;
    const badge = this.container.querySelector<HTMLDivElement>(`[data-voxnav-number="${number}"]`);
    if (badge) {
      badge.style.background = "#16A34A";
      badge.style.transform = "scale(1.3)";
      setTimeout(() => {
        badge.style.background = "#2563EB";
        badge.style.transform = "scale(1)";
      }, 800);
    }
  }
}
