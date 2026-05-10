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

// Keep chrome.storage.local in sync so next alarm uses the correct theme
if (hasChromeStorage) {
  chrome.storage.local.get("settings").then(d => {
    const s = (d["settings"] as object | undefined) ?? {};
    chrome.storage.local.set({ settings: { ...s, themeKey } });
  });
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
  const [bgmOffset, setBgmOffset] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!hasChromeStorage) { setBgmOffset(0); return; }
    chrome.storage.local.get("zenneckBgmStartedAt").then(d => {
      const startedAt = d["zenneckBgmStartedAt"] as number | undefined;
      setBgmOffset(startedAt ? (Date.now() - startedAt) / 1000 : 0);
    }).catch(() => setBgmOffset(0));
  }, []);

  const handleComplete = async () => {
    if (hasChromeStorage) {
      await chrome.storage.local.set({ lastResetAt: Date.now() });
      await chrome.storage.local.remove("zenTabId");
      // Inject completion overlay into the host tab before closing
      chrome.runtime.sendMessage({ type: "SHOW_COMPLETION" }).catch(() => {});
    }
    // Short delay so the message reaches the background before tab closes
    setTimeout(closeThisTab, 400);
  };

  // Wait for storage read before mounting App so BGM starts at the correct offset
  if (bgmOffset === null) return null;
  return <App onComplete={handleComplete} bgmOffset={bgmOffset} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ZenEntry />
  </React.StrictMode>,
);
