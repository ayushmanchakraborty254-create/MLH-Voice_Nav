/**
 * VoxNav - Element Discovery Engine
 * Identifies, inspects, and extracts semantic information from interactive DOM elements.
 */

import { SemanticElement, ElementType } from "../shared/types";
import { normalizeText } from "../shared/utils";

export class ElementDiscovery {
  private elementMap: Map<number, HTMLElement> = new Map();
  private nextId: number = 1;

  public reset(): void {
    this.elementMap.clear();
    this.nextId = 1;
  }

  public getElementById(id: number): HTMLElement | undefined {
    return this.elementMap.get(id);
  }

  /**
   * Checks whether an element is truly visible and interactable.
   */
  public isVisible(el: HTMLElement): boolean {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

    // Check hidden attribute or aria-hidden
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;

    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) < 0.05
    ) {
      return false;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    // Check if element has zero area or is scrolled completely off
    if (rect.bottom < 0 || rect.right < 0) return false;

    return true;
  }

  /**
   * Determines the semantic type of an element.
   */
  public getElementType(el: HTMLElement): ElementType {
    const tagName = el.tagName.toLowerCase();
    const role = el.getAttribute("role")?.toLowerCase();

    if (tagName === "button" || role === "button") return "button";
    if (tagName === "a" || role === "link") return "link";
    if (tagName === "select") return "select";
    if (tagName === "textarea") return "textarea";

    if (tagName === "input") {
      const type = (el as HTMLInputElement).type.toLowerCase();
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "search") return "search";
      if (type === "submit" || type === "button") return "button";
      return "input";
    }

    if (role === "tab") return "tab";
    if (role === "menuitem") return "menuitem";
    if (role === "checkbox") return "checkbox";
    if (role === "radio") return "radio";
    if (/^h[1-6]$/.test(tagName) || role === "heading") return "heading";

    if (el.getAttribute("contenteditable") === "true") return "textarea";

    return "generic";
  }

  /**
   * Extracts clean accessible text representation of an element.
   */
  public getElementText(el: HTMLElement): string {
    // 1. Check aria-label / aria-labelledby
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    const ariaLabelledBy = el.getAttribute("aria-labelledby");
    if (ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl && labelEl.textContent?.trim()) {
        return labelEl.textContent.trim();
      }
    }

    // 2. Check title / placeholder
    const title = el.getAttribute("title");
    if (title && title.trim()) return title.trim();

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.placeholder && el.placeholder.trim()) return el.placeholder.trim();
      if (el.value && el.value.trim() && el.type !== "password") return el.value.trim();
    }

    // 3. Check alt text on inner img (for icon buttons)
    const imgAlt = el.querySelector("img")?.getAttribute("alt");
    if (imgAlt && imgAlt.trim()) return imgAlt.trim();

    // 4. Check visible textContent
    const text = el.innerText || el.textContent || "";
    return text.replace(/\s+/g, " ").trim();
  }

  /**
   * Scans the document and discovers all relevant interactive semantic elements.
   */
  public discoverInteractiveElements(): SemanticElement[] {
    this.reset();

    const selectors = [
      "button",
      "a[href]",
      "input:not([type='hidden'])",
      "textarea",
      "select",
      "[role='button']",
      "[role='link']",
      "[role='tab']",
      "[role='menuitem']",
      "[role='checkbox']",
      "[role='radio']",
      "[contenteditable='true']",
      "summary",
      "[tabindex]:not([tabindex='-1'])"
    ].join(", ");

    const rawNodes = document.querySelectorAll<HTMLElement>(selectors);
    const discovered: SemanticElement[] = [];

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    rawNodes.forEach((node) => {
      // Avoid VoxNav's own shadow DOM or overlays
      if (node.closest("#voxnav-root") || node.id?.startsWith("voxnav")) {
        return;
      }

      if (!this.isVisible(node)) return;

      const rect = node.getBoundingClientRect();
      const inViewport =
        rect.top < viewportHeight &&
        rect.bottom > 0 &&
        rect.left < viewportWidth &&
        rect.right > 0;

      const type = this.getElementType(node);
      const text = this.getElementText(node);
      const ariaLabel = node.getAttribute("aria-label") || undefined;
      const placeholder = (node as any).placeholder || undefined;
      const title = node.getAttribute("title") || undefined;
      const role = node.getAttribute("role") || undefined;
      const name = (node as any).name || undefined;
      const href = (node as any).href || undefined;

      // Filter out empty useless elements without text or accessible name
      if (!text && !ariaLabel && !title && !placeholder && type !== "input" && type !== "select") {
        return;
      }

      const id = this.nextId++;
      this.elementMap.set(id, node);

      // Extract nearby heading/context
      let context: string | undefined;
      const parentForm = node.closest("form");
      if (parentForm) {
        const legend = parentForm.querySelector("legend, h2, h3");
        if (legend?.textContent) context = legend.textContent.trim().slice(0, 40);
      }

      discovered.push({
        id,
        type,
        text,
        ariaLabel,
        placeholder,
        title,
        role,
        name,
        href,
        disabled: (node as any).disabled || false,
        visible: true,
        inViewport,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        context
      });
    });

    return discovered;
  }
}
