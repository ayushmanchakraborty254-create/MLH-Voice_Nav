import { DOMElementSummary, DOMSnapshot } from "./types";

export class DOMScanner {
  public static scanPage(): DOMSnapshot {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return { pageTitle: "", url: "", path: "", headings: [], interactiveElements: [], forms: [] };
    }

    const activeModal = this.getActiveModalContainer();
    const scanRoot = activeModal || document.body;

    const pageTitle = document.title || "";
    const url = window.location.href;
    const path = window.location.pathname;

    const headings: string[] = [];
    scanRoot.querySelectorAll("h1, h2, h3, h4").forEach((h) => {
      const text = (h.textContent || "").trim();
      if (text && text.length > 2 && text.length < 100 && this.isVisible(h as HTMLElement)) {
        headings.push(text);
      }
    });

    const interactiveElements: DOMElementSummary[] = [];
    const query = `button, a[href], input, select, textarea, [role="button"], [role="checkbox"], [role="tab"], [role="link"], [tabindex="0"], label`;
    const rawElements = Array.from(scanRoot.querySelectorAll(query));
    let counter = 1;

    for (const el of rawElements) {
      const htmlEl = el as HTMLElement;
      if (!this.isVisible(htmlEl)) continue;
      if (htmlEl.id === "voicedom-root" || htmlEl.closest("#voicedom-root") || htmlEl.closest("#voicedom-extension-overlay")) continue;

      let elementId = htmlEl.id;
      if (!elementId) {
        elementId = `vdom-${counter++}`;
        htmlEl.setAttribute("data-vdom-id", elementId);
      }

      const tag = htmlEl.tagName.toLowerCase();
      const type = htmlEl.getAttribute("type") || (tag === "textarea" ? "textarea" : tag === "select" ? "select" : "text");
      let text = (htmlEl.innerText || htmlEl.textContent || "").trim().slice(0, 80);

      // Associated label resolution for checkboxes / radio buttons
      let associatedLabel = "";
      if (tag === "input" && (type === "checkbox" || type === "radio")) {
        if (htmlEl.id) {
          const lbl = document.querySelector(`label[for="${htmlEl.id}"]`);
          if (lbl) associatedLabel = (lbl.textContent || "").trim();
        }
        if (!associatedLabel && htmlEl.parentElement && htmlEl.parentElement.tagName.toLowerCase() === "label") {
          associatedLabel = (htmlEl.parentElement.textContent || "").trim();
        }
        if (!associatedLabel && htmlEl.nextSibling && htmlEl.nextSibling.textContent) {
          associatedLabel = htmlEl.nextSibling.textContent.trim();
        }
      }

      const ariaLabel = htmlEl.getAttribute("aria-label") || "";
      const placeholder = htmlEl.getAttribute("placeholder") || "";
      const name = htmlEl.getAttribute("name") || "";
      const role = htmlEl.getAttribute("role") || "";

      let options: string[] | undefined = undefined;
      if (tag === "select") {
        options = Array.from((htmlEl as HTMLSelectElement).options).map(o => o.text.trim());
      }

      let value = "";
      if (tag === "input" || tag === "textarea" || tag === "select") {
        value = (htmlEl as HTMLInputElement).value || "";
      }

      const isInput = ["input", "select", "textarea"].includes(tag);
      const isClickable = !isInput || type === "submit" || type === "button" || type === "checkbox" || type === "radio";
      const selector = htmlEl.id ? `#${htmlEl.id}` : `[data-vdom-id="${elementId}"]`;

      interactiveElements.push({
        id: elementId,
        tag,
        type,
        text: text || associatedLabel,
        ariaLabel,
        placeholder,
        name,
        role,
        selector,
        isClickable,
        isInput,
        value,
        options
      });
    }

    const forms: DOMSnapshot["forms"] = [];
    scanRoot.querySelectorAll("form").forEach((form, idx) => {
      const formId = form.id || `form-${idx + 1}`;
      const formFields = interactiveElements.filter(item => {
        const node = document.querySelector(item.selector);
        return node && form.contains(node);
      });
      if (formFields.length > 0) {
        forms.push({ id: formId, action: form.getAttribute("action") || undefined, fields: formFields });
      }
    });

    return {
      pageTitle,
      url,
      path,
      headings: headings.slice(0, 8),
      interactiveElements: interactiveElements.slice(0, 60),
      forms
    };
  }

  public static getActiveModalContainer(): HTMLElement | null {
    if (typeof document === "undefined") return null;

    const modalSelectors = [
      'dialog[open]',
      '[role="dialog"]',
      '[aria-modal="true"]',
      '.modal.show',
      '.modal.active',
      '.modal:not([style*="display: none"])',
      '.MuiDialog-root',
      '.chakra-modal__content',
      '.ant-modal-content',
      '[class*="modal-dialog"]',
      '[class*="dialog-content"]',
      '[class*="popup"]',
      '.swal2-container'
    ];

    for (const sel of modalSelectors) {
      const found = document.querySelectorAll(sel);
      for (const m of found) {
        const htmlM = m as HTMLElement;
        if (this.isVisible(htmlM) && htmlM.id !== "voicedom-root" && !htmlM.closest("#voicedom-root")) {
          return htmlM;
        }
      }
    }

    const allDivs = Array.from(document.querySelectorAll('div[style*="z-index"], section[style*="z-index"]')) as HTMLElement[];
    for (const div of allDivs) {
      if (div.id === "voicedom-root" || div.closest("#voicedom-root")) continue;
      const zIndex = parseInt(window.getComputedStyle(div).zIndex, 10);
      if (zIndex >= 100 && this.isVisible(div)) {
        return div;
      }
    }

    return null;
  }

  public static isVisible(el: HTMLElement): boolean {
    if (!el.offsetWidth && !el.offsetHeight && !el.getClientRects().length) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }
}
