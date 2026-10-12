import { VoiceWidget } from "./widget";
import { VoiceDOM } from "@voicedom/core";

export { VoiceWidget, VoiceDOM };

// Auto-initialize when loaded via <script> tag with data-api-key or default
if (typeof window !== "undefined") {
  (window as any).VoiceDOM = VoiceDOM;
  (window as any).VoiceWidget = VoiceWidget;

  window.addEventListener("DOMContentLoaded", () => {
    const currentScript = document.currentScript || document.querySelector("script[data-voicedom]");
    const autoInit = currentScript?.getAttribute("data-auto-init") !== "false";
    const apiKey = currentScript?.getAttribute("data-api-key") || undefined;
    const lang = (currentScript?.getAttribute("data-lang") as any) || "en";

    if (autoInit) {
      (window as any).__voicedom_instance = new VoiceWidget(apiKey, lang);
    }
  });
}
