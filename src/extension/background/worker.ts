import { gatekeeperUI } from "../shared/gatekeeperUI";
import type { GKTheme } from "../shared/gatekeeperUI";

const DEFAULT_INTERVAL_MS = 30 * 60_000;

// Inline theme data — service workers can't share module state with pages
const THEMES: Record<string, Omit<GKTheme, "themeKey">> = {
  terracotta: { W: "rgba(180,95,65,",   CR: "rgba(100,60,40,",   bgBase: "#f3ece2" },
  rose:       { W: "rgba(175,85,115,",  CR: "rgba(100,50,70,",   bgBase: "#f5e8ee" },
  lavender:   { W: "rgba(125,100,170,", CR: "rgba(70,50,110,",   bgBase: "#eceaf5" },
  sage:       { W: "rgba(75,135,105,",  CR: "rgba(40,80,60,",    bgBase: "#e8f2ec" },
  ocean:      { W: "rgba(60,115,165,",  CR: "rgba(35,65,105,",   bgBase: "#e8eef8" },
};

// ── Storage helpers ───────────────────────────────────────────────────────────

async function getIntervalMs(): Promise<number> {
  const d = await chrome.storage.local.get("intervalMs");
  return (d["intervalMs"] as number | undefined) ?? DEFAULT_INTERVAL_MS;
}

async function getLastResetAt(): Promise<number> {
  const d = await chrome.storage.local.get("lastResetAt");
  return (d["lastResetAt"] as number | undefined) ?? Date.now();
}

async function getZenTabId(): Promise<number | undefined> {
  const d = await chrome.storage.local.get("zenTabId");
  return d["zenTabId"] as number | undefined;
}

async function getTheme(): Promise<GKTheme> {
  const d = await chrome.storage.local.get("settings");
  const s = d["settings"] as { themeKey?: string; lang?: string } | undefined;
  const themeKey = s?.themeKey ?? "terracotta";
  const lang = s?.lang ?? "zh";
  return { ...(THEMES[themeKey] ?? THEMES["terracotta"]), themeKey, lang };
}

// ── Core ─────────────────────────────────────────────────────────────────────

let overlayTabId: number | undefined;

async function openZenOverlay(themeKey: string, sourceTabId: number): Promise<void> {
  // If zen overlay is already running on some tab, bring that tab to front
  const existingId = await getZenTabId();
  if (existingId !== undefined) {
    try {
      await chrome.tabs.get(existingId);
      await chrome.tabs.update(existingId, { active: true });
      return;
    } catch {
      await chrome.storage.local.remove("zenTabId");
    }
  }

  overlayTabId = undefined; // gatekeeper removed itself on click

  const d = await chrome.storage.local.get("settings");
  const lang = (d["settings"] as { lang?: string } | undefined)?.lang ?? "zh";
  const zenUrl = chrome.runtime.getURL(`zen.html?mode=overlay&theme=${themeKey}&lang=${lang}`);

  await chrome.scripting.executeScript({
    target: { tabId: sourceTabId },
    func: (url: string) => {
      const ID = "zenneck-zen";
      if (document.getElementById(ID)) return;
      const frame = document.createElement("iframe");
      frame.id = ID;
      frame.src = url;
      frame.allow = "camera; microphone";
      frame.setAttribute("allowtransparency", "true");
      Object.assign(frame.style, {
        position: "fixed", inset: "0",
        width: "100vw", height: "100vh",
        border: "none", background: "transparent",
        zIndex: "2147483646",
      });
      document.documentElement.appendChild(frame);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          document.getElementById(ID)?.remove();
          document.removeEventListener("keydown", onKey);
        }
      };
      document.addEventListener("keydown", onKey);
    },
    args: [zenUrl],
  });

  await chrome.storage.local.set({ zenTabId: sourceTabId });
}

async function removeZenOverlay(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => { document.getElementById("zenneck-zen")?.remove(); },
  }).catch(() => {});
}

async function findTargetTab(): Promise<chrome.tabs.Tab | undefined> {
  // Prefer the last focused window's active tab (most accurate when alarm fires)
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.url?.match(/^https?:/)) return tab;
  } catch {}
  // Cross-window fallback — handles multi-window / popup-focused scenarios
  const active = await chrome.tabs.query({ active: true });
  return active.find(t => t.url?.match(/^https?:/));
  // Intentionally no fallback to non-active tabs: injecting into a background tab
  // the user can't see is worse than skipping — onActivated will catch it on next switch.
}

async function injectGatekeeper(): Promise<void> {
  // Don't inject if zen overlay is already running
  const existingId = await getZenTabId();
  if (existingId !== undefined) {
    try {
      await chrome.tabs.get(existingId);
      return; // zen is running — skip gatekeeper, don't force tab switch
    } catch {
      await chrome.storage.local.remove("zenTabId");
    }
  }

  const tab = await findTargetTab();
  if (!tab?.id) return;

  const theme = await getTheme();

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: gatekeeperUI,
      args: [theme],
    });
  } catch {
    // Can't inject into this tab (chrome://, PDF, etc.) — silently skip
    return;
  }
  overlayTabId = tab.id;
}

async function maybeInjectGatekeeper(): Promise<void> {
  const [lastResetAt, intervalMs] = await Promise.all([getLastResetAt(), getIntervalMs()]);
  if (Date.now() - lastResetAt >= intervalMs) await injectGatekeeper();
}

// ── Alarm ─────────────────────────────────────────────────────────────────────

function ensureAlarm() {
  chrome.alarms.get("tick").then(a => {
    if (!a) chrome.alarms.create("tick", { periodInMinutes: 1 });
  });
}

ensureAlarm();

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("lastResetAt").then(d => {
    if (!d["lastResetAt"]) chrome.storage.local.set({ lastResetAt: Date.now() });
  });
  chrome.alarms.create("tick", { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("lastResetAt").then(d => {
    if (!d["lastResetAt"]) chrome.storage.local.set({ lastResetAt: Date.now() });
  });
  ensureAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "tick") return;
  await maybeInjectGatekeeper();
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (overlayTabId !== undefined && overlayTabId !== tabId) {
    chrome.tabs.sendMessage(overlayTabId, { type: "REMOVE_OVERLAY" }).catch(() => {});
    overlayTabId = undefined;
  }
  await maybeInjectGatekeeper();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const zenTabId = await getZenTabId();
  if (tabId !== zenTabId) return;
  await Promise.all([
    chrome.storage.local.set({ lastResetAt: Date.now() }),
    chrome.storage.local.remove("zenTabId"),
  ]);
});

// ── Messages ──────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (msg: { type: string; themeKey?: string }, _sender, sendResponse) => {
    const done = () => sendResponse({});

    if (msg.type === "OPEN_ZEN") {
      const tabId = _sender.tab?.id;
      if (tabId !== undefined) {
        openZenOverlay(msg.themeKey ?? "terracotta", tabId).then(done).catch(done);
      } else {
        done();
      }
      return true;
    }

    if (msg.type === "INJECT_GATEKEEPER") {
      injectGatekeeper().then(done).catch(done);
      return true;
    }

    if (msg.type === "ZEN_COMPLETE") {
      (async () => {
        const d = await chrome.storage.local.get("zenTabId");
        const tabId = d["zenTabId"] as number | undefined;
        await Promise.all([
          chrome.storage.local.set({ lastResetAt: Date.now() }),
          chrome.storage.local.remove("zenTabId"),
        ]);
        if (tabId !== undefined) await removeZenOverlay(tabId);
        done();
      })().catch(done);
      return true;
    }
  },
);
