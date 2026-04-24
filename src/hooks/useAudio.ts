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
const CROSSFADE = 4; // seconds of overlap at loop point

type BgmNodes = {
  fadeGain: GainNode;
  masterGain: GainNode;
  loopTimer: ReturnType<typeof setTimeout> | null;
};

type CrescendoNodes = {
  source: AudioBufferSourceNode;
  masterGain: GainNode;
};

export function useAudio() {
  const ctxRef          = useRef<AudioContext | null>(null);
  const bgmRef          = useRef<BgmNodes | null>(null);
  const bgmStartingRef  = useRef(false);
  const bgmPendingRef   = useRef(false); // startBGM 被调用时 buffer 尚未就绪
  const customBufRef    = useRef<AudioBuffer | null>(null);
  const defaultBufRef  = useRef<AudioBuffer | null>(null);
  const sfxStepBufRef    = useRef<AudioBuffer | null>(null);
  const sfxSessionBufRef = useRef<AudioBuffer | null>(null);
  const sfxHoldBufRef    = useRef<AudioBuffer | null>(null);
  const crescendoRef   = useRef<CrescendoNodes | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      ctx.addEventListener("statechange", () => {
        if (ctx.state === "suspended") ctx.resume();
      });
      ctxRef.current = ctx;
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  // ── 预加载所有音频资源 ────────────────────────────────────────────
  useEffect(() => {
    const loadBgm = async () => {
      const ab = await idbLoad();
      if (ab) {
        try {
          customBufRef.current = await getCtx().decodeAudioData(ab);
        } catch { /* corrupted */ }
      } else {
        try {
          const res = await fetch("/audio/default-bgm.mp3");
          defaultBufRef.current = await getCtx().decodeAudioData(await res.arrayBuffer());
          // 外部曾调用过 startBGM 但当时 buffer 未就绪，现在补上
          if (bgmPendingRef.current) {
            bgmPendingRef.current = false;
            startBGM();
          }
        } catch { /* no BGM */ }
      }
    };

    const loadSfx = async () => {
      try {
        const ctx = getCtx();
        const [stepRes, sessionRes, holdRes] = await Promise.all([
          fetch("/audio/sfx-step.mp3"),
          fetch("/audio/sfx-session.mp3"),
          fetch("/audio/sfx-hold-loop.mp3"),
        ]);
        const [stepAb, sessionAb, holdAb] = await Promise.all([
          stepRes.arrayBuffer(), sessionRes.arrayBuffer(), holdRes.arrayBuffer(),
        ]);
        [sfxStepBufRef.current, sfxSessionBufRef.current, sfxHoldBufRef.current] = await Promise.all([
          ctx.decodeAudioData(stepAb),
          ctx.decodeAudioData(sessionAb),
          ctx.decodeAudioData(holdAb),
        ]);
      } catch { /* no SFX */ }
    };

    loadBgm();
    loadSfx();
  }, []);

  function playSfxBuffer(buf: AudioBuffer, volume = 0.8) {
    const ctx    = getCtx();
    const gain   = ctx.createGain();
    gain.gain.value = volume;
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  // ── BGM ──────────────────────────────────────────────────────────
  // Plays one segment with crossfade in/out and schedules the next loop.
  function playBgmSegment(
    audioBuf: AudioBuffer,
    masterGain: GainNode,
    loopRef: { loopTimer: ReturnType<typeof setTimeout> | null },
    isFirst: boolean,
  ) {
    const ctx = getCtx();
    const duration = audioBuf.duration;
    const xfade = Math.min(CROSSFADE, duration / 2);

    const segGain = ctx.createGain();
    segGain.connect(masterGain);

    // Fade in
    segGain.gain.setValueAtTime(0, ctx.currentTime);
    segGain.gain.linearRampToValueAtTime(1, ctx.currentTime + (isFirst ? 4.0 : xfade));

    // Fade out near end
    const fadeOutAt = ctx.currentTime + duration - xfade;
    segGain.gain.setValueAtTime(1, fadeOutAt);
    segGain.gain.linearRampToValueAtTime(0, fadeOutAt + xfade);

    const source = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(segGain);
    source.start();
    source.stop(ctx.currentTime + duration);

    // Schedule next segment to start just before this one fades out
    const msUntilNext = Math.max(0, (duration - xfade) * 1000);
    loopRef.loopTimer = setTimeout(() => {
      if (!bgmRef.current) return; // stopped
      playBgmSegment(audioBuf, masterGain, loopRef, false);
    }, msUntilNext);
  }

  const startBGM = useCallback(async () => {
    if (bgmRef.current || bgmStartingRef.current) return;
    const audioBuf = customBufRef.current ?? defaultBufRef.current;
    if (!audioBuf) {
      bgmPendingRef.current = true; // 记住：buffer 就绪后自动启动
      return;
    }

    bgmStartingRef.current = true;
    const ctx      = getCtx();
    const fadeGain = ctx.createGain();
    fadeGain.gain.setValueAtTime(0, ctx.currentTime);
    fadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
    fadeGain.connect(ctx.destination);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.70;
    masterGain.connect(fadeGain);

    const nodes: BgmNodes = { fadeGain, masterGain, loopTimer: null };
    bgmRef.current = nodes;
    bgmStartingRef.current = false;

    playBgmSegment(audioBuf, masterGain, nodes, true);
  }, []);

  const stopBGM = useCallback(() => {
    bgmPendingRef.current = false;
    const nodes = bgmRef.current;
    if (!nodes) return;
    bgmRef.current = null; // signal loop scheduler to stop
    if (nodes.loopTimer !== null) clearTimeout(nodes.loopTimer);
    const ctx = getCtx();
    const now = ctx.currentTime;
    nodes.fadeGain.gain.setValueAtTime(nodes.fadeGain.gain.value, now);
    nodes.fadeGain.gain.linearRampToValueAtTime(0, now + 2.5);
  }, []);

  // ── User music upload ─────────────────────────────────────────────
  const loadCustomBgm = useCallback(async (file: File): Promise<string> => {
    const ab = await file.arrayBuffer();
    await idbSave(ab.slice(0));
    customBufRef.current = await getCtx().decodeAudioData(ab);
    if (bgmRef.current) { stopBGM(); setTimeout(startBGM, 2900); }
    return file.name;
  }, [stopBGM, startBGM]);

  const clearCustomBgm = useCallback(async () => {
    customBufRef.current = null;
    await idbDelete();
    if (bgmRef.current) { stopBGM(); setTimeout(startBGM, 2900); }
  }, [stopBGM, startBGM]);

  // ── Hold phase：过滤白噪声，像一波海浪/风缓缓涌上 ─────────────────
  // ── Hold phase：播放 sfx-hold-loop.mp3，音量随 progress 渐强 ──────
  const startCrescendo = useCallback(() => {
    if (crescendoRef.current || !sfxHoldBufRef.current) return;
    const ctx = getCtx();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const source = ctx.createBufferSource();
    source.buffer = sfxHoldBufRef.current;
    source.connect(masterGain);
    source.start();

    crescendoRef.current = { source, masterGain };
  }, []);

  const updateCrescendo = useCallback((progress: number) => {
    const node = crescendoRef.current;
    if (!node) return;
    node.masterGain.gain.setTargetAtTime(progress * 0.75, getCtx().currentTime, 0.15);
  }, []);

  const stopCrescendo = useCallback(() => {
    const node = crescendoRef.current;
    if (!node) return;
    crescendoRef.current = null;
    const ctx = getCtx();
    node.masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.10);
    setTimeout(() => { try { node.source.stop(); } catch { /* ok */ } }, 600);
  }, []);

  // ── Step complete chime ───────────────────────────────────────────
  const playStepComplete = useCallback(() => {
    if (sfxStepBufRef.current) playSfxBuffer(sfxStepBufRef.current, 0.8);
  }, []);

  // ── Session complete ──────────────────────────────────────────────
  const playSessionComplete = useCallback(() => {
    if (sfxSessionBufRef.current) playSfxBuffer(sfxSessionBufRef.current, 0.85);
  }, []);

  return {
    startBGM, stopBGM,
    loadCustomBgm, clearCustomBgm,
    startCrescendo, updateCrescendo, stopCrescendo,
    playStepComplete, playSessionComplete,
  };
}

