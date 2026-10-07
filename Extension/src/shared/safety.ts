/**
 * VoxNav - Safety & Validation Layer
 * Ensures zero arbitrary code execution and guards high-impact actions.
 */

import { ActionStep, IntentType } from "./types";
import { ALLOWED_INTENTS, HIGH_IMPACT_KEYWORDS } from "./constants";

export class ActionValidator {
  /**
   * Validates whether an intent is within the secure whitelist.
   */
  public static isAllowedIntent(intent: string): intent is IntentType {
    return ALLOWED_INTENTS.has(intent as IntentType);
  }

  /**
   * Detects whether an action involves sensitive/irreversible operations.
   */
  public static isHighImpactAction(action: ActionStep, targetText?: string): boolean {
    if (action.highImpact) return true;

    const checkText = `${action.description} ${targetText || ""} ${action.value || ""}`.toLowerCase();

    for (const keyword of HIGH_IMPACT_KEYWORDS) {
      if (checkText.includes(keyword)) {
        return true;
      }
    }

    // Checking if form submission has payment / deletion indicators
    if (action.type === "SUBMIT") {
      if (checkText.includes("pay") || checkText.includes("card") || checkText.includes("delete") || checkText.includes("order")) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sanitizes text to prevent injection or unexpected control sequences.
   */
  public static sanitizeInput(input: string): string {
    return input.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  }

  /**
   * Validates each step in an AI action plan before execution.
   */
  public static validateActionPlan(actions: ActionStep[]): { valid: boolean; error?: string } {
    if (!Array.isArray(actions)) {
      return { valid: false, error: "Action plan must be an array of steps." };
    }

    if (actions.length > 5) {
      return { valid: false, error: "Exceeded maximum allowed steps per command (5)." };
    }

    for (const action of actions) {
      if (!this.isAllowedIntent(action.type)) {
        return { valid: false, error: `Unauthorized action type: ${action.type}` };
      }

      if (action.type === "TYPE" && typeof action.value !== "string") {
        return { valid: false, error: "TYPE action requires a string value." };
      }
    }

    return { valid: true };
  }
}
