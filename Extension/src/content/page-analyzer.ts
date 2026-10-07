/**
 * VoxNav - Page Analyzer Engine
 * Generates compact semantic representations of web pages and resolves targets efficiently.
 */

import { SemanticElement, PageSummary } from "../shared/types";
import { ElementDiscovery } from "./element-discovery";
import { stringSimilarity, normalizeText, debounce } from "../shared/utils";
import { SYNONYM_MAP } from "../shared/constants";

export class PageAnalyzer {
  private discovery: ElementDiscovery;
  private cachedElements: SemanticElement[] = [];
  private observer: MutationObserver | null = null;
  private onMutationCallback?: () => void;

  constructor(discovery: ElementDiscovery) {
    this.discovery = discovery;
    this.setupMutationObserver();
  }

  private setupMutationObserver(): void {
    const debouncedRefresh = debounce(() => {
      this.refresh();
      if (this.onMutationCallback) {
        this.onMutationCallback();
      }
    }, 400);

    this.observer = new MutationObserver((mutations) => {
      let relevantChange = false;
      for (const m of mutations) {
        // Ignore mutations on VoxNav's own injected root
        if ((m.target as HTMLElement)?.id?.startsWith("voxnav")) continue;
        if (m.type === "childList" || m.type === "attributes") {
          relevantChange = true;
          break;
        }
      }
      if (relevantChange) {
        debouncedRefresh();
      }
    });

    if (typeof document !== "undefined" && document.body) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden", "aria-hidden", "disabled"]
      });
    }
  }

  public setOnMutationCallback(cb: () => void): void {
    this.onMutationCallback = cb;
  }

  public refresh(): SemanticElement[] {
    this.cachedElements = this.discovery.discoverInteractiveElements();
    return this.cachedElements;
  }

  public getElements(): SemanticElement[] {
    if (this.cachedElements.length === 0) {
      return this.refresh();
    }
    return this.cachedElements;
  }

  /**
   * Compact semantic snapshot suitable for local rules or AI models.
   */
  public getCompactRepresentation(maxItems: number = 40): any[] {
    const elements = this.getElements();

    // Prioritize elements currently in the viewport
    const sorted = [...elements].sort((a, b) => {
      if (a.inViewport && !b.inViewport) return -1;
      if (!a.inViewport && b.inViewport) return 1;
      return 0;
    });

    return sorted.slice(0, maxItems).map((el) => ({
      id: el.id,
      type: el.type,
      text: el.text.slice(0, 50),
      ariaLabel: el.ariaLabel?.slice(0, 50),
      placeholder: el.placeholder?.slice(0, 50),
      visible: el.visible,
      inViewport: el.inViewport
    }));
  }

  /**
   * Resolves target matches with synonym support, fuzzy scoring, and ordinal prioritization.
   */
  public findMatchingElements(
    targetText: string,
    targetType?: string,
    minScoreThreshold: number = 0.55
  ): { element: SemanticElement; score: number }[] {
    const elements = this.getElements();
    const query = normalizeText(targetText);
    const candidates: { element: SemanticElement; score: number }[] = [];

    // Collect synonyms
    const synonyms = new Set<string>([query]);
    for (const [key, list] of Object.entries(SYNONYM_MAP)) {
      if (key === query || list.some((syn) => syn.includes(query) || query.includes(syn))) {
        synonyms.add(key);
        list.forEach((s) => synonyms.add(normalizeText(s)));
      }
    }

    elements.forEach((el) => {
      // Type compatibility check
      if (targetType) {
        const typeNorm = targetType.toLowerCase();
        if (typeNorm === "button" && el.type !== "button") return;
        if (typeNorm === "link" && el.type !== "link") return;
        if (typeNorm === "input" && el.type !== "input" && el.type !== "textarea") return;
      }

      let bestScore = 0;
      const elementTexts = [
        el.text,
        el.ariaLabel || "",
        el.title || "",
        el.placeholder || "",
        el.name || ""
      ].filter(Boolean);

      for (const textSample of elementTexts) {
        for (const syn of synonyms) {
          const score = stringSimilarity(syn, textSample);
          if (score > bestScore) {
            bestScore = score;
          }
        }
      }

      // Bonus for in-viewport elements
      if (el.inViewport && bestScore >= minScoreThreshold) {
        bestScore = Math.min(1.0, bestScore + 0.1);
      }

      if (bestScore >= minScoreThreshold) {
        candidates.push({ element: el, score: bestScore });
      }
    });

    // Sort by match confidence descending
    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Finds the primary search box on the current page.
   */
  public findPrimarySearchInput(): SemanticElement | null {
    const elements = this.getElements();

    // 1. Check for explicit type="search"
    const searchType = elements.find((el) => el.type === "search" && el.visible);
    if (searchType) return searchType;

    // 2. Check for placeholder / name matching search
    const searchMatch = elements.find((el) => {
      if (el.type !== "input" && el.type !== "textarea") return false;
      const t = normalizeText(`${el.placeholder || ""} ${el.name || ""} ${el.ariaLabel || ""}`);
      return t.includes("search") || t.includes("find") || t.includes("query") || t.includes("khoj");
    });
    if (searchMatch) return searchMatch;

    return null;
  }

  /**
   * Summarizes page for reading accessibility.
   */
  public getPageSummary(): PageSummary {
    const elements = this.getElements();
    const headings = document.querySelectorAll("h1, h2, h3");

    return {
      url: window.location.href,
      title: document.title || "Untitled Page",
      buttonCount: elements.filter((e) => e.type === "button").length,
      linkCount: elements.filter((e) => e.type === "link").length,
      inputCount: elements.filter((e) => e.type === "input" || e.type === "textarea").length,
      headingCount: headings.length,
      isVoiceActive: false,
      numberedModeActive: false
    };
  }

  /**
   * Extracts text outline for "read this page" voice feedback.
   */
  public getSpokenPageOutline(): string {
    const title = document.title || "this page";
    const h1 = document.querySelector("h1")?.textContent?.trim();
    const elements = this.getElements();
    const buttons = elements.filter((e) => e.type === "button" && e.inViewport);

    let outline = `You are on ${title}. `;
    if (h1) outline += `Main heading is: ${h1}. `;

    if (buttons.length > 0) {
      const topActions = buttons.slice(0, 3).map((b) => b.text).filter(Boolean).join(", ");
      if (topActions) {
        outline += `Main interactive actions include: ${topActions}. `;
      }
    }

    outline += "You can say 'show numbers' to see all clickable elements or speak any command.";
    return outline;
  }
}
