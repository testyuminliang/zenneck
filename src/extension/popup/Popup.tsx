import { useEffect, useState } from "react";
import { getTheme } from "../../themes";
import type { ThemeKey } from "../../types";

const DEFAULT_INTERVAL_MS = 30 * 60_000;

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtInterval(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

export default function Popup() {
  const [lastResetAt, setLastResetAt] = useState<number>(Date.now());
  const [intervalMs, setIntervalMs]   = useState<number>(DEFAULT_INTERVAL_MS);
  const [now, setNow]                 = useState<number>(Date.now());
  const [editing, setEditing]         = useState(false);
  const [editMin, setEditMin]         = useState("");
  const [themeKey, setThemeKey]       = useState<ThemeKey>("terracotta");

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function load() {
    const data = await chrome.storage.local.get(["lastResetAt", "intervalMs"]);
    setLastResetAt((data["lastResetAt"] as number | undefined) ?? Date.now());
    setIntervalMs((data["intervalMs"]  as number | undefined) ?? DEFAULT_INTERVAL_MS);
    // Read theme from localStorage — same source as the main app
    try {
      const cfg = JSON.parse(localStorage.getItem("zenneck-config") ?? "{}");
      if (cfg.themeKey) setThemeKey(cfg.themeKey as ThemeKey);
    } catch { /* ignore */ }
  }


  async function saveInterval(minutes: number) {
    const ms = Math.max(1, minutes) * 60_000;
    await chrome.storage.local.set({ intervalMs: ms });
    setIntervalMs(ms);
    setEditing(false);
  }

  async function resetTimer() {
    const t = Date.now();
    await chrome.storage.local.set({ lastResetAt: t });
    setLastResetAt(t);
  }

  async function triggerNow() {
    // Wait for background to inject the overlay before closing the popup.
    // If no response within 800ms, close anyway.
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 800);
      chrome.runtime.sendMessage({ type: "INJECT_GATEKEEPER" }, () => {
        clearTimeout(timer);
        resolve();
      });
    });
    window.close();
  }

  const { W, CR, bgBase } = getTheme(themeKey);

  const remaining = intervalMs - (now - lastResetAt);
  const overdue   = remaining <= 0;
  const pct       = Math.max(0, Math.min(1, (now - lastResetAt) / intervalMs));
  const lastStr   = new Date(lastResetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f3ece2; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div style={{ width: 280, background: bgBase, fontFamily: "'DM Sans',sans-serif", fontWeight: 300, transition: "background 0.4s" }}>

        {/* Header */}
        <div style={{ padding: "14px 20px 12px", borderBottom: `0.5px solid ${W}0.12)`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: "0.5px", background: `linear-gradient(90deg,transparent,${W}0.2))` }} />
          <span style={{ fontSize: 10, letterSpacing: "0.3em", color: `${CR}0.5)`, fontWeight: 300 }}>ZENNECK</span>
          <div style={{ flex: 1, height: "0.5px", background: `linear-gradient(90deg,${W}0.2),transparent)` }} />
        </div>

        {/* Countdown */}
        <div style={{ padding: "28px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.3em", color: `${CR}0.35)`, fontFamily: "monospace" }}>
            {overdue ? "OVERDUE" : "NEXT REMINDER"}
          </span>
          <span style={{
            fontSize: 44, letterSpacing: "0.04em", fontFamily: "monospace", fontWeight: 300,
            color: overdue ? `${W}0.88)` : `${CR}0.75)`,
            transition: "color 0.5s",
          }}>
            {overdue ? "——" : fmtCountdown(remaining)}
          </span>
          {overdue && (
            <span style={{ fontSize: 9, letterSpacing: "0.28em", color: `${W}0.55)`, fontFamily: "monospace" }}>
              该活动颈部了
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ margin: "0 20px 16px", height: 2, borderRadius: 1, background: `${CR}0.07)`, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 1,
            width: `${pct * 100}%`,
            background: overdue ? `${W}0.7)` : `${W}0.38)`,
            transition: "width 1s linear",
          }} />
        </div>

        {/* Interval row */}
        <div style={{ padding: "0 20px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, letterSpacing: "0.08em", color: `${CR}0.4)` }}>提醒间隔</span>
          {editing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input
                type="number" value={editMin} min={1} max={480} autoFocus
                onChange={e => setEditMin(e.target.value)}
                style={{ width: 48, height: 24, borderRadius: 5, border: `0.5px solid ${W}0.3)`, background: "rgba(255,248,240,0.85)", fontSize: 11, fontFamily: "monospace", textAlign: "center", color: `${CR}0.8)`, outline: "none", padding: "0 4px" }}
              />
              <span style={{ fontSize: 10, color: `${CR}0.35)`, fontFamily: "monospace" }}>分钟</span>
              <button
                onClick={() => saveInterval(Math.max(1, parseInt(editMin) || 30))}
                style={{ height: 24, padding: "0 8px", borderRadius: 5, background: `${W}0.8)`, border: "none", cursor: "pointer", fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,248,240,0.95)", fontFamily: "monospace" }}
              >OK</button>
              <button
                onClick={() => setEditing(false)}
                style={{ height: 24, padding: "0 6px", borderRadius: 5, background: "transparent", border: `0.5px solid ${W}0.18)`, cursor: "pointer", fontSize: 9, color: `${CR}0.35)`, fontFamily: "monospace" }}
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setEditing(true); setEditMin(String(Math.round(intervalMs / 60_000))); }}
              style={{ fontSize: 11, letterSpacing: "0.05em", color: `${CR}0.6)`, fontFamily: "monospace", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textDecorationColor: `${CR}0.15)`, padding: 0 }}
            >
              {fmtInterval(intervalMs)}
            </button>
          )}
        </div>

        {/* Last reset */}
        <div style={{ padding: "4px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 9, letterSpacing: "0.1em", color: `${CR}0.22)`, fontFamily: "monospace" }}>
            LAST RESET {lastStr}
          </span>
          <button
            onClick={resetTimer}
            style={{ fontSize: 9, letterSpacing: "0.12em", color: `${CR}0.28)`, fontFamily: "monospace", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            RESET
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 20px 14px", borderTop: `0.5px solid ${W}0.1)`, display: "flex", justifyContent: "center" }}>
          <button
            onClick={triggerNow}
            style={{ fontSize: 9, letterSpacing: "0.2em", color: `${W}0.55)`, fontFamily: "monospace", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            立即提醒
          </button>
        </div>
      </div>
    </>
  );
}
