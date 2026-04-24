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
}

export default function FluidBackground({
  palette = ["#fbe8d8", "#ead8e8", "#e4d8ea", "#e8dfd0"],
  speed = 45,
  intensity = "soft",
  baseColor = "#f3ece2",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const blobs = palette.flatMap((c, i) => [
      { color: c, ox: 0.25, oy: 0.3, ax: 0.35, ay: 0.28, fx: 0.8 + i * 0.1, fy: 0.6 + i * 0.13, ph: i * 1.7, rSeed: 0.22 },
      { color: c, ox: 0.75, oy: 0.7, ax: 0.3, ay: 0.35, fx: 0.7 + i * 0.11, fy: 0.9 + i * 0.07, ph: i * 2.3 + 3, rSeed: 0.28 },
    ]);

    const alphaMul = intensity === "soft" ? 0.55 : intensity === "bright" ? 1.0 : 0.8;
    const start = performance.now();

    const draw = () => {
      const t = (performance.now() - start) / 1000 / speed * Math.PI * 2;
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, w, h);
      for (const b of blobs) {
        const cx = (b.ox + Math.sin(t * b.fx + b.ph) * b.ax) * w;
        const cy = (b.oy + Math.cos(t * b.fy + b.ph * 1.3) * b.ay) * h;
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
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: baseColor }}>
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="goo-fluid">
            <feGaussianBlur stdDeviation="30" />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" />
            <feBlend in="SourceGraphic" />
          </filter>
        </defs>
      </svg>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%", height: "100%", display: "block",
          filter: "url(#goo-fluid) blur(8px)",
          transform: "scale(1.05)",
        }}
      />
    </div>
  );
}
