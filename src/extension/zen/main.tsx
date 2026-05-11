import React from "react";
import ReactDOM from "react-dom/client";
import App from "../../App";
import type { ThemeKey } from "../../types";
import "../../index.css";

const p        = new URLSearchParams(window.location.search);
const themeKey = (p.get("theme") ?? "terracotta") as ThemeKey;

// Only set themeKey in localStorage if not already saved (user's choice wins over URL param)
try {
  const cfg = JSON.parse(localStorage.getItem("zenneck-config") ?? "{}");
  if (!cfg.themeKey) {
    cfg.themeKey = themeKey;
    localStorage.setItem("zenneck-config", JSON.stringify(cfg));
  }
} catch { /* ignore */ }

const hasChromeStorage = typeof chrome !== "undefined" && !!chrome.storage?.local;

// Two-way settings sync between chrome.storage.local and localStorage.
// chrome.storage.local is the shared truth (gatekeeper can only write there);
// localStorage is the zen app's runtime config.
// On startup: pull lang from chrome.storage.local so gatekeeper changes are picked up.
// On completion: push current config so background uses the correct theme.
async function syncSettingsToExtStorage(): Promise<void> {
  if (!hasChromeStorage) return;
  try {
    const d = await chrome.storage.local.get("settings");
    const ext = (d["settings"] as Record<string, unknown> | undefined) ?? {};

    // Pull: let chrome.storage.local win for lang (gatekeeper may have changed it)
    const cfg = JSON.parse(localStorage.getItem("zenneck-config") ?? "{}") as Record<string, unknown>;
    if (ext["lang"] && ext["lang"] !== cfg["lang"]) {
      cfg["lang"] = ext["lang"];
      localStorage.setItem("zenneck-config", JSON.stringify(cfg));
    }

    // Push: write current localStorage back so background has latest themeKey
    const merged: Record<string, unknown> = { ...ext };
    if (cfg["themeKey"]) merged["themeKey"] = cfg["themeKey"];
    if (cfg["lang"])     merged["lang"]     = cfg["lang"];
    await chrome.storage.local.set({ settings: merged });
  } catch { /* ignore */ }
}

async function closeThisTab() {
  if (!hasChromeStorage) return;
  try {
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id) chrome.tabs.remove(tab.id);
  } catch {
    window.close();
  }
}

function ZenEntry() {
  const handleComplete = async () => {
    if (hasChromeStorage) {
      await syncSettingsToExtStorage();
      await chrome.runtime.sendMessage({ type: "ZEN_COMPLETE" });
    }
    setTimeout(closeThisTab, 400);
  };

  return <App onComplete={handleComplete} />;
}

// Defer render until sync completes so App reads the correct lang from localStorage
syncSettingsToExtStorage().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ZenEntry />
    </React.StrictMode>,
  );
});
