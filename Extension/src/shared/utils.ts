/**
 * VoxNav - Shared Utility Functions
 */

import { INDIC_NUMBER_MAP } from "./constants";

export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^\w\s\u0980-\u09FF\u0900-\u097F]/g, " ") // keep alphanumeric and Indic scripts
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes Levenshtein Distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculates string similarity score between 0.0 and 1.0.
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Exact substring match bonus
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return 0.8 + (0.2 * (minLen / maxLen));
  }

  // Token overlap (Jaccard similarity)
  const tokens1 = new Set(s1.split(" "));
  const tokens2 = new Set(s2.split(" "));
  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }
  const union = new Set([...tokens1, ...tokens2]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // Levenshtein ratio
  const maxLen = Math.max(s1.length, s2.length);
  const dist = levenshteinDistance(s1, s2);
  const levScore = 1.0 - (dist / maxLen);

  return Math.max(jaccard, levScore);
}

/**
 * Extracts a numeric value from text, supporting digits and Indic numerals.
 */
export function extractNumberFromText(text: string): number | null {
  const normalized = normalizeText(text);

  // Check digit sequence
  const digitMatch = normalized.match(/\b\d+\b/);
  if (digitMatch) {
    return parseInt(digitMatch[0], 10);
  }

  // Check against words/Indic glyphs
  const words = normalized.split(/\s+/);
  for (const w of words) {
    if (INDIC_NUMBER_MAP[w] !== undefined) {
      return INDIC_NUMBER_MAP[w];
    }
  }

  // Check individual characters for Indic numerals (e.g. ১, ২, ३, ४)
  for (const ch of normalized) {
    if (INDIC_NUMBER_MAP[ch] !== undefined) {
      return INDIC_NUMBER_MAP[ch];
    }
  }

  return null;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs: number): T {
  let timer: any = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  }) as T;
}

export function throttle<T extends (...args: any[]) => void>(fn: T, limitMs: number): T {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= limitMs) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

export const logger = {
  info: (msg: string, ...args: any[]) => console.log(`%c[VoxNav]%c ${msg}`, "color: #2563EB; font-weight: bold;", "", ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`%c[VoxNav:Warning]%c ${msg}`, "color: #F59E0B; font-weight: bold;", "", ...args),
  error: (msg: string, ...args: any[]) => console.error(`%c[VoxNav:Error]%c ${msg}`, "color: #DC2626; font-weight: bold;", "", ...args)
};
