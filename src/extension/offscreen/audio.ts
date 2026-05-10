// Offscreen document — one persistent <audio> element shared across all phases.
// Receives { type: "BGM_CMD", cmd, value } from the background service worker.

const DB_NAME  = "zenneck";
const DB_STORE = "audio";
const BGM_KEY  = "custom-bgm";

async function getCustomBlobUrl(): Promise<string | null> {
  try {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onsuccess       = () => res(r.result);
      r.onerror         = () => rej(r.error);
      r.onupgradeneeded = () => r.result.createObjectStore(DB_STORE);
    });
    const ab = await new Promise<ArrayBuffer | null>(res => {
      const tx  = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(BGM_KEY);
      req.onsuccess = () => res((req.result as ArrayBuffer | undefined) ?? null);
      req.onerror   = () => res(null);
    });
    if (!ab) return null;
    return URL.createObjectURL(new Blob([ab], { type: "audio/mpeg" }));
  } catch { return null; }
}

const audio   = document.getElementById("bgm") as HTMLAudioElement;
let masterVol = 0.45;
let fadeId: ReturnType<typeof setInterval> | null = null;
let loaded    = false;
let blobUrl: string | null = null;

function clearFade() {
  if (fadeId) { clearInterval(fadeId); fadeId = null; }
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  blobUrl = await getCustomBlobUrl();
  audio.src = blobUrl ?? chrome.runtime.getURL("audio/default-bgm.mp3");
}

function fadeIn() {
  clearFade();
  fadeId = setInterval(() => {
    const v = Math.min(audio.volume + 0.04, masterVol);
    audio.volume = v;
    if (v >= masterVol) clearFade();
  }, 80);
}

function fadeOut() {
  clearFade();
  if (audio.paused) return;
  fadeId = setInterval(() => {
    const v = Math.max(audio.volume - 0.04, 0);
    audio.volume = v;
    if (v <= 0) { clearFade(); audio.pause(); }
  }, 80);
}

type BgmMsg = { type: string; cmd?: string; value?: number };

chrome.runtime.onMessage.addListener((msg: BgmMsg) => {
  if (msg.type !== "BGM_CMD") return;

  switch (msg.cmd) {
    case "play":
      ensureLoaded().then(() => {
        if (!audio.paused) return; // already playing — no-op
        audio.volume = 0;
        audio.play().then(fadeIn).catch(() => {});
      });
      break;

    case "fade_out":
      fadeOut();
      break;

    case "stop":
      clearFade();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
      break;

    case "volume":
      masterVol = msg.value ?? masterVol;
      if (!audio.paused) {
        clearFade();
        audio.volume = masterVol;
      }
      break;

    case "reload": {
      loaded = false;
      if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
      const wasPlaying = !audio.paused;
      audio.pause();
      audio.src = "";
      ensureLoaded().then(() => {
        if (wasPlaying) {
          audio.volume = 0;
          audio.play().then(fadeIn).catch(() => {});
        }
      });
      break;
    }
  }
});
