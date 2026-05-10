export interface GKTheme {
  W: string;
  CR: string;
  bgBase: string;
  themeKey: string;
  lang?: string;
}

// Self-contained — injected into the host page via chrome.scripting.executeScript.
// Must NOT close over any outer variables; everything comes through `theme`.
export function gatekeeperUI(theme: GKTheme): void {
  const OVERLAY_ID = "zenneck-gk";
  if (document.getElementById(OVERLAY_ID)) return;

  const { W, CR, bgBase, themeKey, lang = "zh" } = theme;

  function hex(h: string, a: number): string {
    return `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
  }

  const host = document.createElement("div");
  host.id = OVERLAY_ID;
  Object.assign(host.style, { position: "fixed", inset: "0", zIndex: "2147483647" });

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      @keyframes gk-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .bd {
        position: fixed; inset: 0;
        background: ${hex(bgBase, 0.45)};
        backdrop-filter: blur(28px);
        -webkit-backdrop-filter: blur(28px);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        animation: gk-in 0.45s cubic-bezier(.34,1.2,.64,1) both;
      }
      .t {
        font-size: 22px;
        font-family: Georgia, 'Times New Roman', serif;
        font-style: italic;
        color: ${CR}0.62);
        margin-bottom: 28px;
        letter-spacing: 0.02em;
        user-select: none;
      }
      .g { display: flex; flex-direction: column; gap: 10px; width: 220px; }
      .bs {
        height: 50px; border-radius: 14px;
        background: ${W}0.82); border: none; cursor: pointer;
        font-size: 14px; color: rgba(255,248,240,.95);
        font-family: Georgia, serif; font-style: italic;
        transition: all .2s; outline: none;
      }
      .bs:hover { opacity: .88; transform: translateY(-1px); }
      .bl {
        height: 36px; border-radius: 14px;
        background: transparent; border: .5px solid ${W}0.22);
        cursor: pointer; font-size: 10px; letter-spacing: .1em;
        color: ${CR}0.4); font-family: system-ui, sans-serif;
        transition: all .2s; outline: none;
      }
      .bl:hover { background: ${W}0.07); }
      .lgtg {
        position: absolute; bottom: 1.8rem; left: 1.8rem;
        width: 36px; height: 36px; border-radius: 50%;
        background: rgba(255,248,240,0.55);
        border: 0.5px solid ${W}0.2);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 9px; letter-spacing: 0.06em;
        color: ${CR}0.6); font-family: system-ui, sans-serif; font-weight: 300;
        transition: all 0.2s; outline: none;
      }
      .lgtg:hover { background: rgba(255,248,240,0.85); }
    </style>
    <div class="bd">
      <button class="lgtg">${lang === "zh" ? "EN" : "中"}</button>
      <span class="t">${lang === "en" ? "Ready for a break?" : "准备好放松一下了吗？"}</span>
      <div class="g">
        <button class="bs">${lang === "en" ? "Start relaxing" : "开始放松"}</button>
        <button class="bl" data-action="remind5">${lang === "en" ? "REMIND LATER IN 5 MINUTES" : "稍后提醒我（5分钟）"}</button>
        <button class="bl" data-action="remindInterval">${lang === "en" ? "REMIND ME IN {interval} MINUTES" : "稍后提醒我（{interval}分钟）"}</button>
      </div>
    </div>`;

  document.documentElement.appendChild(host);

  // ── Lang toggle ───────────────────────────────────────────────────
  let currentLang = lang;
  const langBtn  = shadow.querySelector(".lgtg") as HTMLButtonElement;
  const titleEl  = shadow.querySelector(".t")    as HTMLElement;
  const startBtn = shadow.querySelector(".bs")   as HTMLButtonElement;
  const remind5Btn = shadow.querySelector("[data-action='remind5']") as HTMLButtonElement;
  const remindIntervalBtn = shadow.querySelector("[data-action='remindInterval']") as HTMLButtonElement;

  const getIntervalMinutes = async (): Promise<number> => {
    const d = await chrome.storage.local.get("intervalMs");
    const ms = (d["intervalMs"] as number | undefined) ?? 30 * 60_000;
    return Math.round(ms / 60_000);
  };

  const updateButtonText = async () => {
    const intervalMin = await getIntervalMinutes();
    remind5Btn.textContent = currentLang === "en" ? "REMIND LATER IN 5 MINUTES" : "稍后提醒我（5分钟）";
    remindIntervalBtn.textContent = currentLang === "en" 
      ? `REMIND ME IN ${intervalMin} MINUTES` 
      : `稍后提醒我（${intervalMin}分钟）`;
  };

  langBtn.addEventListener("click", async () => {
    currentLang = currentLang === "zh" ? "en" : "zh";
    langBtn.textContent  = currentLang === "zh" ? "EN" : "中";
    titleEl.textContent  = currentLang === "en" ? "Ready for a break?" : "准备好放松一下了吗？";
    startBtn.textContent = currentLang === "en" ? "Start relaxing" : "开始放松";
    await updateButtonText();
    const d = await chrome.storage.local.get("settings");
    const s = (d["settings"] as Record<string, unknown> | undefined) ?? {};
    chrome.storage.local.set({ settings: { ...s, lang: currentLang } }).catch(() => {});
  });

  // Initialize button text
  updateButtonText().catch(() => {});

  const remove = () => {
    host.remove();
    chrome.runtime.onMessage.removeListener(msgListener);
  };

  const msgListener = (msg: { type: string }) => {
    if (msg.type === "REMOVE_OVERLAY") remove();
  };
  chrome.runtime.onMessage.addListener(msgListener);

  (shadow.querySelector(".bs") as HTMLButtonElement).addEventListener("click", () => {
    remove();
    chrome.runtime.sendMessage({ type: "OPEN_ZEN", themeKey });
  });

  remind5Btn.addEventListener("click", async () => {
    remove();
    chrome.runtime.sendMessage({ type: "GK_SNOOZED" }).catch(() => {});
    const d = await chrome.storage.local.get("intervalMs");
    const ms = (d["intervalMs"] as number | undefined) ?? 30 * 60_000;
    const snoozeMs = 5 * 60_000;
    await chrome.storage.local.set({ lastResetAt: Date.now() - ms + snoozeMs });
  });

  remindIntervalBtn.addEventListener("click", async () => {
    remove();
    chrome.runtime.sendMessage({ type: "GK_SNOOZED" }).catch(() => {});
    const d = await chrome.storage.local.get("intervalMs");
    const ms = (d["intervalMs"] as number | undefined) ?? 30 * 60_000;
    await chrome.storage.local.set({ lastResetAt: Date.now() - ms + ms });
  });
}
