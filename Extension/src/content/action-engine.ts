/**
 * VoxNav - Action Engine
 * Safely executes DOM actions with synthetic event dispatch and visual ripple feedback.
 */

import { ElementDiscovery } from "./element-discovery";
import { ActionStep } from "../shared/types";
import { ActionValidator } from "../shared/safety";

export class ActionEngine {
  private discovery: ElementDiscovery;

  constructor(discovery: ElementDiscovery) {
    this.discovery = discovery;
  }

  /**
   * Highlights target element on page with an animated focus halo.
   */
  public highlightElement(el: HTMLElement, color: string = "#2563EB", durationMs: number = 1200): void {
    const originalOutline = el.style.outline;
    const originalTransition = el.style.transition;
    const originalBoxShadow = el.style.boxShadow;

    el.style.transition = "all 0.25s ease-in-out";
    el.style.outline = `3px solid ${color}`;
    el.style.boxShadow = `0 0 16px ${color}88`;

    setTimeout(() => {
      el.style.outline = originalOutline;
      el.style.boxShadow = originalBoxShadow;
      el.style.transition = originalTransition;
    }, durationMs);
  }

  /**
   * Dispatches full mouse & pointer sequence to ensure click events register in modern frameworks.
   */
  public clickElement(el: HTMLElement): boolean {
    if (!el) return false;

    // Smoothly scroll into view if out of viewport
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    this.highlightElement(el, "#16A34A");

    // Standard focus
    try {
      el.focus();
    } catch (e) {
      // ignore
    }

    // Dispatch pointer events for modern SPAs, then fire native el.click()
    try {
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
      
      // Native el.click() triggers the browser's exact navigation and handlers ONCE without duplicate tabs
      el.click();
    } catch (e) {
      // Fallback if el.click() throws
      const evt = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
        buttons: 1
      });
      el.dispatchEvent(evt);
    }

    return true;
  }

  public doubleClickElement(el: HTMLElement): boolean {
    if (!el) return false;
    this.clickElement(el);
    const evt = new MouseEvent("dblclick", { view: window, bubbles: true, cancelable: true });
    el.dispatchEvent(evt);
    return true;
  }

  public hoverElement(el: HTMLElement): boolean {
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    this.highlightElement(el, "#F59E0B");

    const events = ["pointerenter", "mouseenter", "pointerover", "mouseover"];
    events.forEach((type) => {
      el.dispatchEvent(new MouseEvent(type, { view: window, bubbles: true, cancelable: true }));
    });
    return true;
  }

  /**
   * Types text into input/textarea, compatible with React/Vue synthetic event models.
   */
  public typeIntoElement(el: HTMLElement, textToType: string, append: boolean = false): boolean {
    if (!el) return false;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    this.highlightElement(el, "#2563EB");
    el.focus();

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const currentValue = append ? el.value : "";
      const newValue = currentValue + textToType;

      // Use prototype setter to trigger React/Vue internal trackers
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;

      if (el instanceof HTMLInputElement && nativeInputValueSetter) {
        nativeInputValueSetter.call(el, newValue);
      } else if (el instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(el, newValue);
      } else {
        el.value = newValue;
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } else if (el.isContentEditable) {
      if (!append) el.innerText = "";
      el.innerText += textToType;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }

    return false;
  }

  public clearElement(el: HTMLElement): boolean {
    if (!el) return false;
    return this.typeIntoElement(el, "", false);
  }

  public selectOption(el: HTMLElement, optionTextOrValue: string): boolean {
    if (!(el instanceof HTMLSelectElement)) return false;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    this.highlightElement(el);

    const query = optionTextOrValue.toLowerCase();
    let matchedOption: HTMLOptionElement | null = null;

    for (let i = 0; i < el.options.length; i++) {
      const opt = el.options[i];
      if (
        opt.text.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query)
      ) {
        matchedOption = opt;
        break;
      }
    }

    if (matchedOption) {
      el.value = matchedOption.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    return false;
  }

  public setCheckbox(el: HTMLElement, checked: boolean): boolean {
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      this.highlightElement(el);
      el.checked = checked;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }

  public submitForm(el?: HTMLElement): boolean {
    const form = el instanceof HTMLFormElement ? el : el?.closest("form") || document.querySelector("form");
    if (form) {
      this.highlightElement(form, "#16A34A");
      const submitBtn = form.querySelector<HTMLElement>("button[type='submit'], input[type='submit']");
      if (submitBtn) {
        return this.clickElement(submitBtn);
      } else {
        form.requestSubmit();
        return true;
      }
    }
    return false;
  }

  public scroll(direction: "UP" | "DOWN" | "TOP" | "BOTTOM", amount: "SMALL" | "MEDIUM" | "LARGE" = "MEDIUM"): boolean {
    let delta = 450;
    if (amount === "SMALL") delta = 200;
    if (amount === "LARGE") delta = window.innerHeight * 0.85;

    switch (direction) {
      case "DOWN":
        window.scrollBy({ top: delta, behavior: "smooth" });
        return true;
      case "UP":
        window.scrollBy({ top: -delta, behavior: "smooth" });
        return true;
      case "TOP":
        window.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      case "BOTTOM":
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        return true;
    }
  }

  /**
   * Executes a single ActionStep safely.
   */
  public executeStep(step: ActionStep): boolean {
    if (!ActionValidator.isAllowedIntent(step.type)) {
      console.warn("[VoxNav Safety] Blocked unallowed action:", step.type);
      return false;
    }

    let targetEl: HTMLElement | undefined;
    if (step.targetId) {
      targetEl = this.discovery.getElementById(step.targetId);
    } else if (step.targetSelector) {
      targetEl = document.querySelector<HTMLElement>(step.targetSelector) || undefined;
    }

    switch (step.type) {
      case "CLICK":
        return targetEl ? this.clickElement(targetEl) : false;
      case "DOUBLE_CLICK":
        return targetEl ? this.doubleClickElement(targetEl) : false;
      case "FOCUS":
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
          targetEl.focus();
          this.highlightElement(targetEl);
          return true;
        }
        return false;
      case "HOVER":
        return targetEl ? this.hoverElement(targetEl) : false;
      case "TYPE":
        return targetEl ? this.typeIntoElement(targetEl, step.value || "") : false;
      case "CLEAR":
        return targetEl ? this.clearElement(targetEl) : false;
      case "SUBMIT":
        return this.submitForm(targetEl);
      case "CHECK":
        return targetEl ? this.setCheckbox(targetEl, true) : false;
      case "UNCHECK":
        return targetEl ? this.setCheckbox(targetEl, false) : false;
      case "SELECT":
        return targetEl ? this.selectOption(targetEl, step.value || "") : false;
      case "SCROLL_DOWN":
        return this.scroll("DOWN", "MEDIUM");
      case "SCROLL_UP":
        return this.scroll("UP", "MEDIUM");
      case "SCROLL_TOP":
        return this.scroll("TOP");
      case "SCROLL_BOTTOM":
        return this.scroll("BOTTOM");
      case "PAGE_DOWN":
        return this.scroll("DOWN", "LARGE");
      case "PAGE_UP":
        return this.scroll("UP", "LARGE");
      case "BACK":
        window.history.back();
        return true;
      case "FORWARD":
        window.history.forward();
        return true;
      case "REFRESH":
        window.location.reload();
        return true;
      case "HOME":
        window.location.href = window.location.origin;
        return true;
      default:
        return false;
    }
  }
}
