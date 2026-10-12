import { PlannedAction } from "./types";

export class ActionExecutor {
  public static async execute(action: PlannedAction): Promise<{ success: boolean; message: string }> {
    try {
      switch (action.type) {
        case "CLICK":
          return await this.executeClick(action.selector);
        case "TYPE":
          return await this.executeType(action.selector, action.value || "");
        case "SELECT_OPTION":
          return await this.executeSelect(action.selector, action.value || "");
        case "AUTO_FILL":
          return await this.executeAutoFill(action.formData || {});
        case "SCROLL":
          return this.executeScroll(action.direction || "DOWN", action.amount || 400);
        case "NAVIGATE":
          return this.executeNavigate(action.targetUrl);
        case "HIGHLIGHT":
          return this.executeHighlight(action.selector, action.explanation);
        default:
          return { success: false, message: action.explanation || "Unknown action" };
      }
    } catch (err: any) {
      return { success: false, message: err.message || "Execution failed" };
    }
  }

  private static async executeClick(selector?: string): Promise<{ success: boolean; message: string }> {
    if (!selector) return { success: false, message: "No element specified to click" };
    const el = document.querySelector(selector) as HTMLElement;
    if (!el) return { success: false, message: `Element not found for selector ${selector}` };

    this.showRadarPulse(el, "Clicked");
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    await new Promise(r => setTimeout(r, 250));

    if (el.tagName.toLowerCase() === "input" && ((el as HTMLInputElement).type === "checkbox" || (el as HTMLInputElement).type === "radio")) {
      const inputEl = el as HTMLInputElement;
      inputEl.checked = !inputEl.checked;
      inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    }

    el.focus();
    el.click();
    return { success: true, message: `Clicked element ${selector}` };
  }

  private static async executeType(selector?: string, value: string = ""): Promise<{ success: boolean; message: string }> {
    if (!selector) return { success: false, message: "No input selector specified" };
    const el = document.querySelector(selector) as HTMLInputElement;
    if (!el) return { success: false, message: `Input element not found for selector ${selector}` };

    this.showRadarPulse(el, "Typing");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();

    try {
      const proto = window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) {
        desc.set.call(el, value);
      } else {
        el.value = value;
      }
    } catch (e) {
      el.value = value;
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { success: true, message: `Typed "${value}" into ${selector}` };
  }

  private static async executeSelect(selector?: string, optionValue: string = ""): Promise<{ success: boolean; message: string }> {
    if (!selector) return { success: false, message: "No select dropdown selector specified" };
    const el = document.querySelector(selector) as HTMLSelectElement;
    if (!el) return { success: false, message: `Select dropdown not found for selector ${selector}` };

    this.showRadarPulse(el, "Selected Option");
    let matched = false;
    const target = optionValue.toLowerCase().trim();

    for (let i = 0; i < el.options.length; i++) {
      const opt = el.options[i];
      if (opt.text.toLowerCase().includes(target) || opt.value.toLowerCase().includes(target)) {
        el.selectedIndex = i;
        matched = true;
        break;
      }
    }

    if (!matched && el.options.length > 0) {
      el.selectedIndex = 0;
    }

    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return { success: true, message: `Selected "${optionValue}" in ${selector}` };
  }

  private static async executeAutoFill(formData: Record<string, any>): Promise<{ success: boolean; message: string }> {
    const filledKeys: string[] = [];
    for (const [key, val] of Object.entries(formData)) {
      if (!val) continue;
      const selector = `input[name*="${key}" i], input[id*="${key}" i], input[placeholder*="${key}" i], textarea[name*="${key}" i]`;
      const el = document.querySelector(selector) as HTMLInputElement;
      if (el) {
        await this.executeType(selector, String(val));
        filledKeys.push(key);
      }
    }
    return { success: true, message: `Auto-filled form fields: ${filledKeys.join(", ")}` };
  }

  private static executeScroll(direction: "UP" | "DOWN" | "TOP" | "BOTTOM", amount: number = 400): { success: boolean; message: string } {
    if (direction === "TOP") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (direction === "BOTTOM") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } else if (direction === "UP") {
      window.scrollBy({ top: -amount, behavior: "smooth" });
    } else {
      window.scrollBy({ top: amount, behavior: "smooth" });
    }
    return { success: true, message: `Scrolled ${direction}` };
  }

  private static executeNavigate(targetUrl?: string): { success: boolean; message: string } {
    if (!targetUrl) return { success: false, message: "No URL specified for navigation" };
    window.location.href = targetUrl;
    return { success: true, message: `Navigating to ${targetUrl}` };
  }

  private static executeHighlight(selector?: string, label?: string): { success: boolean; message: string } {
    if (!selector) return { success: false, message: "No element specified to highlight" };
    const el = document.querySelector(selector) as HTMLElement;
    if (!el) return { success: false, message: `Element not found for selector ${selector}` };
    this.showRadarPulse(el, label || "Found Here");
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    return { success: true, message: `Highlighted ${selector}` };
  }

  private static showRadarPulse(el: HTMLElement, label?: string): void {
    el.style.outline = "3px solid #10b981";
    el.style.boxShadow = "0 0 24px rgba(16, 185, 129, 0.8)";
    el.style.transition = "all 0.3s ease";

    const rect = el.getBoundingClientRect();
    const pin = document.createElement("div");
    pin.style.position = "absolute";
    pin.style.zIndex = "2147483646";
    pin.style.background = "#10b981";
    pin.style.color = "#0f172a";
    pin.style.fontWeight = "700";
    pin.style.fontSize = "11px";
    pin.style.padding = "4px 8px";
    pin.style.borderRadius = "6px";
    pin.style.boxShadow = "0 4px 14px rgba(0,0,0,0.5)";
    pin.style.pointerEvents = "none";
    pin.style.top = `${window.scrollY + rect.top - 30}px`;
    pin.style.left = `${window.scrollX + rect.left}px`;
    pin.innerHTML = `📍 <span>${label || "Target"}</span>`;
    document.body.appendChild(pin);

    setTimeout(() => {
      el.style.outline = "";
      el.style.boxShadow = "";
      if (pin && pin.parentNode) pin.parentNode.removeChild(pin);
    }, 4500);
  }
}
