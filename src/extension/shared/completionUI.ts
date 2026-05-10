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
      @keyframes co-in {
        from { opacity: 0; transform: translateY(-5px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .bd {
        position: fixed; inset: 0;
        background: ${hexToRgba(bgBase, 0.6)};
        backdrop-filter: blur(32px);
        -webkit-backdrop-filter: blur(32px);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 10px;
        opacity: 0;
        transition: opacity 1.5s ease;
      }
      .bd.show {
        opacity: 1;
        animation: co-in 0.9s cubic-bezier(.25,.8,.25,1) both;
      }
      .bd.out {
        animation: none !important;
        opacity: 0 !important;
        transition: opacity 1.4s ease !important;
      }
      .title {
        font-size: 22px;
        font-family: Georgia, 'Times New Roman', serif;
        font-style: italic;
        color: ${CR}0.85);
        letter-spacing: 0.04em;
        user-select: none;
      }
      .sub {
        font-size: 9px;
        letter-spacing: 0.4em;
        color: ${CR}0.35);
        font-family: monospace;
        user-select: none;
      }
    </style>
    <div class="bd">
      <span class="title">${lang === "en" ? "Well done." : "练习完成。"}</span>
      <span class="sub">SESSION COMPLETE</span>
    </div>
  `;

  document.documentElement.appendChild(host);
  const bd = shadow.querySelector(".bd") as HTMLElement;

  // ── Audio ─────────────────────────────────────────────────────────
  let audioEl: HTMLAudioElement | null = null;

  function startAudio() {
    if (audioEl) return;
    try {
      const url = chrome.runtime.getURL("audio/default-bgm.mp3");
      const el = new Audio(url);
      el.loop = true;
      el.volume = 0;
      audioEl = el;

      const doPlay = () => {
        el.play().catch(() => { audioEl = null; });
        let v = 0;
        const id = setInterval(() => {
          if (!audioEl) { clearInterval(id); return; }
          v = Math.min(v + 0.04, 0.45);
          el.volume = v;
          if (v >= 0.45) clearInterval(id);
        }, 80);
      };

      // Seek to where the BGM currently is (sync across gatekeeper → zen → completion)
      el.addEventListener("canplay", () => {
        chrome.storage.local.get("zenneckBgmStartedAt").then(d => {
          const startedAt = d["zenneckBgmStartedAt"] as number | undefined;
          if (startedAt && el.duration) {
            const elapsed = (Date.now() - startedAt) / 1000;
            el.currentTime = elapsed % el.duration;
          }
          doPlay();
        }).catch(doPlay);
      }, { once: true });
    } catch { /* no audio */ }
  }

  function fadeOutAudio() {
    const el = audioEl;
    if (!el) return;
    audioEl = null;
    let v = el.volume;
    const id = setInterval(() => {
      v = Math.max(v - 0.04, 0);
      el.volume = v;
      if (v <= 0) { clearInterval(id); try { el.pause(); } catch { /* ok */ } }
    }, 80);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────
  function show() {
    requestAnimationFrame(() => bd.classList.add("show"));
    startAudio();
    setTimeout(dismiss, 3500);
  }

  function dismiss() {
    bd.classList.remove("show");
    bd.classList.add("out");
    fadeOutAudio();
    setTimeout(() => { try { host.remove(); } catch { /* ok */ } }, 1600);
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
