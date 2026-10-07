/**
 * VoxNav - Natural Language Command Parser
 * Parses natural spoken utterances into strongly-typed Command objects without requiring rigid syntax.
 */

import { ParsedCommand, IntentType } from "../shared/types";
import { MultilingualEngine } from "./multilingual";
import { extractNumberFromText, normalizeText } from "../shared/utils";

export class CommandParser {
  /**
   * Main parsing method converting speech input to a structured ParsedCommand.
   */
  public static parse(rawUtterance: string): ParsedCommand {
    if (!rawUtterance || !rawUtterance.trim()) {
      return {
        raw: "",
        intent: "UNKNOWN",
        confidence: 0,
        language: "en"
      };
    }

    // 1. Multilingual preprocessing & normalization
    const normalized = MultilingualEngine.normalize(rawUtterance);
    const text = normalized.cleanedText;
    const lang = normalized.detectedLang;

    // --- Fast Confirmation / Cancellation Check ---
    if (/^(confirm|yes|proceed|sure|haan|thik ache|ha)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "CONFIRM", confidence: 0.99, language: lang };
    }
    if (/^(cancel|no|stop|abort|nah|na|bondho koro|roko)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "CANCEL", confidence: 0.99, language: lang };
    }

    // --- Demo Trigger ---
    if (/\b(start demo|run demo|demo mode|demonstrate)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "START_DEMO", confidence: 0.98, language: lang };
    }

    // --- Help Trigger ---
    if (/\b(help|what can i say|commands|how to use)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "HELP", confidence: 0.95, language: lang };
    }

    // --- Smart Login & Credentials Assistant ---
    if (/\b(log me in|login to my account|fill credentials|fill my credentials|fill login|help me login|autofill credentials|enter credentials|credentials bharo|login karo|log in koro)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "LOGIN_ASSIST", confidence: 0.98, language: lang };
    }

    // --- Numbered Mode Controls ---
    // e.g. "show numbers", "show navigation options", "turn on numbers", "numbers on"
    if (/\b(show numbers|show navigation|navigation options|display numbers|turn on numbers|number dekhao)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "SHOW_NUMBERS", confidence: 0.98, language: lang };
    }
    if (/\b(hide numbers|remove numbers|turn off numbers|number chupao|number bondho)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "HIDE_NUMBERS", confidence: 0.98, language: lang };
    }

    // --- Direct Number Target (e.g. "click 3", "number 5", "select 12", "3", "open 2") ---
    const directNumberMatch = text.match(/\b(?:click|open|select|press|choose|number)?\s*([0-9]+)\b/i);
    if (directNumberMatch && (text.length <= 15 || /^(click|open|select|press|choose|number)?\s*\d+$/i.test(text))) {
      const num = parseInt(directNumberMatch[1], 10);
      if (!isNaN(num)) {
        return {
          raw: rawUtterance,
          intent: "CLICK_NUMBER",
          targetNumber: num,
          confidence: 0.98,
          language: lang
        };
      }
    }
    // Also check for extracted spoken Indic/word number if short phrase
    if (normalized.extractedNumber && /^(click|open|select|choose|number)?\s*(one|two|three|four|five|six|seven|eight|nine|ten|ek|dui|tin|do|teen)\b/i.test(text)) {
      return {
        raw: rawUtterance,
        intent: "CLICK_NUMBER",
        targetNumber: normalized.extractedNumber,
        confidence: 0.95,
        language: lang
      };
    }

    // --- Tab Management ---
    if (/\b(new tab|open a new tab|create tab)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "NEW_TAB", confidence: 0.95, language: lang };
    }
    if (/\b(close tab|close this tab|exit tab)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "CLOSE_TAB", confidence: 0.95, language: lang };
    }
    if (/\b(next tab|switch to next tab)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "NEXT_TAB", confidence: 0.95, language: lang };
    }
    if (/\b(previous tab|prev tab)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "PREVIOUS_TAB", confidence: 0.95, language: lang };
    }

    // --- Navigation (Back / Forward / Refresh / Home) ---
    if (/\b(go back|previous page|back)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "BACK", confidence: 0.95, language: lang };
    }
    if (/\b(go forward|next page|forward)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "FORWARD", confidence: 0.95, language: lang };
    }
    if (/\b(refresh|reload|reload page|refresh the page)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "REFRESH", confidence: 0.95, language: lang };
    }
    if (/\b(go home|home page|homepage|home)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "HOME", confidence: 0.92, language: lang };
    }

    // --- Scrolling ---
    // e.g. "scroll down a little", "scroll down", "page down", "scroll up", "scroll to top"
    if (/\b(scroll to top|go to top|top of page|all the way up)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "SCROLL_TOP", direction: "TOP", confidence: 0.96, language: lang };
    }
    if (/\b(scroll to bottom|go to bottom|bottom of page|all the way down)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "SCROLL_BOTTOM", direction: "BOTTOM", confidence: 0.96, language: lang };
    }
    if (/\b(scroll down|down a little|move down|downward)\b/i.test(text)) {
      const isSmall = /\b(a little|slightly|bit|thoda|ektu)\b/i.test(text);
      return {
        raw: rawUtterance,
        intent: "SCROLL_DOWN",
        direction: "DOWN",
        amount: isSmall ? "SMALL" : "MEDIUM",
        confidence: 0.95,
        language: lang
      };
    }
    if (/\b(scroll up|up a little|move up|upward)\b/i.test(text)) {
      const isSmall = /\b(a little|slightly|bit|thoda|ektu)\b/i.test(text);
      return {
        raw: rawUtterance,
        intent: "SCROLL_UP",
        direction: "UP",
        amount: isSmall ? "SMALL" : "MEDIUM",
        confidence: 0.95,
        language: lang
      };
    }
    if (/\b(page down)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "PAGE_DOWN", direction: "DOWN", amount: "LARGE", confidence: 0.95, language: lang };
    }
    if (/\b(page up)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "PAGE_UP", direction: "UP", amount: "LARGE", confidence: 0.95, language: lang };
    }

    // --- Accessibility Reading & Describing ---
    if (/\b(read this page|read page|read out loud|speak page)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "READ_PAGE", confidence: 0.95, language: lang };
    }
    if (/\b(what is this page about|describe this page|summarize page|page summary)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "DESCRIBE_PAGE", confidence: 0.95, language: lang };
    }
    const readSecMatch = text.match(/\bread (?:the )?(?:section |heading )?(.+)\b/i);
    if (readSecMatch && !readSecMatch[1].includes("page")) {
      return { raw: rawUtterance, intent: "READ_SECTION", target: readSecMatch[1].trim(), confidence: 0.90, language: lang };
    }

    // --- Search Queries ---
    // e.g. "search for Python tutorials", "search laptops", "find hotels in Tokyo"
    const searchMatch = text.match(/\b(?:search for|search|look for|find)\s+(.+)/i);
    if (searchMatch) {
      const query = searchMatch[1].replace(/\b(on this page|in google)\b/i, "").trim();
      if (query) {
        return {
          raw: rawUtterance,
          intent: "SEARCH",
          value: query,
          confidence: 0.94,
          language: lang
        };
      }
    }

    // --- Form Filling & Typing ---
    // e.g. "fill my name as Ayushman", "type user@test.com in email", "enter password as 1234"
    const typePattern1 = text.match(/\b(?:fill|enter|type|write|input)\s+(?:my\s+)?(.+?)\s+(?:as|with|to be)\s+(.+)/i);
    if (typePattern1) {
      return {
        raw: rawUtterance,
        intent: "TYPE",
        target: typePattern1[1].trim(),
        value: typePattern1[2].trim(),
        confidence: 0.95,
        language: lang
      };
    }
    const typePattern2 = text.match(/\b(?:type|write|enter)\s+(.+?)\s+(?:in|into|on)\s+(?:the\s+)?(.+)/i);
    if (typePattern2) {
      return {
        raw: rawUtterance,
        intent: "TYPE",
        target: typePattern2[2].trim(),
        value: typePattern2[1].trim(),
        confidence: 0.94,
        language: lang
      };
    }
    const typePattern3 = text.match(/\b(?:fill|enter|type)\s+(?:my\s+)?(name|email|phone|address|password|username)\b/i);
    if (typePattern3) {
      return {
        raw: rawUtterance,
        intent: "FOCUS",
        target: typePattern3[1].trim(),
        targetType: "input",
        confidence: 0.88,
        language: lang
      };
    }

    // --- Clear Input ---
    const clearMatch = text.match(/\b(?:clear|erase|empty)\s+(?:the\s+)?(.+)/i);
    if (clearMatch) {
      return {
        raw: rawUtterance,
        intent: "CLEAR",
        target: clearMatch[1].trim(),
        confidence: 0.90,
        language: lang
      };
    }

    // --- Dropdown Select ---
    // e.g. "select India", "choose United States"
    const selectMatch = text.match(/\b(?:select|choose|pick)\s+(?:option\s+)?(.+)/i);
    if (selectMatch && !/\b(first|second|third|1|2|3|4|5)\b/i.test(selectMatch[1])) {
      return {
        raw: rawUtterance,
        intent: "SELECT",
        value: selectMatch[1].trim(),
        confidence: 0.90,
        language: lang
      };
    }

    // --- Checkbox Check / Uncheck ---
    const checkMatch = text.match(/\bcheck\s+(?:the\s+)?(.+)/i);
    if (checkMatch) {
      return {
        raw: rawUtterance,
        intent: "CHECK",
        target: checkMatch[1].trim(),
        confidence: 0.92,
        language: lang
      };
    }
    const uncheckMatch = text.match(/\buncheck\s+(?:the\s+)?(.+)/i);
    if (uncheckMatch) {
      return {
        raw: rawUtterance,
        intent: "UNCHECK",
        target: uncheckMatch[1].trim(),
        confidence: 0.92,
        language: lang
      };
    }

    // --- Form Submit ---
    if (/\b(submit the form|submit form|submit|send form)\b/i.test(text)) {
      return { raw: rawUtterance, intent: "SUBMIT", confidence: 0.95, language: lang };
    }

    // --- Ordinal Target (e.g. "click the third result", "open the first link", "click second button") ---
    const ordinalMatch = text.match(/\b(?:click|open|select|press)?\s*(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th)\s+(link|result|button|item|card|product)?/i);
    if (ordinalMatch) {
      const ordNum = extractNumberFromText(ordinalMatch[1]) || 1;
      const elemType = ordinalMatch[2] ? ordinalMatch[2].toLowerCase() : "link";
      return {
        raw: rawUtterance,
        intent: "CLICK",
        targetType: elemType,
        targetNumber: ordNum,
        confidence: 0.93,
        language: lang
      };
    }

    // --- Open / Go To Specific Link or Page or Section ---
    // e.g. "open the pricing page", "open contact us", "go to about section"
    const openMatch = text.match(/\b(?:open|go to|navigate to)\s+(?:the\s+)?(.+?)(?:\s+(?:page|section|tab|link))?$/i);
    if (openMatch) {
      const targetStr = openMatch[1].trim();
      return {
        raw: rawUtterance,
        intent: "OPEN_LINK",
        target: targetStr,
        confidence: 0.90,
        language: lang
      };
    }

    // --- Click Specific Element by Label or Description ---
    // e.g. "click the login button", "click get started", "click button that says Get Started"
    const clickSaysMatch = text.match(/\bclick\s+(?:the\s+)?(?:button|link|item)?\s*(?:that says|saying|named|called)\s+["']?(.+?)["']?$/i);
    if (clickSaysMatch) {
      return {
        raw: rawUtterance,
        intent: "CLICK",
        target: clickSaysMatch[1].trim(),
        confidence: 0.96,
        language: lang
      };
    }

    const clickGeneralMatch = text.match(/\b(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+(?:button|link|icon|tab|menu))?$/i);
    if (clickGeneralMatch) {
      const targetStr = clickGeneralMatch[1].trim();
      let targetType = "button";
      if (text.includes("link")) targetType = "link";
      if (text.includes("tab")) targetType = "tab";

      return {
        raw: rawUtterance,
        intent: "CLICK",
        target: targetStr,
        targetType,
        confidence: 0.89,
        language: lang
      };
    }

    // Fallback: If user just said a noun/action e.g. "Login", "Pricing", "Checkout"
    if (text.length > 2 && text.length < 25) {
      return {
        raw: rawUtterance,
        intent: "CLICK",
        target: text,
        confidence: 0.70,
        language: lang
      };
    }

    return {
      raw: rawUtterance,
      intent: "UNKNOWN",
      confidence: 0.3,
      language: lang
    };
  }
}
