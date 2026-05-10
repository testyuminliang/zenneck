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
  const handleComplete = async () => {
    if (hasChromeStorage) {
      await chrome.runtime.sendMessage({ type: "ZEN_COMPLETE" });
    }
    setTimeout(closeThisTab, 400);
  };

  return <App onComplete={handleComplete} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ZenEntry />
  </React.StrictMode>,
);
