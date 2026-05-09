export interface GKTheme {
  W: string;
  CR: string;
  bgBase: string;
  themeKey: string;
}

// Self-contained — injected into the host page via chrome.scripting.executeScript.
// Must NOT close over any outer variables; everything comes through `theme`.
export function gatekeeperUI(theme: GKTheme): void {
  const OVERLAY_ID = "zenneck-gk";
  if (document.getElementById(OVERLAY_ID)) return;

  const { W, CR, bgBase, themeKey } = theme;

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
        background: ${hex(bgBase, 0.92)};
        backdrop-filter: blur(22px);
        -webkit-backdrop-filter: blur(22px);
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
        height: 40px; border-radius: 14px;
        background: transparent; border: .5px solid ${W}0.22);
        cursor: pointer; font-size: 11px; letter-spacing: .2em;
        color: ${CR}0.4); font-family: monospace;
        transition: all .2s; outline: none;
      }
      .bl:hover { background: ${W}0.07); }
    </style>
    <div class="bd">
      <span class="t">时间到了</span>
      <div class="g">
        <button class="bs">开始放松</button>
        <button class="bl">稍后再说</button>
      </div>
    </div>`;

  document.documentElement.appendChild(host);

  const remove = () => host.remove();

  (shadow.querySelector(".bs") as HTMLButtonElement).addEventListener("click", () => {
    remove();
    chrome.runtime.sendMessage({ type: "OPEN_ZEN", themeKey });
  });

  (shadow.querySelector(".bl") as HTMLButtonElement).addEventListener("click", async () => {
    remove();
    const d = await chrome.storage.local.get("intervalMs");
    const ms = (d["intervalMs"] as number | undefined) ?? 30 * 60_000;
    await chrome.storage.local.set({ lastResetAt: Date.now() - ms + 5 * 60_000 });
  });
}
