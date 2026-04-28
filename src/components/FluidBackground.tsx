import { useEffect, useRef } from "react";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface Props {
  palette?: string[];
  speed?: number;
  intensity?: "soft" | "medium" | "bright";
  baseColor?: string;
  headOffset?: { x: number; y: number };
}

export default function FluidBackground({
  palette = ["#fbe8d8", "#ead8e8", "#e4d8ea", "#e8dfd0"],
  speed = 45,
  intensity = "soft",
  baseColor = "#f3ece2",
  headOffset,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headOffsetRef = useRef({ x: 0, y: 0 });
  const smoothedOffsetRef = useRef({ x: 0, y: 0 });

  // Keep target offset in sync with prop (read by draw loop via ref)
  headOffsetRef.current = headOffset ?? { x: 0, y: 0 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.filter = "blur(60px)";
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    // driftMul: parallax layer — "far" blobs (>1) drift more, "near" blobs (<1) drift less
    const blobs = palette.flatMap((c, i) => [
      { color: c, ox: 0.25, oy: 0.3, ax: 0.42, ay: 0.36, fx: 0.8 + i * 0.1, fy: 0.6 + i * 0.13, ph: i * 1.7, rSeed: 0.32, driftMul: 1.4 - i * 0.15 },
      { color: c, ox: 0.75, oy: 0.7, ax: 0.38, ay: 0.42, fx: 0.7 + i * 0.11, fy: 0.9 + i * 0.07, ph: i * 2.3 + 3, rSeed: 0.38, driftMul: 0.6 + i * 0.2 },
    ]);

    const alphaMul = intensity === "soft" ? 0.82 : intensity === "bright" ? 1.0 : 0.9;
    const start = performance.now();

    const DRIFT = 0.65; // max offset as fraction of screen at full head turn (normalized ±1)
    const LERP  = 0.12; // smoothing factor per frame — snappy ~0.5s settle

    const draw = () => {
      const t = (performance.now() - start) / 1000 / speed * Math.PI * 2;

      // Lerp smoothed offset toward current head target
      const target = headOffsetRef.current;
      const s = smoothedOffsetRef.current;
      s.x += (target.x - s.x) * LERP;
      s.y += (target.y - s.y) * LERP;

      ctx.clearRect(0, 0, w, h);
      for (const b of blobs) {
        const cx = (b.ox + Math.sin(t * b.fx + b.ph) * b.ax + s.x * DRIFT * b.driftMul) * w;
        const cy = (b.oy + Math.cos(t * b.fy + b.ph * 1.3) * b.ay + s.y * DRIFT * b.driftMul) * h;
        const pulse = 1 + Math.sin(t * 0.5 + b.ph) * 0.15;
        const r = Math.max(w, h) * b.rSeed * pulse;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, hexToRgba(b.color, alphaMul));
        g.addColorStop(0.5, hexToRgba(b.color, alphaMul * 0.5));
        g.addColorStop(1, hexToRgba(b.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [palette.join("|"), speed, intensity, baseColor]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "transparent" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%", height: "100%", display: "block",
          transform: "scale(1.1)",
        }}
      />
    </div>
  );
}
