/**
 * VoxNav - AI Planner Engine
 * Orchestrates offline-first semantic execution with optional cloud LLM reasoning.
 */

import { ParsedCommand, ActionPlan, SemanticElement, VoxNavSettings } from "../shared/types";
import { SYSTEM_PLANNER_PROMPT, buildPlannerUserPrompt } from "./prompts";
import { validateAIResponse, AIActionResponse } from "./schemas";
import { ActionValidator } from "../shared/safety";

export class AIPlanner {
  private settings: VoxNavSettings;

  constructor(settings: VoxNavSettings) {
    this.settings = settings;
  }

  public updateSettings(settings: VoxNavSettings): void {
    this.settings = settings;
  }

  /**
   * Resolves complex commands using configured LLM provider (Groq / OpenAI / Ollama).
   */
  public async planWithAI(
    command: ParsedCommand,
    compactElements: any[],
    pageTitle: string
  ): Promise<AIActionResponse | null> {
    if (this.settings.aiProvider === "offline" || !this.settings.aiAssistance) {
      return null;
    }

    const apiKey = this.settings.aiApiKey;
    const provider = this.settings.aiProvider;

    let endpoint = "";
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let model = this.settings.aiModel || "llama-3.3-70b-versatile";

    if (provider === "groq") {
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
      if (!apiKey) return null;
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (provider === "openai") {
      endpoint = "https://api.openai.com/v1/chat/completions";
      model = this.settings.aiModel || "gpt-4o-mini";
      if (!apiKey) return null;
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (provider === "ollama") {
      endpoint = this.settings.aiEndpoint || "http://localhost:11434/api/generate";
    }

    try {
      const userPrompt = buildPlannerUserPrompt(command.raw, compactElements, pageTitle);
      let requestBody: any;

      if (provider === "ollama") {
        requestBody = {
          model: this.settings.aiModel || "qwen2.5:latest",
          system: SYSTEM_PLANNER_PROMPT,
          prompt: userPrompt,
          stream: false,
          format: "json"
        };
      } else {
        requestBody = {
          model,
          messages: [
            { role: "system", content: SYSTEM_PLANNER_PROMPT },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        console.warn("[VoxNav AI] Request failed:", res.status, res.statusText);
        return null;
      }

      const data = await res.json();
      let rawContent = "";
      if (provider === "ollama") {
        rawContent = data.response;
      } else {
        rawContent = data.choices?.[0]?.message?.content || "";
      }

      const parsedJSON = JSON.parse(rawContent);
      const validation = validateAIResponse(parsedJSON);

      if (validation.valid && validation.data) {
        return validation.data;
      } else {
        console.warn("[VoxNav AI] Validation error:", validation.error);
        return null;
      }
    } catch (err) {
      console.warn("[VoxNav AI] Exception during LLM planning:", err);
      return null;
    }
  }
}
