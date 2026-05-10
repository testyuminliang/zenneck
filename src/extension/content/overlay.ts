// Content script registered in manifest — runs on all http/https pages.
// Listens for SHOW_OVERLAY / SHOW_COMPLETION from background and renders the UI.

import { gatekeeperUI } from "../shared/gatekeeperUI";
import type { GKTheme } from "../shared/gatekeeperUI";
import { completionUI } from "../shared/completionUI";
import type { CompletionTheme } from "../shared/completionUI";

type InboundMsg =
  | { type: "SHOW_OVERLAY"; theme: GKTheme }
  | { type: "SHOW_COMPLETION"; theme: CompletionTheme }
  | { type: "REMOVE_OVERLAY" };

chrome.runtime.onMessage.addListener(
  (msg: InboundMsg, _sender, sendResponse) => {
    if (msg.type === "SHOW_OVERLAY") {
      gatekeeperUI(msg.theme);
      sendResponse({});
    } else if (msg.type === "SHOW_COMPLETION") {
      completionUI(msg.theme);
      sendResponse({});
    }
  },
);
