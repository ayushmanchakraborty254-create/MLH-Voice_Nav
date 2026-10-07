/**
 * VoxNav - Smart Interactive Login & Credential Assistant
 * Detects login forms, asks for credentials interactively, triggers browser/password-manager autofill,
 * and facilitates zero-friction authentication.
 */

import { ActionEngine } from "./action-engine";
import { ElementDiscovery } from "./element-discovery";
import { VoxNavSettings } from "../shared/types";
import { tts } from "../voice/text-to-speech";

export interface LoginFormElements {
  form?: HTMLFormElement;
  usernameField?: HTMLInputElement;
  passwordField?: HTMLInputElement;
  submitButton?: HTMLElement;
  rememberMeCheckbox?: HTMLInputElement;
}

export type LoginStep = "idle" | "awaiting_username" | "awaiting_password" | "ready_to_submit";

export class LoginAssistant {
  private discovery: ElementDiscovery;
  private actionEngine: ActionEngine;
  private settings: VoxNavSettings;
  private currentStep: LoginStep = "idle";
  private detectedElements: LoginFormElements | null = null;

  constructor(discovery: ElementDiscovery, actionEngine: ActionEngine, settings: VoxNavSettings) {
    this.discovery = discovery;
    this.actionEngine = actionEngine;
    this.settings = settings;
  }

  public updateSettings(settings: VoxNavSettings): void {
    this.settings = settings;
  }

  /**
   * Scans the DOM for standard login form fields.
   */
  public detectLoginForm(): LoginFormElements | null {
    const passwordInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]')).filter(
      (el) => this.discovery.isVisible(el)
    );

    if (passwordInputs.length === 0) {
      return null;
    }

    const passwordField = passwordInputs[0];
    const form = passwordField.closest("form") || undefined;

    // Search for username/email input near the password field
    const candidateInputs = form
      ? Array.from(form.querySelectorAll<HTMLInputElement>("input:not([type='hidden']):not([type='password']):not([type='checkbox']):not([type='radio'])"))
      : Array.from(document.querySelectorAll<HTMLInputElement>("input:not([type='hidden']):not([type='password'])"));

    const usernameField = candidateInputs.find((input) => {
      if (!this.discovery.isVisible(input)) return false;
      const type = (input.type || "").toLowerCase();
      const name = (input.name || "").toLowerCase();
      const id = (input.id || "").toLowerCase();
      const autocomplete = (input.autocomplete || "").toLowerCase();
      const placeholder = (input.placeholder || "").toLowerCase();

      return (
        type === "email" ||
        autocomplete.includes("username") ||
        autocomplete.includes("email") ||
        name.includes("user") ||
        name.includes("email") ||
        name.includes("login") ||
        id.includes("user") ||
        id.includes("email") ||
        id.includes("login") ||
        placeholder.includes("email") ||
        placeholder.includes("user") ||
        placeholder.includes("phone")
      );
    }) || candidateInputs[0];

    // Find submit button
    let submitButton: HTMLElement | undefined;
    if (form) {
      submitButton = form.querySelector<HTMLElement>("button[type='submit'], input[type='submit']") || undefined;
    }
    if (!submitButton) {
      const allButtons = Array.from(document.querySelectorAll<HTMLElement>("button, a, input[type='button']"));
      submitButton = allButtons.find((btn) => {
        if (!this.discovery.isVisible(btn)) return false;
        const text = (btn.textContent || (btn as HTMLInputElement).value || "").toLowerCase();
        return text.includes("log in") || text.includes("sign in") || text.includes("login") || text.includes("signin") || text.includes("submit");
      });
    }

    // Find remember me checkbox if present
    const checkbox = form
      ? form.querySelector<HTMLInputElement>("input[type='checkbox']") || undefined
      : undefined;

    this.detectedElements = {
      form,
      usernameField,
      passwordField,
      submitButton,
      rememberMeCheckbox: checkbox
    };

    return this.detectedElements;
  }

  public isHandlingLogin(): boolean {
    return this.currentStep !== "idle";
  }

  public getCurrentStep(): LoginStep {
    return this.currentStep;
  }

  public reset(): void {
    this.currentStep = "idle";
    this.detectedElements = null;
  }

  /**
   * Initiates interactive credential flow.
   */
  public async startLoginAssist(): Promise<string> {
    const fields = this.detectLoginForm();
    if (!fields || !fields.passwordField) {
      return "No active login form detected on this page.";
    }

    // Check if we have a saved profile in extension settings
    const saved = this.settings.savedProfile;
    const defaultUser = saved?.email || saved?.username;

    if (defaultUser && fields.usernameField) {
      // Auto-fill username from saved profile
      this.actionEngine.typeIntoElement(fields.usernameField, defaultUser);
      this.focusPasswordAndTriggerAutofill(fields.passwordField);
      this.currentStep = "ready_to_submit";

      const msg = `Filled username as ${defaultUser} and activated password manager. Say 'Submit' when ready.`;
      tts.speak(msg);
      return msg;
    }

    if (fields.usernameField) {
      this.actionEngine.highlightElement(fields.usernameField, "#2563EB", 2500);
      fields.usernameField.focus();
      this.currentStep = "awaiting_username";

      const msg = "Login form detected. What is your email or username?";
      tts.speak(msg);
      return msg;
    } else {
      this.focusPasswordAndTriggerAutofill(fields.passwordField);
      this.currentStep = "ready_to_submit";
      const msg = "Password field focused. Choose your credentials from your password manager, then say 'Submit'.";
      tts.speak(msg);
      return msg;
    }
  }

  /**
   * Handles user's spoken response during the login interaction.
   */
  public async handleLoginDialogue(utterance: string): Promise<string> {
    const clean = utterance.trim();
    const fields = this.detectedElements || this.detectLoginForm();

    if (!fields) {
      this.reset();
      return "Login form lost.";
    }

    if (this.currentStep === "awaiting_username") {
      // Clean utterance: "my email is test@domain.com" -> extract actual text
      let usernameValue = clean
        .replace(/^(my (email|username|user) is|it is|it's|fill|use)\s+/i, "")
        .replace(/\s+at\s+/gi, "@")
        .replace(/\s+dot\s+/gi, ".")
        .trim();

      if (fields.usernameField) {
        this.actionEngine.typeIntoElement(fields.usernameField, usernameValue);
      }

      if (fields.passwordField) {
        this.focusPasswordAndTriggerAutofill(fields.passwordField);
        this.currentStep = "ready_to_submit";

        const msg = `Username set. Password field active. Select your saved password from your password manager or say 'Submit'.`;
        tts.speak(msg);
        return msg;
      } else {
        this.currentStep = "ready_to_submit";
        return "Username filled. Ready to submit.";
      }
    }

    if (this.currentStep === "ready_to_submit") {
      if (/^(submit|login|sign in|log in|proceed|go|haan|yes)\b/i.test(clean)) {
        if (fields.submitButton) {
          this.actionEngine.clickElement(fields.submitButton);
        } else if (fields.form) {
          fields.form.requestSubmit();
        }
        this.reset();
        const msg = "Submitting login credentials.";
        tts.speak(msg);
        return msg;
      } else if (/^(cancel|stop|abort|nah|no)\b/i.test(clean)) {
        this.reset();
        return "Login cancelled.";
      }
    }

    return "Say 'Submit' to log in, or 'Cancel'.";
  }

  /**
   * Focuses password field and triggers native browser credential manager prompt.
   */
  private focusPasswordAndTriggerAutofill(passwordEl: HTMLInputElement): void {
    this.actionEngine.highlightElement(passwordEl, "#16A34A", 3000);
    passwordEl.focus();

    // Dispatch click and focus events to prompt browser / Bitwarden / 1Password / Chrome Autofill overlay
    passwordEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    passwordEl.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    // Try modern Credential Management API if available (prompts browser saved password popup)
    if (typeof navigator !== "undefined" && (navigator as any).credentials?.get) {
      try {
        (navigator as any).credentials.get({
          password: true,
          mediation: "optional"
        }).then((cred: any) => {
          if (cred && cred.id && cred.password && this.detectedElements?.usernameField) {
            this.actionEngine.typeIntoElement(this.detectedElements.usernameField, cred.id);
            this.actionEngine.typeIntoElement(passwordEl, cred.password);
          }
        }).catch(() => {
          // Normal fallback: browser native password overlay handles it
        });
      } catch (e) {
        // ignore
      }
    }
  }
}
