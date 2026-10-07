/**
 * VoxNav - Multilingual & Dialect Normalization Layer
 * Normalizes English, Hindi/Hinglish, and Bengali/Banglish speech into clean command primitives.
 */

import { extractNumberFromText } from "../shared/utils";

export interface NormalizedVoiceInput {
  cleanedText: string;
  detectedLang: "en" | "hi" | "bn";
  extractedNumber?: number | null;
  verb?: string;
  target?: string;
}

export class MultilingualEngine {
  /**
   * Pre-cleans conversational phrases and translates colloquial patterns into standard English command structures.
   */
  public static normalize(rawUtterance: string): NormalizedVoiceInput {
    let text = rawUtterance.trim().toLowerCase();
    let detectedLang: "en" | "hi" | "bn" = "en";

    // Detect script or typical linguistic markers
    if (/[\u0980-\u09FF]/.test(text) || /\b(koro|dekhao|kholo|jaao|niche|upore|ei|eta)\b/i.test(text)) {
      detectedLang = "bn";
    } else if (/[\u0900-\u097F]/.test(text) || /\b(karo|kholo|jao|neeche|upar|dikhao|kijiye|dabaao)\b/i.test(text)) {
      detectedLang = "hi";
    }

    const extractedNumber = extractNumberFromText(text);

    // --- Bengali / Banglish Rules ---
    // e.g. "লগইন বাটনে ক্লিক করো" -> "click login button"
    // "পেজ নিচে স্ক্রোল করো" -> "scroll down"
    // "কন্টাক্ট পেজ খোলো" -> "open contact page"
    if (detectedLang === "bn") {
      text = text
        .replace(/লগইন|লগ ইন/g, "login")
        .replace(/বাটনে ক্লিক করো|এ ক্লিক করো|ক্লিক করো|চাপ দাও/g, "click")
        .replace(/খোল|খোলো|ওপেন করো/g, "open")
        .replace(/নিচে স্ক্রোল করো|নিচে যাও/g, "scroll down")
        .replace(/উপরে স্ক্রোল করো|উপরে যাও/g, "scroll up")
        .replace(/সবচেয়ে উপরে যাও/g, "scroll to top")
        .replace(/সবচেয়ে নিচে যাও/g, "scroll to bottom")
        .replace(/সার্চ করো|খোঁজ করো/g, "search")
        .replace(/ফর্ম জমা দাও|জমা দাও|সাবমিট করো/g, "submit")
        .replace(/পেজটা পড়ো|পড়ে শোনাও/g, "read page")
        .replace(/নম্বর দেখাও|সংখ্যা দেখাও/g, "show numbers")
        .replace(/নম্বর লুকাও/g, "hide numbers")
        .replace(/পিছনে যাও/g, "go back")
        .replace(/সামনে যাও/g, "go forward")
        .replace(/রিফ্রেশ করো/g, "refresh");

      // Romanized Bengali patterns
      text = text
        .replace(/\b(pe click koro|te click koro|click koro|te chap dao)\b/gi, "click")
        .replace(/\b(kholo|open koro)\b/gi, "open")
        .replace(/\b(niche scroll koro|niche jao)\b/gi, "scroll down")
        .replace(/\b(upore scroll koro|upore jao)\b/gi, "scroll up")
        .replace(/\b(search koro|khonjo)\b/gi, "search")
        .replace(/\b(submit koro|joma dao)\b/gi, "submit")
        .replace(/\b(read koro|pore shonao)\b/gi, "read page")
        .replace(/\b(number dekhao|numbers dekhao)\b/gi, "show numbers")
        .replace(/\b(number lukao)\b/gi, "hide numbers")
        .replace(/\b(pichone jao|back jao)\b/gi, "go back");
    }

    // --- Hindi / Hinglish Rules ---
    // e.g. "लॉगिन बटन पर क्लिक करो" -> "click login button"
    // "पेज को नीचे स्क्रॉल करो" -> "scroll down"
    // "सर्च करो पाइथन" -> "search python"
    if (detectedLang === "hi") {
      text = text
        .replace(/लॉगिन/g, "login")
        .replace(/पर क्लिक करो|क्लिक करो|दबाओ/g, "click")
        .replace(/खोलो|ओपन करो/g, "open")
        .replace(/नीचे स्क्रॉल करो|नीचे जाओ/g, "scroll down")
        .replace(/ऊपर स्क्रॉल करो|ऊपर जाओ/g, "scroll up")
        .replace(/सर्च करो|ढूंढो/g, "search")
        .replace(/सबमिट करो|जमा करो/g, "submit")
        .replace(/पेज पढ़ो|पढ़कर सुनाओ/g, "read page")
        .replace(/नंबर दिखाओ|संख्याएं दिखाओ/g, "show numbers")
        .replace(/नंबर छुपाओ/g, "hide numbers")
        .replace(/पीछे जाओ/g, "go back")
        .replace(/आगे जाओ/g, "go forward")
        .replace(/रिफ्रेश करो/g, "refresh");

      // Romanized Hinglish patterns
      text = text
        .replace(/\b(pe click karo|par click karo|click karo|dabao)\b/gi, "click")
        .replace(/\b(kholo|open karo)\b/gi, "open")
        .replace(/\b(neeche scroll karo|neeche jao|thoda neeche karo)\b/gi, "scroll down")
        .replace(/\b(upar scroll karo|upar jao|thoda upar karo)\b/gi, "scroll up")
        .replace(/\b(search karo|dhoondo)\b/gi, "search")
        .replace(/\b(submit karo|bhejo)\b/gi, "submit")
        .replace(/\b(padho|read karo)\b/gi, "read page")
        .replace(/\b(number dikhao|numbers dikhao)\b/gi, "show numbers")
        .replace(/\b(number chupao)\b/gi, "hide numbers")
        .replace(/\b(peeche jao|back jao)\b/gi, "go back");
    }

    // Cleanup redundant filler words (e.g., "please", "can you", "button pe")
    text = text
      .replace(/\b(please|can you|could you|kindly|just|hey|voxnav)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      cleanedText: text,
      detectedLang,
      extractedNumber
    };
  }
}
