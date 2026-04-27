import { useEffect, useRef } from "react";

// ── helpers ──────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
const ease = (t: number) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

function useAnimCanvas(draw: DrawFn, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const start = performance.now();
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      draw(ctx, w, h, t);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

// ── HoldShrinkRing ────────────────────────────────────────────────────
function HoldShrinkRing({ progress }: { progress: number }) {
  const vis = progress > 0.02 && progress < 0.95;
  const p = Math.min(1, Math.max(0, progress));
  const R = 170 - p * 90;
  const size = R * 2 + 12;
  return (
    <svg width={size} height={size} style={{
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%,-50%)",
      pointerEvents: "none", zIndex: 2,
      opacity: vis ? 1 : 0,
      transition: "opacity .5s",
    }}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none"
        stroke="rgba(100,60,40,0.32)" strokeWidth="1" strokeDasharray="2 4" />
    </svg>
  );
}

// ── HoldArc (meteor arc) ──────────────────────────────────────────────
function HoldArc({ progress, size = 230, color = "#fff2d8" }: { progress: number; size?: number; color?: string }) {
  const vis = progress > 0.02 && progress < 0.95;
  const p = Math.max(0, Math.min(1, progress));
  const stroke = 1.4;
  const R = (size - stroke) / 2;
  const C = 2 * Math.PI * R;
  const tailLen = C * Math.min(p, 0.35);
  const headPos = C * p;
  const ang = -Math.PI / 2 + p * Math.PI * 2;
  const hx = size / 2 + Math.cos(ang) * R;
  const hy = size / 2 + Math.sin(ang) * R;
  // 渐变从尾部起点指向彗头，跟着弧线走向
  const tailAng = ang - (tailLen / R);
  const tx = size / 2 + Math.cos(tailAng) * R;
  const ty = size / 2 + Math.sin(tailAng) * R;
  return (
    <svg width={size} height={size} style={{
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%,-50%)",
      pointerEvents: "none", zIndex: 2,
      opacity: vis ? 1 : 0,
      transition: "opacity .5s",
    }}>
      <defs>
        <linearGradient id="meteorGrad" gradientUnits="userSpaceOnUse" x1={tx} y1={ty} x2={hx} y2={hy}>
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="60%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>
        <radialGradient id="meteorHead">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="40%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none"
        stroke="rgba(100,60,40,0.08)" strokeWidth="0.6" />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: "drop-shadow(0 0 4px rgba(255,235,200,0.9))" }}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none"
          stroke="url(#meteorGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${tailLen} ${C}`}
          strokeDashoffset={-(headPos - tailLen)} />
      </g>
      <circle cx={hx} cy={hy} r="10" fill="url(#meteorHead)" />
    </svg>
  );
}

// ── CondenseBloom ─────────────────────────────────────────────────────
const PALETTE = ["#ffcab0", "#f0c4dc", "#d4c4ec", "#f8d8b8"];
const DEEP_PALETTE = ["#f5b598", "#e8a8c4", "#c4a8dc", "#b8b4e0", "#f0c898"];

interface BloomSeed {
  baseAng: number; orbitSpd: number; wobA: number; wobF: number;
  tanA: number; tanF: number; col: string;
}

function CondenseBloom({ progress, arcProgress }: { progress: number; arcProgress: number }) {
  const pRef = useRef(progress);
  useEffect(() => { pRef.current = progress; }, [progress]);
  const arcRef = useRef(arcProgress);
  useEffect(() => { arcRef.current = arcProgress; }, [arcProgress]);

  const seedsRef = useRef<BloomSeed[] | null>(null);
  if (seedsRef.current == null) {
    const N = PALETTE.length * 2;
    seedsRef.current = Array.from({ length: N }, (_, i) => ({
      baseAng: (i / N) * Math.PI * 2 + i * 0.17,
      orbitSpd: 0.06 + (i % 3) * 0.018,
      wobA: 0.14 + (i % 4) * 0.05,
      wobF: 0.35 + (i % 3) * 0.12,
      tanA: 0.18 + (i % 5) * 0.04,
      tanF: 0.28 + (i % 4) * 0.1,
      col: PALETTE[i % PALETTE.length],
    }));
  }

  const ref = useAnimCanvas((ctx, w, h, t) => {
    const p = pRef.current;
    const e = ease(p);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.5;
    const R = Math.min(w, h) * 0.22;
    const seeds = seedsRef.current!;

    // fade in gradually so blobs don't pop over the background at hold start
    const fadeIn = Math.min(1, p * 5);

    ctx.save();
    // use normal blend at low progress (matches background look), screen only near completion
    ctx.globalCompositeOperation = e > 0.7 ? "screen" : "source-over";
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      const ang = s.baseAng + t * s.orbitSpd;
      const baseRad = R * lerp(1.5, 0.25, e);
      const wobR = Math.sin(t * s.wobF + i * 1.3) * R * s.wobA * (1 - e * 0.4);
      const wobT = Math.cos(t * s.tanF + i * 0.9) * R * s.tanA * (1 - e * 0.4);
      const rad = baseRad + wobR;
      const tan = wobT;
      const bx = cx + Math.cos(ang) * rad + Math.cos(ang + Math.PI / 2) * tan;
      const by = cy + Math.sin(ang) * rad + Math.sin(ang + Math.PI / 2) * tan;
      const blobR = R * lerp(1.35, 0.7, e);
      const alpha = lerp(0.55, 0.38, e) * fadeIn;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, blobR);
      g.addColorStop(0, hexToRgba(s.col, alpha));
      g.addColorStop(0.45, hexToRgba(s.col, alpha * 0.55));
      g.addColorStop(1, hexToRgba(s.col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(bx, by, blobR, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // central bloom
    const orbR = R * lerp(0.3, 1, e);
    const orbA = lerp(0.15, 0.95, e) * fadeIn;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
    core.addColorStop(0, `rgba(255,250,240,${orbA})`);
    core.addColorStop(0.5, `rgba(255,240,220,${orbA * 0.3})`);
    core.addColorStop(1, "rgba(255,240,220,0)");
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2); ctx.fill();

    // layered halo at completion
    if (e > 0.35) {
      const a = (e - 0.35) / 0.65;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      DEEP_PALETTE.forEach((col, i) => {
        const rr = R * (1.18 + i * 0.20);
        const thickness = 14 + i * 7;
        const g = ctx.createRadialGradient(cx, cy, rr - thickness, cx, cy, rr + thickness);
        g.addColorStop(0, hexToRgba(col, 0));
        g.addColorStop(0.5, hexToRgba(col, 0.32 * a * (1 - i * 0.1)));
        g.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, rr + thickness, 0, Math.PI * 2); ctx.fill();
      });
      if (e > 0.85) {
        const ea = (e - 0.85) / 0.15;
        ctx.strokeStyle = `rgba(255,250,240,${0.32 * ea})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    // 白点画在最后，永远在最上层
    const ap = arcRef.current;
    if (ap > 0.02 && ap < 0.95) {
      const arcSize = 230;
      const arcR = (arcSize - 1.4) / 2;
      const arcAng = -Math.PI / 2 + ap * Math.PI * 2;
      const dx = cx + Math.cos(arcAng) * arcR;
      const dy = cy + Math.sin(arcAng) * arcR;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      const glow = ctx.createRadialGradient(dx, dy, 0, dx, dy, 10);
      glow.addColorStop(0, "rgba(255,255,255,1)");
      glow.addColorStop(0.4, "rgba(255,242,220,0.85)");
      glow.addColorStop(1, "rgba(255,242,220,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(dx, dy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(255,245,220,1)";
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(dx, dy, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }, []);

  return (
    <canvas ref={ref} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none",
    }} />
  );
}

// ── Main export ───────────────────────────────────────────────────────
interface Props {
  /** 0 = default/guide, 0–1 = hold phase, 1 = completed */
  progress: number;
}

export default function MeditationOverlay({ progress }: Props) {
  const showHold = progress > 0.02 && progress < 0.95;
  const showBloom = progress > 0.02;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {showBloom && <CondenseBloom progress={progress} arcProgress={showHold ? progress : 0} />}
      {showHold && <HoldShrinkRing progress={progress} />}
      {showHold && <HoldArc progress={progress} />}
    </div>
  );
}
