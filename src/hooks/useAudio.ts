import { useEffect, useRef, useCallback } from "react";

// ── IndexedDB helpers ─────────────────────────────────────────────
const DB_NAME  = "zenneck";
const DB_STORE = "audio";
const BGM_KEY  = "custom-bgm";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess  = () => resolve(req.result);
    req.onerror    = () => reject(req.error);
  });
}

async function idbSave(ab: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(ab, BGM_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function idbLoad(): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(BGM_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}

async function idbDelete(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(BGM_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  } catch { /* ignore */ }
}

// ── Hook ──────────────────────────────────────────────────────────
type BgmNodes = {
  fadeGain: GainNode;
  oscs: OscillatorNode[];       // synthesized drone
  source?: AudioBufferSourceNode; // custom audio
};

export function useAudio() {
  const ctxRef        = useRef<AudioContext | null>(null);
  const bgmRef        = useRef<BgmNodes | null>(null);
  const bgmStartingRef = useRef(false);
  const customBufRef  = useRef<AudioBuffer | null>(null);
  const crescendoRef  = useRef<{
    osc: OscillatorNode; gain: GainNode;
    osc2: OscillatorNode; gain2: GainNode;
  } | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  // Eagerly load saved custom BGM from IndexedDB on mount
  useEffect(() => {
    idbLoad().then(async (ab) => {
      if (!ab) return;
      try {
        customBufRef.current = await getCtx().decodeAudioData(ab);
      } catch { /* corrupted – ignore */ }
    });
  }, []);

  function playTone(
    freq: number, duration: number,
    volume = 0.22, type: OscillatorType = "sine", delay = 0,
  ) {
    const ctx  = getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.06);
  }

  // ── BGM ──────────────────────────────────────────────────────────
  const startBGM = useCallback(async () => {
    if (bgmRef.current || bgmStartingRef.current) return;
    bgmStartingRef.current = true;

    const ctx      = getCtx();
    const fadeGain = ctx.createGain();
    fadeGain.gain.setValueAtTime(0, ctx.currentTime);
    fadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 4.0);
    fadeGain.connect(ctx.destination);

    if (customBufRef.current) {
      // ── User's own music ──────────────────────────────────────
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.70;
      masterGain.connect(fadeGain);

      const source = ctx.createBufferSource();
      source.buffer = customBufRef.current;
      source.loop   = true;
      source.connect(masterGain);
      source.start();

      bgmRef.current = { fadeGain, oscs: [], source };
    } else {
      // ── Synthesized ambient drone ─────────────────────────────
      // A minor: 110 / 220 / 330 Hz pure sines
      // 110.07 Hz beat partner → 0.07 Hz beat ≈ 14s per pulse (air-like movement)
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.042;
      masterGain.connect(fadeGain);

      const freqs: [number, number][] = [
        [110.00, 1.00],
        [110.07, 0.80],
        [220.00, 0.50],
        [330.00, 0.22],
      ];
      const oscs: OscillatorNode[] = freqs.map(([freq, vol]) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        g.gain.value    = vol;
        osc.type        = "sine";
        osc.frequency.value = freq;
        osc.connect(g); g.connect(masterGain);
        osc.start();
        return osc;
      });

      bgmRef.current = { fadeGain, oscs };
    }
    bgmStartingRef.current = false;
  }, []);

  const stopBGM = useCallback(() => {
    const nodes = bgmRef.current;
    if (!nodes) return;
    const ctx = getCtx();
    const now = ctx.currentTime;
    nodes.fadeGain.gain.setValueAtTime(nodes.fadeGain.gain.value, now);
    nodes.fadeGain.gain.linearRampToValueAtTime(0, now + 2.5);
    setTimeout(() => {
      nodes.oscs.forEach(o => { try { o.stop(); } catch { /* ok */ } });
      if (nodes.source) { try { nodes.source.stop(); } catch { /* ok */ } }
      bgmRef.current = null;
    }, 2800);
  }, []);

  // ── User music upload ─────────────────────────────────────────────
  // Returns the filename for the caller to store in config.
  const loadCustomBgm = useCallback(async (file: File): Promise<string> => {
    const ab = await file.arrayBuffer();
    await idbSave(ab.slice(0));                         // save copy before decode detaches buffer
    customBufRef.current = await getCtx().decodeAudioData(ab);
    // Swap BGM live if currently playing
    if (bgmRef.current) { stopBGM(); setTimeout(startBGM, 2900); }
    return file.name;
  }, [stopBGM, startBGM]);

  const clearCustomBgm = useCallback(async () => {
    customBufRef.current = null;
    await idbDelete();
    if (bgmRef.current) { stopBGM(); setTimeout(startBGM, 2900); }
  }, [stopBGM, startBGM]);

  // ── Crescendo (hold phase swell) ──────────────────────────────────
  const startCrescendo = useCallback(() => {
    if (crescendoRef.current) return;
    const ctx  = getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = 440;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    osc.connect(gain); gain.connect(ctx.destination); osc.start();

    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine"; osc2.frequency.value = 880;
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    osc2.connect(gain2); gain2.connect(ctx.destination); osc2.start();

    crescendoRef.current = { osc, gain, osc2, gain2 };
  }, []);

  const updateCrescendo = useCallback((progress: number) => {
    const node = crescendoRef.current;
    if (!node) return;
    const ctx = getCtx();
    node.gain.gain.setTargetAtTime(progress * 0.12, ctx.currentTime, 0.10);
    node.gain2.gain.setTargetAtTime(Math.max(0, (progress - 0.5) * 2) * 0.055, ctx.currentTime, 0.14);
  }, []);

  const stopCrescendo = useCallback(() => {
    const node = crescendoRef.current;
    if (!node) return;
    crescendoRef.current = null;
    const ctx = getCtx();
    node.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    node.gain2.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    node.osc.stop(ctx.currentTime + 0.7);
    node.osc2.stop(ctx.currentTime + 0.7);
  }, []);

  // ── Step complete chime ───────────────────────────────────────────
  const playStepComplete = useCallback(() => {
    playTone(880,  0.55, 0.20, "sine");
    playTone(1320, 0.40, 0.07, "sine", 0.06);
    playTone(1760, 0.28, 0.03, "sine", 0.13);
  }, []);

  // ── Session complete melody ───────────────────────────────────────
  const playSessionComplete = useCallback(() => {
    playTone(523,  0.55, 0.20, "sine", 0);
    playTone(659,  0.55, 0.20, "sine", 0.36);
    playTone(784,  0.65, 0.22, "sine", 0.72);
    playTone(1047, 1.40, 0.18, "sine", 1.08);
    playTone(1319, 1.20, 0.10, "sine", 1.18);
  }, []);

  return {
    startBGM, stopBGM,
    loadCustomBgm, clearCustomBgm,
    startCrescendo, updateCrescendo, stopCrescendo,
    playStepComplete, playSessionComplete,
  };
}
