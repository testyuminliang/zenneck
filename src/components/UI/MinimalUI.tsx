import { useEffect, useRef, useState } from "react";

interface Props {
  alignmentProgress: number;
  isFormed: boolean;
  headRotation: { roll: number };
}

// ── Design tokens ────────────────────────────────────────────────────
const gold = "rgba(212,175,55,";
const emerald = "rgba(14,107,82,";

function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

function formatTime(s: number) {
  return `${pad2(s / 60)}:${pad2(s % 60)}`;
}

export default function MinimalUI({ alignmentProgress, isFormed, headRotation }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const orbRotRef = useRef(0);
  const orbRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  // Session timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Aura Orb animation loop (rAF, no React re-renders)
  useEffect(() => {
    const tick = () => {
      orbRotRef.current += 0.4;
      if (orbRef.current) {
        const hue1 = isFormed ? 47 : 160 + alignmentProgress * 20;
        const hue2 = isFormed ? 40 : 140;
        const sat = 70 + alignmentProgress * 30;
        const bright = 0.55 + alignmentProgress * 0.35;
        orbRef.current.style.background = `conic-gradient(
          from ${orbRotRef.current}deg,
          hsl(${hue1}, ${sat}%, 45%),
          hsl(${hue2}, ${sat - 10}%, 30%),
          hsl(${hue1 + 30}, ${sat}%, 40%),
          hsl(${hue1}, ${sat}%, 45%)
        )`;
        orbRef.current.style.boxShadow = `
          0 0 ${12 + alignmentProgress * 24}px ${gold}${bright}),
          inset 0 0 ${8 + alignmentProgress * 16}px ${gold}0.3)
        `;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [alignmentProgress, isFormed]);

  const aligned = alignmentProgress > 0.7 || isFormed;
  const roll = headRotation.roll;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,wght@0,200;0,300;1,300&display=swap');

        @keyframes orb-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%,100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        @keyframes breathe {
          0%,100% { opacity: 0.4; }
          50%      { opacity: 0.85; }
        }
      `}</style>

      {/* ── TOP BAR ───────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "42px",
        display: "flex", alignItems: "center",
        padding: "0 2rem",
        pointerEvents: "none",
      }}>
        {/* Left gold line */}
        <div style={{
          flex: 1, height: "0.5px",
          background: `linear-gradient(90deg, transparent, ${gold}0.5))`,
        }} />

        {/* Center label */}
        <div style={{
          padding: "0 20px",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <span style={{
            fontSize: "9px",
            letterSpacing: "0.32em",
            color: `${gold}0.6)`,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
          }}>
            ALIGNMENT SESSION
          </span>
          <span style={{
            fontSize: "9px",
            color: `${gold}0.3)`,
            fontWeight: 200,
          }}>
            •
          </span>
          <span style={{
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: `${gold}${aligned ? "0.9" : "0.45"})`,
            fontFamily: "monospace",
            fontWeight: 300,
            transition: "color 0.6s",
          }}>
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Right gold line */}
        <div style={{
          flex: 1, height: "0.5px",
          background: `linear-gradient(90deg, ${gold}0.5), transparent)`,
        }} />
      </div>

      {/* ── STATUS (bottom center) ────────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: "2.5rem", left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "6px", zIndex: 100, pointerEvents: "none",
      }}>
        <p style={{
          margin: 0,
          fontSize: "11px",
          letterSpacing: "0.22em",
          color: aligned ? `${gold}0.85)` : "rgba(255,255,255,0.3)",
          fontFamily: "'DM Serif Display', serif",
          fontStyle: "italic",
          animation: "breathe 4s ease-in-out infinite",
          transition: "color 0.8s",
        }}>
          {isFormed
            ? "Resonance achieved — hold"
            : aligned
              ? "Alignment detected — maintain"
              : "Tilt your head gently to the right"}
        </p>

        {/* Roll micro-readout */}
        <span style={{
          fontSize: "7px",
          letterSpacing: "0.18em",
          color: `rgba(255,255,255,0.18)`,
          fontFamily: "monospace",
        }}>
          ROLL {roll >= 0 ? "+" : ""}{roll.toFixed(1)}°
          {"  ·  "}
          {Math.round(alignmentProgress * 100)}%
        </span>
      </div>

      {/* ── AURA ORB (bottom right) ───────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: "1.8rem", right: "1.8rem",
        zIndex: 100, pointerEvents: "none",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
      }}>
        {/* outer glow ring */}
        <div style={{
          position: "relative",
          width: "64px", height: "64px",
        }}>
          <div style={{
            position: "absolute", inset: "-12px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${gold}${(0.08 + alignmentProgress * 0.18).toFixed(2)}) 0%, transparent 70%)`,
            filter: "blur(8px)",
            transition: "background 0.6s",
          }} />
          {/* orb itself */}
          <div
            ref={orbRef}
            style={{
              width: "64px", height: "64px",
              borderRadius: "50%",
              opacity: 0.85,
              filter: "blur(0.5px)",
              transition: "opacity 0.5s",
            }}
          />
          {/* glassy overlay */}
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.22) 0%, transparent 60%)",
          }} />
          {/* border */}
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: "50%",
            border: `0.5px solid ${gold}${aligned ? "0.5" : "0.2"})`,
            transition: "border-color 0.6s",
          }} />
        </div>

        <span style={{
          fontSize: "7px",
          letterSpacing: "0.2em",
          color: aligned ? `${gold}0.7)` : "rgba(255,255,255,0.2)",
          fontFamily: "monospace",
          transition: "color 0.6s",
        }}>
          {isFormed ? "RESONANT" : aligned ? "ALIGNED" : "TRACKING"}
        </span>
      </div>

      {/* ── ROLL INDICATOR (thin line, top-left under top bar) ──── */}
      <div style={{
        position: "fixed", top: "52px", left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100, pointerEvents: "none",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <div style={{
          width: "160px", height: "1px",
          background: "rgba(255,255,255,0.06)",
          position: "relative",
          borderRadius: "2px",
        }}>
          {/* Target zone: ±2° around 18° */}
          <div style={{
            position: "absolute",
            left: `${((18 - 2 + 45) / 90) * 100}%`,
            width: `${(4 / 90) * 100}%`,
            top: 0, height: "100%",
            background: `${emerald}0.4)`,
            borderRadius: "2px",
          }} />
          {/* Current thumb */}
          <div style={{
            position: "absolute",
            left: `${((roll + 45) / 90) * 100}%`,
            top: "-4px",
            transform: "translateX(-50%)",
            width: "8px", height: "8px",
            borderRadius: "50%",
            background: aligned ? `${gold}0.9)` : "rgba(255,255,255,0.35)",
            boxShadow: aligned ? `0 0 8px ${gold}0.6)` : "none",
            transition: "left 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.5s",
          }} />
        </div>
      </div>
    </>
  );
}
