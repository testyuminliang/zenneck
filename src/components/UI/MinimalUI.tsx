import type { StepDef, StepPhase, HeadRotation, CustomConfig } from "../../types";

interface Props {
  activeStep: StepDef;
  phase: StepPhase;
  holdProgress: number;
  resonanceProgress: number;
  stepIndex: number;
  totalSteps: number;
  headRotation: HeadRotation;
  guidedMode: boolean;
  onToggleGuidedMode: () => void;
  activePresetIdx: number;
  onPresetChange: (idx: number) => void;
  customConfig: CustomConfig;
  onCustomOpen: () => void;
  completionPhase: 'idle' | 'ripple' | 'clearing' | 'emerging';
}

// ── Palette ───────────────────────────────────────────────────────────
const W  = "rgba(180,95,65,";   // warm terracotta
const CR = "rgba(100,60,40,";   // cream-dark (text)

// ── Hold ring geometry ────────────────────────────────────────────────
const R = 52;
const CIRC = 2 * Math.PI * R;

// ── Direction arrow (SVG, inside guide circle) ────────────────────────
const ARROW_ROT: Record<StepDef["arrowDir"], number> = {
  up: 0, "up-right": 45, right: 90, "down-right": 135,
  down: 180, "down-left": 225, left: 270, "up-left": 315,
};

function Arrow({ dir, faded }: { dir: StepDef["arrowDir"]; faded: boolean }) {
  const op = faded ? 0.25 : 0.85;
  const rot = ARROW_ROT[dir];
  return (
    <svg
      width="32" height="32"
      viewBox="0 0 32 32"
      style={{
        position: "absolute", top: "50%", left: "50%",
        transform: `translate(-50%, -50%) rotate(${rot}deg)`,
        opacity: op,
        transition: "opacity 0.4s",
      }}
    >
      {/* shaft */}
      <line x1="16" y1="24" x2="16" y2="10" stroke={`rgba(180,95,65,1)`} strokeWidth="2" strokeLinecap="round" />
      {/* arrowhead */}
      <polyline points="10,15 16,8 22,15" fill="none" stroke={`rgba(180,95,65,1)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Tilt guide for roll steps (mini horizon dial) ─────────────────────
function HorizonDial({ roll, targetRoll }: { roll: number; targetRoll: number; inZone: boolean }) {
  const reached = targetRoll > 0 ? roll >= targetRoll : roll <= targetRoll;
  return (
    <div style={{
      position: "fixed", top: "52px", left: "50%",
      transform: "translateX(-50%)",
      zIndex: 100, pointerEvents: "none",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
    }}>
      <div style={{ position: "relative", width: "44px", height: "44px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${CR}0.2)`, background: "rgba(255,248,240,0.45)", backdropFilter: "blur(6px)" }} />
        {/* target line — glows when reached */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: "28px", height: reached ? "2px" : "1px",
          marginLeft: "-14px", marginTop: reached ? "-1px" : "-0.5px",
          borderRadius: "1px",
          background: reached ? `${W}0.85)` : `${CR}0.35)`,
          boxShadow: reached ? `0 0 6px ${W}0.6)` : "none",
          transform: `rotate(${targetRoll}deg)`,
          transition: "all 0.3s ease",
        }} />
        {/* live bar */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: "30px", height: "1.5px",
          marginLeft: "-15px", marginTop: "-0.75px",
          borderRadius: "2px",
          background: reached
            ? `linear-gradient(90deg,${W}0.3),${W}0.9),${W}0.3))`
            : `linear-gradient(90deg,${CR}0.1),${CR}0.55),${CR}0.1))`,
          transform: `rotate(${roll}deg)`,
          transition: "background 0.4s",
        }} />
        {/* pivot */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "5px", height: "5px", marginLeft: "-2.5px", marginTop: "-2.5px", borderRadius: "50%", background: reached ? `${W}0.9)` : `${CR}0.35)`, boxShadow: reached ? `0 0 6px ${W}0.55)` : "none", transition: "all 0.4s" }} />
      </div>
      <span style={{ fontSize: "7px", letterSpacing: "0.14em", fontFamily: "monospace", color: reached ? `${W}0.75)` : `${CR}0.3)` }}>
        {roll >= 0 ? "+" : ""}{roll.toFixed(1)}°
      </span>
    </div>
  );
}

// ── Pitch guide (horizontal bar translates up/down) ───────────────────
function PitchDial({ pitch, targetPitch, offsetX = 0 }: { pitch: number; targetPitch: number; inZone: boolean; offsetX?: number }) {
  const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
  const toY = (v: number) => clamp(v, 45) / 45 * 15;
  const liveY  = toY(pitch);
  const ghostY = toY(targetPitch);
  const reached = targetPitch > 0 ? pitch >= targetPitch : pitch <= targetPitch;
  return (
    <div style={{
      position: "fixed", top: "52px", left: "50%",
      transform: `translateX(calc(-50% + ${offsetX}px))`,
      zIndex: 100, pointerEvents: "none",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
    }}>
      <div style={{ position: "relative", width: "44px", height: "44px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${CR}0.2)`, background: "rgba(255,248,240,0.45)", backdropFilter: "blur(6px)" }} />
        <div style={{ position: "absolute", top: "8px", left: "50%", width: "1px", height: "28px", marginLeft: "-0.5px", background: `${CR}0.1)` }} />
        {/* target line — glows when reached */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "28px", height: reached ? "2px" : "1px", marginLeft: "-14px", marginTop: `calc(${reached ? "-1px" : "-0.5px"} + ${ghostY}px)`, borderRadius: "1px", background: reached ? `${W}0.85)` : `${CR}0.35)`, boxShadow: reached ? `0 0 6px ${W}0.6)` : "none", transition: "all 0.3s ease" }} />
        {/* live bar */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "30px", height: "1.5px", marginLeft: "-15px", marginTop: `calc(-0.75px + ${liveY}px)`, borderRadius: "2px", background: reached ? `linear-gradient(90deg,${W}0.3),${W}0.9),${W}0.3))` : `linear-gradient(90deg,${CR}0.1),${CR}0.55),${CR}0.1))`, transition: "background 0.4s" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "5px", height: "5px", marginLeft: "-2.5px", marginTop: "-2.5px", borderRadius: "50%", background: reached ? `${W}0.9)` : `${CR}0.35)`, boxShadow: reached ? `0 0 6px ${W}0.55)` : "none", transition: "all 0.4s" }} />
      </div>
      <span style={{ fontSize: "7px", letterSpacing: "0.14em", fontFamily: "monospace", color: reached ? `${W}0.75)` : `${CR}0.3)` }}>
        {pitch >= 0 ? "+" : ""}{pitch.toFixed(1)}°
      </span>
    </div>
  );
}

// ── Yaw guide (vertical bar translates left/right) ────────────────────
function YawDial({ yaw, targetYaw, offsetX = 0 }: { yaw: number; targetYaw: number; inZone: boolean; offsetX?: number }) {
  const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
  const toX = (v: number) => clamp(v, 20) / 20 * 15;
  const liveX  = toX(yaw);
  const ghostX = toX(targetYaw);
  const reached = targetYaw > 0 ? yaw >= targetYaw : yaw <= targetYaw;
  return (
    <div style={{
      position: "fixed", top: "52px", left: "50%",
      transform: `translateX(calc(-50% + ${offsetX}px))`,
      zIndex: 100, pointerEvents: "none",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
    }}>
      <div style={{ position: "relative", width: "44px", height: "44px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${CR}0.2)`, background: "rgba(255,248,240,0.45)", backdropFilter: "blur(6px)" }} />
        <div style={{ position: "absolute", left: "8px", top: "50%", height: "1px", width: "28px", marginTop: "-0.5px", background: `${CR}0.1)` }} />
        {/* target line — glows when reached */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: reached ? "2px" : "1px", height: "28px", marginTop: "-14px", marginLeft: `calc(${reached ? "-1px" : "-0.5px"} + ${ghostX}px)`, borderRadius: "1px", background: reached ? `${W}0.85)` : `${CR}0.35)`, boxShadow: reached ? `0 0 6px ${W}0.6)` : "none", transition: "all 0.3s ease" }} />
        {/* live bar */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "1.5px", height: "30px", marginTop: "-15px", marginLeft: `calc(-0.75px + ${liveX}px)`, borderRadius: "2px", background: reached ? `linear-gradient(180deg,${W}0.3),${W}0.9),${W}0.3))` : `linear-gradient(180deg,${CR}0.1),${CR}0.55),${CR}0.1))`, transition: "background 0.4s" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "5px", height: "5px", marginLeft: "-2.5px", marginTop: "-2.5px", borderRadius: "50%", background: reached ? `${W}0.9)` : `${CR}0.35)`, boxShadow: reached ? `0 0 6px ${W}0.55)` : "none", transition: "all 0.4s" }} />
      </div>
      <span style={{ fontSize: "7px", letterSpacing: "0.14em", fontFamily: "monospace", color: reached ? `${W}0.75)` : `${CR}0.3)` }}>
        {yaw >= 0 ? "+" : ""}{yaw.toFixed(1)}°
      </span>
    </div>
  );
}


export default function MinimalUI({
  activeStep, phase, holdProgress, resonanceProgress,
  stepIndex, totalSteps, headRotation,
  guidedMode, onToggleGuidedMode,
  activePresetIdx, onPresetChange, customConfig, onCustomOpen,
  completionPhase,
}: Props) {
  const inZone = phase === "hold" || phase === "resonance" || phase === "pause";
  const isResonating = phase === "resonance" || phase === "pause";

  // How many rings to show during resonance
  const ringScale = 1 + resonanceProgress * 3.5;
  const ringOpacity = isResonating ? Math.max(0, 1 - resonanceProgress) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,wght@0,200;0,300;1,300&display=swap');
        @keyframes breathe {
          0%,100% { opacity: 0.45; }
          50%      { opacity: 0.9; }
        }
        @keyframes dot-breathe {
          0%,100% { transform: translate(-50%,-50%) scale(1);    opacity: 0.9; }
          50%      { transform: translate(-50%,-50%) scale(1.18); opacity: 1;   }
        }
        @keyframes dot-halo {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.55; }
          100% { transform: translate(-50%,-50%) scale(3.8); opacity: 0;    }
        }
        @keyframes ring-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(4.5); opacity: 0; }
        }
        @keyframes text-echo {
          0%   { opacity: 0.45; text-shadow: 0 0 0px rgba(180,95,65,0); letter-spacing: 0.25em; }
          50%  { opacity: 0.88; text-shadow: 0 0 18px rgba(180,95,65,0.35), 0 0 32px rgba(180,95,65,0.15); letter-spacing: 0.35em; }
          100% { opacity: 0.45; text-shadow: 0 0 0px rgba(180,95,65,0); letter-spacing: 0.25em; }
        }
        @keyframes completion-ring {
          0%   { transform: scale(1);   opacity: 0.75; }
          60%  { opacity: 0.35; }
          100% { transform: scale(8);   opacity: 0; }
        }
        @keyframes hint-cycle {
          0%,40%   { opacity: 0.55; transform: translateY(0px); }
          50%      { opacity: 0.8;  transform: translateY(-1px); }
          60%,100% { opacity: 0.55; transform: translateY(0px); }
        }
      `}</style>

      {/* ── NORMAL UI — opacity-controlled for smooth transition ── */}
      <div style={{
        opacity: completionPhase === 'idle' || completionPhase === 'emerging' ? 1 : 0,
        transition: completionPhase === 'emerging' ? 'opacity 3.5s ease 1.0s' : 'opacity 0.3s ease',
        pointerEvents: completionPhase === 'ripple' || completionPhase === 'clearing' ? 'none' : 'auto',
      }}>
      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "42px", display: "flex", alignItems: "center",
        padding: "0 2rem", pointerEvents: "none",
      }}>
        <div style={{ flex: 1, height: "0.5px", background: `linear-gradient(90deg,transparent,${W}0.3))` }} />
        <div style={{ padding: "0 20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "9px", letterSpacing: "0.3em", color: `${CR}0.5)`, fontFamily: "'DM Sans',sans-serif", fontWeight: 300 }}>
            NECK · SPINE RESET
          </span>
          <span style={{ fontSize: "9px", color: `${W}0.35)` }}>•</span>
          <span style={{ fontSize: "9px", letterSpacing: "0.2em", color: `${CR}0.4)`, fontFamily: "monospace" }}>
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>
        <div style={{ flex: 1, height: "0.5px", background: `linear-gradient(90deg,${W}0.3),transparent)` }} />
      </div>

      {/* ── AXIS DIALS (guided mode only) ───────────────────────── */}
      {guidedMode && activeStep.axis === "roll" && (
        <HorizonDial roll={headRotation.roll} targetRoll={activeStep.target} inZone={inZone} />
      )}
      {guidedMode && activeStep.axis === "pitch" && !activeStep.axis2 && (
        <PitchDial pitch={headRotation.pitch} targetPitch={activeStep.target} inZone={inZone} />
      )}
      {guidedMode && activeStep.axis === "yaw" && !activeStep.axis2 && (
        <YawDial yaw={headRotation.yaw} targetYaw={activeStep.target} inZone={inZone} />
      )}
      {/* diagonal: yaw + pitch side-by-side */}
      {guidedMode && activeStep.axis === "yaw" && activeStep.axis2 === "pitch" && (
        <>
          <YawDial   yaw={headRotation.yaw}     targetYaw={activeStep.target}           inZone={inZone} offsetX={-30} />
          <PitchDial pitch={headRotation.pitch}  targetPitch={activeStep.target2 ?? 0}  inZone={inZone} offsetX={30}  />
        </>
      )}

      {/* ── RESONANCE BURST RINGS ───────────────────────────────── */}
      {guidedMode && isResonating && [0, 1, 2].map((i) => (
        <div key={i} style={{
          position: "fixed", top: "50%", left: "50%",
          width: "120px", height: "120px",
          marginLeft: "-60px", marginTop: "-60px",
          borderRadius: "50%",
          border: `1.5px solid ${W}${(0.7 - i * 0.15).toFixed(2)})`,
          animation: `ring-pulse 1.6s ease-out ${i * 0.28}s forwards`,
          pointerEvents: "none", zIndex: 200,
        }} />
      ))}

      {/* ── CENTRAL RING ────────────────────────────────────────── */}
      <div
        onClick={!guidedMode ? onToggleGuidedMode : undefined}
        style={{
          position: "fixed", top: "50%", left: "50%",
          width: "120px", height: "120px",
          marginLeft: "-60px", marginTop: "-60px",
          zIndex: 100,
          cursor: !guidedMode ? "pointer" : "default",
          pointerEvents: "auto",
          opacity: isResonating ? 0 : guidedMode ? Math.max(0, 1 - holdProgress * 1.4) : 1,
          transition: isResonating ? "opacity 1.2s ease" : "opacity 0.6s ease",
        }}
      >

          {/* SVG: track + hold fill ring (guided only) */}
          <svg width="120" height="120" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <circle cx="60" cy="60" r={R} fill="none" stroke={`${W}0.1)`} strokeWidth="1.5" />
            {guidedMode && (
              <circle
                cx="60" cy="60" r={R} fill="none"
                stroke={isResonating ? `${W}0.9)` : inZone ? `${W}0.65)` : `${W}0.18)`}
                strokeWidth={isResonating ? "2.5" : inZone ? "2" : "1"}
                strokeDasharray={`${CIRC * holdProgress} ${CIRC}`}
                strokeLinecap="round"
                style={{ transition: "stroke 0.4s, stroke-width 0.3s" }}
              />
            )}
          </svg>

          {/* Resonance scale ring (expands) */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: "96px", height: "96px",
            marginLeft: "-48px", marginTop: "-48px",
            borderRadius: "50%",
            border: `1px solid ${W}${ringOpacity.toFixed(2)})`,
            transform: `scale(${isResonating ? ringScale : 1})`,
            transition: isResonating ? "transform 0.05s linear, opacity 0.05s" : "none",
            opacity: ringOpacity,
            pointerEvents: "none",
          }} />

          {/* Inner frosted disc */}
          <div style={{
            position: "absolute", inset: "12px", borderRadius: "50%",
            background: inZone
              ? `rgba(255,240,228,${0.45 + holdProgress * 0.3})`
              : "rgba(255,248,240,0.28)",
            backdropFilter: "blur(5px)",
            border: `0.5px solid ${W}${inZone ? 0.25 : 0.08})`,
            transition: "all 0.5s",
          }} />

          {/* Free mode: glassmorphic 导 start button */}
          {!guidedMode && (
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              pointerEvents: "none",
            }}>
              <span style={{
                fontSize: "13px", letterSpacing: "0.28em",
                fontFamily: "'DM Serif Display', serif",
                fontStyle: "italic",
                color: `${CR}0.75)`,
                animation: "text-echo 3.6s ease-in-out infinite",
                userSelect: "none",
              }}>开始</span>
              <span style={{
                fontSize: "7px", letterSpacing: "0.3em",
                color: `${CR}0.35)`,
                fontFamily: "monospace",
                animation: "text-echo 3.6s ease-in-out infinite 0.4s",
                userSelect: "none",
              }}>START</span>
            </div>
          )}

          {/* Direction arrow — guided mode only, fades when holding */}
          {guidedMode && !isResonating && (
            <Arrow dir={activeStep.arrowDir} faded={phase === "hold" && holdProgress > 0.4} />
          )}

          {/* Resonance dot — guided mode only */}
          {guidedMode && isResonating && (<>
            {/* halo 1 */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              width: "10px", height: "10px", marginLeft: "-5px", marginTop: "-5px",
              borderRadius: "50%",
              background: `${W}0.45)`,
              animation: "dot-halo 2.4s ease-out infinite",
              pointerEvents: "none",
            }} />
            {/* halo 2 — offset phase */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              width: "10px", height: "10px", marginLeft: "-5px", marginTop: "-5px",
              borderRadius: "50%",
              background: `${W}0.35)`,
              animation: "dot-halo 2.4s ease-out 1.2s infinite",
              pointerEvents: "none",
            }} />
            {/* core dot */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              width: "8px", height: "8px", marginLeft: "-4px", marginTop: "-4px",
              borderRadius: "50%",
              background: `${W}0.92)`,
              animation: "dot-breathe 2.8s ease-in-out infinite",
              pointerEvents: "none",
            }} />
          </>)}
        </div>

      {/* ── FREE MODE HINTS — below circle ──────────────────────── */}
      {!guidedMode && (
        <div style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translateX(-50%)",
          marginTop: "82px",
          zIndex: 100, pointerEvents: "none",
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
          width: "220px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
            <span style={{
              fontSize: "14px", letterSpacing: "0.12em",
              color: `${CR}0.7)`,
              fontFamily: "'DM Serif Display', serif", fontStyle: "italic",
              animation: "hint-cycle 4s ease-in-out infinite",
            }}>
              轻轻转动你的头部
            </span>
            <span style={{
              fontSize: "9px", letterSpacing: "0.22em",
              color: `${CR}0.42)`, fontFamily: "monospace",
              animation: "hint-cycle 4s ease-in-out infinite 0.3s",
            }}>
              EXPLORE THE SPACE
            </span>
          </div>
          <div style={{ width: "1px", height: "12px", background: `${W}0.3)` }} />
          <span style={{
            fontSize: "11px", letterSpacing: "0.18em",
            color: `${W}0.7)`, fontFamily: "'DM Sans',sans-serif", fontWeight: 300,
            animation: "hint-cycle 4s ease-in-out infinite 1.8s",
          }}>
            点击圆圈开始引导练习
          </span>
        </div>
      )}

      {/* ── CAMERA PERMISSION NOTICE (free mode only) ───────────── */}
      {!guidedMode && (
        <div style={{
          position: "fixed", top: "52px", left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100, pointerEvents: "none",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <div style={{
            width: "5px", height: "5px", borderRadius: "50%",
            background: `${W}0.55)`,
            animation: "breathe 3s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: "9px", letterSpacing: "0.14em",
            color: `${CR}0.5)`, fontFamily: "'DM Sans',sans-serif", fontWeight: 300,
            lineHeight: 1.6,
          }}>
            请确保摄像头权限已开启
          </span>
        </div>
      )}

      {/* ── STEP LABEL — fixed below circle ────────────────────── */}
      {guidedMode && !isResonating && (
        <div style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translateX(-50%)",
          marginTop: "78px",
          zIndex: 100, pointerEvents: "none",
          textAlign: "center", display: "flex", flexDirection: "column", gap: "5px",
          opacity: Math.max(0, 1 - holdProgress * 1.4),
          transition: "opacity 0.6s ease",
        }}>
          <span style={{
            fontSize: "13px", letterSpacing: "0.14em",
            color: inZone ? `${W}0.9)` : `${CR}0.55)`,
            fontFamily: "'DM Serif Display', serif", fontStyle: "italic",
            animation: phase === "guide" ? "breathe 3s ease-in-out infinite" : "none",
            transition: "color 0.5s",
          }}>
            {phase === "hold" ? "保持" : activeStep.label}
          </span>
          <span style={{
            fontSize: "8px", letterSpacing: "0.28em",
            color: `${CR}0.3)`, fontFamily: "monospace",
          }}>
            {phase === "hold"
              ? `HOLD · ${Math.round(holdProgress * 100)}%`
              : activeStep.cue.toUpperCase()}
          </span>
        </div>
      )}

      {/* ── STEP PROGRESS DOTS (guided mode, bottom center) ────── */}
      {guidedMode && <div style={{
        position: "fixed", bottom: "2rem", left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100, pointerEvents: "none",
        display: "flex", gap: "8px", alignItems: "center",
      }}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = i < stepIndex || (i === stepIndex && isResonating);
          const active = i === stepIndex;
          return (
            <div key={i} style={{
              width: active && !done ? "20px" : "6px",
              height: "6px",
              borderRadius: "3px",
              background: done
                ? `${W}0.75)`
                : active
                  ? `${W}${0.35 + holdProgress * 0.55})`
                  : `${CR}0.18)`,
              transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            }} />
          );
        })}
      </div>}

      {/* ── AMPLITUDE PRESETS (bottom right) ────────────────────── */}
      <div style={{
        position: "fixed", bottom: "1.8rem", right: "1.8rem",
        zIndex: 100, pointerEvents: "auto",
        display: "flex", gap: "4px",
        background: "rgba(255,248,240,0.55)",
        backdropFilter: "blur(10px)",
        borderRadius: "14px",
        padding: "8px",
        border: `0.5px solid ${W}0.2)`,
      }}>
        {customConfig.presets.map((preset, idx) => {
          const active = idx === activePresetIdx;
          return (
            <div
              key={idx}
              onClick={() => onPresetChange(idx)}
              style={{
                width: "40px", height: "40px", borderRadius: "8px",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "1px",
                cursor: "pointer",
                background: active ? `${W}0.85)` : "rgba(255,248,240,0.5)",
                border: `1px solid ${W}${active ? "0.7" : "0.2"})`,
                transition: "all 0.25s",
                userSelect: "none",
              }}
            >
              <span style={{ fontSize: "10px", letterSpacing: "0.05em", fontFamily: "'DM Sans',sans-serif", color: active ? "rgba(255,248,240,0.95)" : `${CR}0.55)` }}>{preset.label}</span>
              <span style={{ fontSize: "7px", letterSpacing: "0.04em", fontFamily: "monospace", color: active ? "rgba(255,248,240,0.7)" : `${CR}0.3)` }}>{preset.angle}°</span>
            </div>
          );
        })}
        {/* 定制 button */}
        <div
          onClick={onCustomOpen}
          style={{
            width: "40px", height: "40px", borderRadius: "8px",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "1px",
            cursor: "pointer",
            background: "rgba(255,248,240,0.5)",
            border: `1px solid ${W}0.2)`,
            transition: "all 0.25s",
            userSelect: "none",
          }}
        >
          <span style={{ fontSize: "10px", letterSpacing: "0.05em", fontFamily: "'DM Sans',sans-serif", color: `${CR}0.55)` }}>定制</span>
          <span style={{ fontSize: "7px", letterSpacing: "0.04em", fontFamily: "monospace", color: `${CR}0.3)` }}>CUSTOM</span>
        </div>
      </div>
      </div>

      {/* ── COMPLETION RIPPLES ──────────────────────────────────── */}
      {(completionPhase === 'ripple' || completionPhase === 'clearing') && [0,1,2,3,4,5,6,7].map((i) => (
        <div key={i} style={{
          position: "fixed", top: "50%", left: "50%",
          width: "120px", height: "120px",
          marginLeft: "-60px", marginTop: "-60px",
          borderRadius: "50%",
          border: `${1.5 - i * 0.1}px solid ${W}${(0.8 - i * 0.08).toFixed(2)})`,
          animation: `completion-ring ${3.2 + i * 0.15}s ease-out ${i * 0.22}s forwards`,
          pointerEvents: "none", zIndex: 400,
        }} />
      ))}
    </>
  );
}
