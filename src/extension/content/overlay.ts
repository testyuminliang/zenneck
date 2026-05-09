// Content script registered in manifest — runs on all http/https pages.
// Listens for SHOW_OVERLAY from background and renders the gatekeeper UI.

import { gatekeeperUI } from "../shared/gatekeeperUI";
import type { GKTheme } from "../shared/gatekeeperUI";

chrome.runtime.onMessage.addListener(
  (msg: { type: string; theme?: GKTheme }, _sender, sendResponse) => {
    if (msg.type === "SHOW_OVERLAY" && msg.theme) {
      gatekeeperUI(msg.theme);
      sendResponse({});
    }
  },
);
