import { gatekeeperUI } from "../shared/gatekeeperUI";
import type { GKTheme } from "../shared/gatekeeperUI";
import { completionUI } from "../shared/completionUI";
import type { CompletionTheme } from "../shared/completionUI";

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

// ── Offscreen document — persistent BGM player ───────────────────────────────

async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL("offscreen.html"),
    reasons: ["AUDIO_PLAYBACK" as chrome.offscreen.Reason],
    justification: "Persistent BGM across gatekeeper, zen, and completion phases",
  });
}

async function sendBgmCmd(params: { cmd: string; value?: number }): Promise<void> {
  await ensureOffscreen();
  chrome.runtime.sendMessage({ type: "BGM_CMD", ...params }).catch(() => {});
}

// ── Core ─────────────────────────────────────────────────────────────────────

let overlayTabId: number | undefined;

async function openZenDirect(themeKey: string): Promise<void> {
  // Bring existing zen tab to front if already open
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

  const url = new URL(chrome.runtime.getURL("zen.html"));
  url.searchParams.set("theme", themeKey);
  const tab = await chrome.tabs.create({ url: url.toString() });
  if (tab.id) await chrome.storage.local.set({ zenTabId: tab.id });
}

async function findTargetTab(excludeTabId?: number): Promise<chrome.tabs.Tab | undefined> {
  const active = await chrome.tabs.query({ active: true });
  const normal = active.find(t => t.url?.match(/^https?:/) && t.id !== excludeTabId);
  if (normal) return normal;
  const all = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  return all.find(t => t.id !== excludeTabId);
}

async function showCompletion(excludeTabId?: number): Promise<void> {
  const theme = await getTheme();
  const tab = await findTargetTab(excludeTabId);
  if (!tab?.id) return;

  const completionTheme: CompletionTheme = { W: theme.W, CR: theme.CR, bgBase: theme.bgBase, lang: theme.lang };

  // Switch user to target tab so they see the overlay when zen tab closes
  chrome.tabs.update(tab.id, { active: true }).catch(() => {});

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SHOW_COMPLETION", theme: completionTheme });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: completionUI,
        args: [completionTheme],
      });
    } catch { /* can't inject into this tab */ }
  }
}

async function injectGatekeeper(): Promise<void> {
  // Don't inject if zen tab is already open
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

  const tab = await findTargetTab();
  if (!tab?.id) return;

  const theme = await getTheme();

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SHOW_OVERLAY", theme });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: gatekeeperUI,
        args: [theme],
      });
    } catch {
      return;
    }
  }
  overlayTabId = tab.id;

  // Start persistent BGM in offscreen document
  sendBgmCmd({ cmd: "play" }).catch(() => {});
}

async function maybeInjectGatekeeper(): Promise<void> {
  const [lastResetAt, intervalMs] = await Promise.all([getLastResetAt(), getIntervalMs()]);
  if (Date.now() - lastResetAt >= intervalMs) await injectGatekeeper();
}

// ── Alarm ─────────────────────────────────────────────────────────────────────

// Schedule the alarm to fire as close as possible to lastResetAt + intervalMs,
// with a 1-minute repeating fallback in case of clock drift or missed fires.
async function rescheduleAlarm(): Promise<void> {
  const [lastResetAt, intervalMs] = await Promise.all([getLastResetAt(), getIntervalMs()]);
  const delayMs = Math.max(0, lastResetAt + intervalMs - Date.now());
  await chrome.alarms.clear("tick");
  chrome.alarms.create("tick", {
    delayInMinutes: Math.max(delayMs / 60_000, 1 / 60),  // at least ~1s
    periodInMinutes: 1,
  });
}

rescheduleAlarm();

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("lastResetAt").then(d => {
    if (!d["lastResetAt"]) chrome.storage.local.set({ lastResetAt: Date.now() });
    else rescheduleAlarm();
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("lastResetAt").then(d => {
    if (!d["lastResetAt"]) chrome.storage.local.set({ lastResetAt: Date.now() });
    else rescheduleAlarm();
  });
});

// Reschedule precisely whenever lastResetAt or intervalMs changes (from any context)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if ("lastResetAt" in changes || "intervalMs" in changes) {
    rescheduleAlarm().catch(() => {});
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "tick") return;
  await maybeInjectGatekeeper();
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (overlayTabId !== undefined && overlayTabId !== tabId) {
    chrome.tabs.sendMessage(overlayTabId, { type: "REMOVE_OVERLAY" }).catch(() => {});
    sendBgmCmd({ cmd: "fade_out" }).catch(() => {});
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
    sendBgmCmd({ cmd: "stop" }),  // manual close → immediate stop, not fade
  ]);
});

// ── Messages ──────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (msg: { type: string; themeKey?: string; cmd?: string; value?: number }, sender, sendResponse) => {
    const done = () => sendResponse({});

    if (msg.type === "OPEN_ZEN") {
      // Clear overlayTabId so tabs.onActivated doesn't fade out BGM when zen tab opens
      overlayTabId = undefined;
      openZenDirect(msg.themeKey ?? "terracotta").then(done).catch(done);
      return true;
    }

    if (msg.type === "INJECT_GATEKEEPER") {
      injectGatekeeper().then(done).catch(done);
      return true;
    }

    if (msg.type === "ZEN_COMPLETE") {
      const senderTabId = sender.tab?.id;
      Promise.all([
        chrome.storage.local.set({ lastResetAt: Date.now() }),
        chrome.storage.local.remove("zenTabId"),
        showCompletion(senderTabId),
        // Pass delay to offscreen — service worker setTimeout is not reliable
        sendBgmCmd({ cmd: "fade_out", value: 1000 }),
      ]).then(done).catch(done);
      return true;
    }

    if (msg.type === "GK_SNOOZED") {
      sendBgmCmd({ cmd: "fade_out" }).catch(() => {});
      done();
      return false;
    }

    // ZEN_BGM_CMD: forwarded from zen page — relay to offscreen document.
    // (Extension pages can reach offscreen directly via runtime.sendMessage, but we
    // route through background so ensureOffscreen() is always called first.)
    if (msg.type === "ZEN_BGM_CMD") {
      ensureOffscreen().then(() => {
        chrome.runtime.sendMessage({ type: "BGM_CMD", cmd: msg.cmd, value: msg.value }).catch(() => {});
        done();
      }).catch(done);
      return true;
    }
  },
);
