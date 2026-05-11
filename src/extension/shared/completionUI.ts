export interface CompletionTheme {
  W: string;
  CR: string;
  bgBase: string;
  lang?: string;
}

// Self-contained — injected into the host page via chrome.scripting.executeScript.
// Must NOT close over any outer variables; everything comes through `theme`.
export function completionUI(theme: CompletionTheme): void {
  const OVERLAY_ID = "zenneck-complete";
  if (document.getElementById(OVERLAY_ID)) return;

  const { CR, bgBase, lang = "zh" } = theme;

  function hexToRgba(h: string, a: number): string {
    return `rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})`;
  }

  const host = document.createElement("div");
  host.id = OVERLAY_ID;
  Object.assign(host.style, { position: "fixed", inset: "0", zIndex: "2147483647", pointerEvents: "none" });

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@1&display=swap');
      .bd {
        position: fixed; inset: 0;
        background: ${hexToRgba(bgBase, 1)};
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 10px;
      }
      .bd.out {
        opacity: 0;
        transition: opacity 0.9s ease;
      }
      .title {
        font-size: 22px;
        font-family: 'DM Serif Display', serif;
        font-style: italic;
        color: ${CR}0.82);
        letter-spacing: 0.22em;
        user-select: none;
      }
      .sub {
        font-size: 8px;
        letter-spacing: 0.4em;
        color: ${CR}0.4);
        font-family: monospace;
        user-select: none;
      }
    </style>
    <div class="bd">
      <span class="title">${lang === "en" ? "Go for a walk. See you soon." : "去走走吧，一会见。"}</span>
      <span class="sub">TAKE YOUR TIME</span>
    </div>
  `;

  document.documentElement.appendChild(host);
  const bd = shadow.querySelector(".bd") as HTMLElement;

  // ── Lifecycle ─────────────────────────────────────────────────────
  function show() {
    setTimeout(dismiss, 2200);
  }

  function dismiss() {
    bd.classList.add("out");
    setTimeout(() => { try { host.remove(); } catch { /* ok */ } }, 950);
  }

  // Defer until tab is visible (tab may be in background when injected)
  if (!document.hidden) {
    show();
  } else {
    const onVisible = () => {
      if (!document.hidden) {
        document.removeEventListener("visibilitychange", onVisible);
        show();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
  }
}
