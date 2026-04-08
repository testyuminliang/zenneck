import { useRef, useCallback } from "react";

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bgmRef = useRef<{ fadeGain: GainNode; oscs: OscillatorNode[] } | null>(null);
  // 渐强：基音 + 高八度泛音两层
  const crescendoRef = useRef<{
    osc: OscillatorNode; gain: GainNode;
    osc2: OscillatorNode; gain2: GainNode;
  } | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  function playTone(
    freq: number,
    duration: number,
    volume = 0.22,
    type: OscillatorType = "sine",
    delay = 0,
  ) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.06);
  }

  // ── BGM ──────────────────────────────────────────────────────────
  // A 小调：110 / 220 / 330Hz 纯正弦
  // 极慢拍频：110.00 vs 110.07 → 0.07Hz ≈ 14 秒一次，几乎感知为"空气流动"
  const startBGM = useCallback(() => {
    if (bgmRef.current) return;
    const ctx = getCtx();

    const fadeGain = ctx.createGain();
    fadeGain.gain.setValueAtTime(0, ctx.currentTime);
    fadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 4.0);
    fadeGain.connect(ctx.destination);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.042;
    masterGain.connect(fadeGain);

    // [频率, 相对音量]
    const freqs: [number, number][] = [
      [110.00, 1.00],  // A2 基音
      [110.07, 0.80],  // 极慢拍频伙伴（0.07Hz ≈ 14s 一拍）
      [220.00, 0.50],  // A3 八度
      [330.00, 0.22],  // E4 五度（极轻，增加色彩）
    ];

    const oscs: OscillatorNode[] = freqs.map(([freq, vol]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = vol;
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      return osc;
    });

    bgmRef.current = { fadeGain, oscs };
  }, []);

  const stopBGM = useCallback(() => {
    const nodes = bgmRef.current;
    if (!nodes) return;
    const ctx = getCtx();
    const now = ctx.currentTime;
    nodes.fadeGain.gain.setValueAtTime(nodes.fadeGain.gain.value, now);
    nodes.fadeGain.gain.linearRampToValueAtTime(0, now + 2.5);
    setTimeout(() => {
      nodes.oscs.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
      bgmRef.current = null;
    }, 2800);
  }, []);

  // ── 渐强音效（hold 阶段）─────────────────────────────────────────
  // 基音 440Hz：volume 0 → 0.12（全程线性增长）
  // 泛音 880Hz：progress > 0.5 后才开始浮现，0 → 0.06
  // → 前半段：纯音量渐强；后半段：音色变厚，层次感更明显
  const startCrescendo = useCallback(() => {
    if (crescendoRef.current) return;
    const ctx = getCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 880;
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start();

    crescendoRef.current = { osc, gain, osc2, gain2 };
  }, []);

  const updateCrescendo = useCallback((progress: number) => {
    const node = crescendoRef.current;
    if (!node) return;
    const ctx = getCtx();
    // 基音全程渐强
    node.gain.gain.setTargetAtTime(progress * 0.12, ctx.currentTime, 0.10);
    // 高八度泛音：progress < 0.5 时静默，之后缓缓浮现
    const harmonic = Math.max(0, (progress - 0.5) * 2) * 0.055;
    node.gain2.gain.setTargetAtTime(harmonic, ctx.currentTime, 0.14);
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

  // ── 单步完成铃声 ─────────────────────────────────────────────────
  const playStepComplete = useCallback(() => {
    playTone(880,  0.55, 0.20, "sine");
    playTone(1320, 0.40, 0.07, "sine", 0.06);
    playTone(1760, 0.28, 0.03, "sine", 0.13);
  }, []);

  // ── 全程完成旋律 ─────────────────────────────────────────────────
  const playSessionComplete = useCallback(() => {
    playTone(523,  0.55, 0.20, "sine", 0);
    playTone(659,  0.55, 0.20, "sine", 0.36);
    playTone(784,  0.65, 0.22, "sine", 0.72);
    playTone(1047, 1.40, 0.18, "sine", 1.08);
    playTone(1319, 1.20, 0.10, "sine", 1.18);
  }, []);

  return {
    startBGM, stopBGM,
    startCrescendo, updateCrescendo, stopCrescendo,
    playStepComplete, playSessionComplete,
  };
}
