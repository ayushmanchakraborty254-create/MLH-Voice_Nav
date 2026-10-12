import { DOMSnapshot, PlannedAction, SupportedLang, VoiceDOMConfig } from "./types";

export class AIEngine {
  private config: VoiceDOMConfig;

  constructor(config: VoiceDOMConfig = {}) {
    this.config = {
      apiKey: config.apiKey || (typeof process !== "undefined" && process.env?.GROQ_API_KEY) || (typeof window !== "undefined" && (window as any).__VOICEDOM_API_KEY) || "",
      model: config.model || "qwen/qwen3.8-27b",
      defaultLang: config.defaultLang || "en",
      ...config
    };
  }

  public async planAction(userQuery: string, domSnapshot: DOMSnapshot, activeLang: SupportedLang = "en"): Promise<PlannedAction> {
    const cleanQuery = userQuery.trim().toLowerCase();

    if (cleanQuery.includes("scroll down") || cleanQuery.includes("নিচে নামো") || cleanQuery.includes("खाली जा")) {
      return { type: "SCROLL", direction: "DOWN", amount: 450, explanation: "Scrolling down", confidence: 0.99 };
    }
    if (cleanQuery.includes("scroll up") || cleanQuery.includes("উপরে ওঠো") || cleanQuery.includes("वर जा")) {
      return { type: "SCROLL", direction: "UP", amount: 450, explanation: "Scrolling up", confidence: 0.99 };
    }
    if (cleanQuery.includes("top of page") || cleanQuery.includes("সবার উপরে") || cleanQuery.includes("सगळ्यात वर")) {
      return { type: "SCROLL", direction: "TOP", explanation: "Scrolling to top", confidence: 0.99 };
    }

    if (!this.config.apiKey) {
      return this.fallbackLocalMatch(userQuery, domSnapshot);
    }

    try {
      const systemPrompt = `You are VoiceDOM: an autonomous Universal Web Navigation & Form Autopilot Agent.
Current Page Title: "${domSnapshot.pageTitle}"
URL: "${domSnapshot.url}"
Headings: ${JSON.stringify(domSnapshot.headings)}
Visible Interactive DOM Elements:
${JSON.stringify(domSnapshot.interactiveElements.map(e => ({ id: e.id, tag: e.tag, text: e.text, label: e.ariaLabel || e.placeholder || e.name, selector: e.selector, type: e.type, options: e.options })))}

Rules:
1. Analyze user speech in ANY language (English, Bengali বাংলা, Marathi मराठी, Hindi हिन्दी).
2. If user asks to click a button or link, find the best matching selector -> action: "CLICK".
3. If user gives form information (e.g. "My name is Ramesh, mobile 9876543210, register as buyer"), extract fields -> action: "AUTO_FILL", formData: {"name": "Ramesh", "phone": "9876543210", "role": "buyer"}.
4. If user asks to select an option, action: "SELECT_OPTION", selector: "<select>", value: "<option text>".
5. If user asks to navigate or change page, action: "NAVIGATE" or "CLICK".
6. Return JSON ONLY:
{
  "type": "CLICK" | "TYPE" | "AUTO_FILL" | "SELECT_OPTION" | "SCROLL" | "NAVIGATE" | "HIGHLIGHT" | "UNKNOWN",
  "selector": "<css selector or null>",
  "value": "<text to type or option text or null>",
  "formData": {"field": "val"} | null,
  "direction": "UP" | "DOWN" | "TOP" | "BOTTOM" | null,
  "explanation": "<short spoken confirmation reply in user language>",
  "confidence": 0.95
}`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `User Voice Command: "${userQuery}"` }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices[0]?.message?.content || "{}");
        return {
          type: parsed.type || "UNKNOWN",
          selector: parsed.selector || undefined,
          value: parsed.value || undefined,
          formData: parsed.formData || undefined,
          direction: parsed.direction || undefined,
          explanation: parsed.explanation || "Action executed",
          confidence: parsed.confidence || 0.95
        };
      }
    } catch (e) {
      console.warn("Groq AI Engine error, falling back to heuristic:", e);
    }

    return this.fallbackLocalMatch(userQuery, domSnapshot);
  }

  private fallbackLocalMatch(query: string, domSnapshot: DOMSnapshot): PlannedAction {
    const lower = query.toLowerCase();
    for (const el of domSnapshot.interactiveElements) {
      const matchText = (el.text + " " + (el.ariaLabel || "") + " " + (el.placeholder || "")).toLowerCase();
      if (matchText && (lower.includes(matchText) || matchText.includes(lower))) {
        return {
          type: el.isClickable ? "CLICK" : "HIGHLIGHT",
          selector: el.selector,
          explanation: `Selecting ${el.text || el.placeholder}`,
          confidence: 0.8
        };
      }
    }
    return {
      type: "UNKNOWN",
      explanation: "I could not find a matching element on this page.",
      confidence: 0.3
    };
  }
}
