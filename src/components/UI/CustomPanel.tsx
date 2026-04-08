import type { CustomConfig, StepDef } from "../../types";

const W  = "rgba(180,95,65,";
const CR = "rgba(100,60,40,";

const BASE_ANGLE = 20;
const DEFAULT_ANGLES = [13, 20, 40];

interface Props {
  config: CustomConfig;
  allSteps: StepDef[];
  onChange: (config: CustomConfig) => void;
  onClose: () => void;
}

function StepRow({
  step, enabled, canUp, canDown,
  onToggle, onMoveUp, onMoveDown,
}: {
  step: StepDef; enabled: boolean;
  canUp: boolean; canDown: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const axisColor = step.axis2
    ? `${W}0.55)` : step.axis === "roll"
    ? `${CR}0.4)` : step.axis === "pitch"
    ? `${W}0.6)` : `${CR}0.5)`;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "6px 0",
      borderBottom: `0.5px solid ${CR}0.08)`,
      opacity: enabled ? 1 : 0.38,
      transition: "opacity 0.2s",
    }}>
      {/* toggle */}
      <div
        onClick={onToggle}
        style={{
          width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0,
          border: `1px solid ${W}${enabled ? "0.6" : "0.25"})`,
          background: enabled ? `${W}0.15)` : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}
      >
        {enabled && (
          <svg width="9" height="9" viewBox="0 0 9 9">
            <polyline points="1.5,4.5 3.5,6.5 7.5,2.5" fill="none"
              stroke={`${W}0.85)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* label */}
      <span style={{
        flex: 1, fontSize: "11px", letterSpacing: "0.06em",
        color: `${CR}0.72)`, fontFamily: "'DM Sans',sans-serif",
      }}>
        {step.label}
      </span>

      {/* axis badge */}
      <span style={{
        fontSize: "7px", letterSpacing: "0.12em", fontFamily: "monospace",
        color: axisColor, minWidth: "24px", textAlign: "center",
      }}>
        {step.axis2 ? `${step.axis[0]}+${step.axis2[0]}` : step.axis.toUpperCase()}
      </span>

      {/* up / down */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {(["up", "down"] as const).map((dir) => {
          const disabled = dir === "up" ? !canUp : !canDown;
          return (
            <div
              key={dir}
              onClick={disabled ? undefined : dir === "up" ? onMoveUp : onMoveDown}
              style={{
                width: "14px", height: "14px", borderRadius: "3px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: disabled ? "default" : "pointer",
                background: disabled ? "transparent" : `${CR}0.06)`,
                opacity: disabled ? 0.25 : 0.8,
                transition: "opacity 0.15s",
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8">
                {dir === "up"
                  ? <polyline points="1,6 4,2 7,6" fill="none" stroke={`${CR}0.65)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <polyline points="1,2 4,6 7,2" fill="none" stroke={`${CR}0.65)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                }
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CustomPanel({ config, allSteps, onChange, onClose }: Props) {
  function setPresetAngle(idx: number, raw: string) {
    const v = parseInt(raw);
    if (isNaN(v)) return;
    const angle = Math.max(5, Math.min(60, v));
    const presets = config.presets.map((p, i) =>
      i === idx ? { ...p, angle } : p
    ) as CustomConfig["presets"];
    onChange({ ...config, presets });
  }

  function nudgeAngle(idx: number, delta: number) {
    const angle = Math.max(5, Math.min(60, config.presets[idx].angle + delta));
    const presets = config.presets.map((p, i) =>
      i === idx ? { ...p, angle } : p
    ) as CustomConfig["presets"];
    onChange({ ...config, presets });
  }

  function toggleStep(id: number) {
    const inOrder = config.stepOrder.includes(id);
    const stepOrder = inOrder
      ? config.stepOrder.filter(x => x !== id)
      : [...config.stepOrder, id];
    if (stepOrder.length === 0) return; // keep at least 1
    onChange({ ...config, stepOrder });
  }

  function moveStep(id: number, dir: "up" | "down") {
    const arr = [...config.stepOrder];
    const i = arr.indexOf(id);
    if (i < 0) return;
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange({ ...config, stepOrder: arr });
  }

  // Build display list: enabled steps (in order) then disabled steps
  const enabledIds = new Set(config.stepOrder);
  const orderedSteps = [
    ...config.stepOrder.map(id => allSteps.find(s => s.id === id)!).filter(Boolean),
    ...allSteps.filter(s => !enabledIds.has(s.id)),
  ];

  return (
    <div style={{
      position: "fixed", bottom: "1.8rem", right: "1.8rem",
      zIndex: 300,
      width: "260px",
      background: "rgba(255,248,240,0.82)",
      backdropFilter: "blur(18px)",
      borderRadius: "18px",
      border: `0.5px solid ${W}0.25)`,
      boxShadow: `0 8px 32px ${CR}0.12), 0 2px 8px ${CR}0.08)`,
      display: "flex", flexDirection: "column",
      maxHeight: "72vh",
      overflow: "hidden",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 10px",
        borderBottom: `0.5px solid ${CR}0.1)`,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: "11px", letterSpacing: "0.22em",
          color: `${CR}0.55)`, fontFamily: "'DM Sans',sans-serif", fontWeight: 300,
        }}>
          CUSTOM
        </span>
        <div
          onClick={onClose}
          style={{
            width: "20px", height: "20px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", background: `${CR}0.06)`,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="2" y1="2" x2="8" y2="8" stroke={`${CR}0.5)`} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="2" x2="2" y2="8" stroke={`${CR}0.5)`} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>

        {/* ── Section 1: Amplitude presets ── */}
        <div style={{ padding: "12px 16px 8px" }}>
          <span style={{
            fontSize: "8px", letterSpacing: "0.28em",
            color: `${CR}0.35)`, fontFamily: "monospace",
            display: "block", marginBottom: "10px",
          }}>
            幅度预设
          </span>
          {config.presets.map((preset, idx) => (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: "10px",
              marginBottom: "8px",
            }}>
              <span style={{
                width: "16px", fontSize: "11px", letterSpacing: "0.04em",
                color: `${CR}0.8)`, fontFamily: "'DM Sans',sans-serif",
                textAlign: "center", flexShrink: 0,
              }}>{preset.label}</span>

              {/* − button */}
              <div onClick={() => nudgeAngle(idx, -1)} style={nudgeBtn}>
                <svg width="8" height="2" viewBox="0 0 8 2">
                  <line x1="1" y1="1" x2="7" y2="1" stroke={`${CR}0.55)`} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* angle input */}
              <input
                type="number"
                value={preset.angle}
                onChange={e => setPresetAngle(idx, e.target.value)}
                style={{
                  width: "36px", textAlign: "center",
                  background: `${CR}0.05)`,
                  border: `0.5px solid ${W}0.22)`,
                  borderRadius: "6px",
                  padding: "3px 4px",
                  fontSize: "11px", letterSpacing: "0.04em",
                  color: `${CR}0.9)`,
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "10px", color: `${CR}0.6)`, fontFamily: "monospace", marginLeft: "-6px" }}>°</span>

              {/* + button */}
              <div onClick={() => nudgeAngle(idx, 1)} style={nudgeBtn}>
                <svg width="8" height="8" viewBox="0 0 8 8">
                  <line x1="4" y1="1" x2="4" y2="7" stroke={`${CR}0.55)`} strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="1" y1="4" x2="7" y2="4" stroke={`${CR}0.55)`} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* reset single */}
              {preset.angle !== DEFAULT_ANGLES[idx] && (
                <div
                  onClick={() => setPresetAngle(idx, String(DEFAULT_ANGLES[idx]))}
                  style={{
                    width: "24px", height: "24px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "14px",
                    color: `${W}0.8)`, fontFamily: "monospace",
                    cursor: "pointer", borderRadius: "6px",
                    border: `0.5px solid ${W}0.3)`,
                    background: `${W}0.07)`,
                    userSelect: "none", flexShrink: 0,
                  }}
                >
                  ↺
                </div>
              )}

              {/* scale hint */}
              <span style={{
                fontSize: "8px", color: `${W}0.65)`, fontFamily: "monospace",
                marginLeft: "auto",
              }}>
                ×{(preset.angle / BASE_ANGLE).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* divider */}
        <div style={{ height: "0.5px", background: `${CR}0.08)`, margin: "0 16px" }} />

        {/* ── Section 2: Step order ── */}
        <div style={{ padding: "12px 16px 16px" }}>
          <span style={{
            fontSize: "8px", letterSpacing: "0.28em",
            color: `${CR}0.35)`, fontFamily: "monospace",
            display: "block", marginBottom: "6px",
          }}>
            练习步骤
          </span>
          {orderedSteps.map((step, listIdx) => {
            const enabled = enabledIds.has(step.id);
            const orderIdx = config.stepOrder.indexOf(step.id);
            return (
              <StepRow
                key={step.id}
                step={step}
                enabled={enabled}
                canUp={enabled && orderIdx > 0}
                canDown={enabled && orderIdx < config.stepOrder.length - 1}
                onToggle={() => toggleStep(step.id)}
                onMoveUp={() => moveStep(step.id, "up")}
                onMoveDown={() => moveStep(step.id, "down")}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const nudgeBtn: React.CSSProperties = {
  width: "20px", height: "20px", borderRadius: "5px",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
  background: "rgba(100,60,40,0.06)",
  flexShrink: 0,
};
