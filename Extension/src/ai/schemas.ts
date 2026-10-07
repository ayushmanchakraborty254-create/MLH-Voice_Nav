/**
 * VoxNav - AI Schemas
 * Type validation and response schemas for AI Action Plans.
 */

import { ActionStep } from "../shared/types";
import { ActionValidator } from "../shared/safety";

export interface AIActionResponse {
  reasoning: string;
  actions: ActionStep[];
  feedbackMessage?: string;
}

export function validateAIResponse(json: any): { valid: boolean; data?: AIActionResponse; error?: string } {
  if (!json || typeof json !== "object") {
    return { valid: false, error: "AI response is not a valid JSON object." };
  }

  if (!Array.isArray(json.actions)) {
    return { valid: false, error: "AI response must contain an 'actions' array." };
  }

  const validatedSteps: ActionStep[] = [];

  for (const item of json.actions) {
    if (!item.type || typeof item.type !== "string") {
      return { valid: false, error: "Action step missing valid 'type'." };
    }

    if (!ActionValidator.isAllowedIntent(item.type)) {
      return { valid: false, error: `Action '${item.type}' is not in the allowed intent whitelist.` };
    }

    validatedSteps.push({
      type: item.type,
      targetId: typeof item.targetId === "number" ? item.targetId : undefined,
      targetSelector: typeof item.targetSelector === "string" ? item.targetSelector : undefined,
      value: typeof item.value === "string" ? ActionValidator.sanitizeInput(item.value) : undefined,
      description: typeof item.description === "string" ? item.description : item.type
    });
  }

  return {
    valid: true,
    data: {
      reasoning: typeof json.reasoning === "string" ? json.reasoning : "",
      actions: validatedSteps,
      feedbackMessage: typeof json.feedbackMessage === "string" ? json.feedbackMessage : undefined
    }
  };
}
