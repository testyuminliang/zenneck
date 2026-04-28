import type { CustomConfig, StepDef } from "../../types";
import type { Lang } from "../../lang";
import { t, presetLabel, stepLabel } from "../../lang";
import { getTheme, THEMES, THEME_ORDER } from "../../themes";

const BASE_ANGLE = 20;
const DEFAULT_ANGLES = [13, 20, 30];

interface Props {
  config: CustomConfig;
  allSteps: StepDef[];
  onChange: (config: CustomConfig) => void;
  onClose: () => void;
  onUploadBgm: (file: File) => Promise<void>;
  onClearBgm: () => Promise<void>;
  lang: Lang;
}

function StepRow({
  step, enabled, canUp, canDown,
  onToggle, onMoveUp, onMoveDown, lang, W, CR,
}: {
  step: StepDef; enabled: boolean;
  canUp: boolean; canDown: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  lang: Lang;
  W: string; CR: string;
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
        {stepLabel(step, lang)}
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

export default function CustomPanel({ config, allSteps, onChange, onClose, onUploadBgm, onClearBgm, lang }: Props) {
  const { W, CR, swatch } = getTheme(config.themeKey);

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
      height: "72vh",
      overflow: "hidden",
    }}>

      <style>{`
        .vol-slider { -webkit-appearance: none; appearance: none; height: 2px; border-radius: 1px; outline: none; background: transparent; }
        .vol-slider::-webkit-slider-runnable-track { height: 2px; border-radius: 1px; background: ${CR}0.15); }
        .vol-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 7px; height: 7px; border-radius: 50%; background: ${swatch}; margin-top: -2.5px; }
        .vol-slider::-moz-range-track { height: 2px; border-radius: 1px; background: ${CR}0.15); }
        .vol-slider::-moz-range-thumb { width: 7px; height: 7px; border-radius: 50%; background: ${swatch}; border: none; }
        .vol-slider:disabled::-webkit-slider-thumb { background: ${CR}0.25); }
        .vol-slider:disabled::-moz-range-thumb { background: ${CR}0.25); }
      `}</style>

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

        {/* ── Theme swatches ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {THEME_ORDER.map((key) => {
            const active = (config.themeKey ?? "terracotta") === key;
            return (
              <div
                key={key}
                onClick={() => onChange({ ...config, themeKey: key })}
                title={key}
                style={{
                  width: "13px", height: "13px", borderRadius: "50%",
                  background: THEMES[key].swatch,
                  cursor: "pointer",
                  boxShadow: active
                    ? `0 0 0 2px rgba(255,252,248,0.9), 0 0 0 3.5px ${THEMES[key].swatch}`
                    : "none",
                  transition: "box-shadow 0.2s",
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>

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

        {/* ── Section 0: Audio toggles ── */}
        <div style={{ padding: "12px 16px 10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* BGM / SFX / Voice toggles + volume sliders */}
          {(
            [
              { toggleKey: "bgmEnabled",       volKey: "bgmVolume",   labelKey: "bgm"        },
              { toggleKey: "sfxEnabled",        volKey: "sfxVolume",   labelKey: "sfx"        },
              { toggleKey: "voiceCuesEnabled",  volKey: "voiceVolume", labelKey: "voiceCues"  },
            ] as const
          ).map(({ toggleKey, volKey, labelKey }) => {
            const on  = config[toggleKey];
            const vol = config[volKey];
            return (
              <div key={toggleKey} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* icon toggle */}
                <div
                  onClick={() => onChange({ ...config, [toggleKey]: !on })}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    gap: "5px", padding: "5px 0", borderRadius: "8px",
                    border: `0.5px solid ${on ? `${W}0.35)` : `${CR}0.12)`}`,
                    background: on ? `${W}0.10)` : `${CR}0.04)`,
                    cursor: "pointer", transition: "all 0.2s", userSelect: "none",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 11 11">
                    {toggleKey === "voiceCuesEnabled" ? (
                      <path d="M2 4h1.5l2-2.5v7L3.5 6H2a.5.5 0 01-.5-.5v-1A.5.5 0 012 4zM7.5 3.5a3 3 0 010 4M9 2a5 5 0 010 7"
                        fill="none" stroke={`${on ? W : CR}${on ? "0.7" : "0.3"})`} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                    ) : toggleKey === "bgmEnabled" ? (
                      <>
                        <path d="M4 8.5 V3 L9 2 V7" fill="none" stroke={`${on ? W : CR}${on ? "0.7" : "0.3"})`} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="3.5" cy="8.8" r="1.1" fill={`${on ? W : CR}${on ? "0.7" : "0.3"})`} />
                        <circle cx="8.5" cy="7.3" r="1.1" fill={`${on ? W : CR}${on ? "0.7" : "0.3"})`} />
                      </>
                    ) : (
                      <>
                        <path d="M1.5 7 V4" stroke={`${on ? W : CR}${on ? "0.7" : "0.3"})`} strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M4 8.5 V2.5" stroke={`${on ? W : CR}${on ? "0.7" : "0.3"})`} strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M6.5 9.5 V1.5" stroke={`${on ? W : CR}${on ? "0.7" : "0.3"})`} strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M9 8 V3" stroke={`${on ? W : CR}${on ? "0.7" : "0.3"})`} strokeWidth="1.2" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                  <span style={{
                    fontSize: "9px", letterSpacing: "0.06em",
                    color: `${CR}${on ? "0.65" : "0.32"})`,
                    fontFamily: "'DM Sans',sans-serif",
                  }}>{t(labelKey, lang)}</span>
                </div>

                {/* slider + value — fixed short width */}
                <div style={{
                  width: "72px", flexShrink: 0, display: "flex", alignItems: "center", gap: "4px",
                  opacity: on ? 1 : 0.3, transition: "opacity 0.2s",
                }}>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={vol}
                    disabled={!on}
                    onChange={e => onChange({ ...config, [volKey]: parseFloat(e.target.value) })}
                    className="vol-slider"
                    style={{ width: "48px", flexShrink: 0, cursor: on ? "pointer" : "default", accentColor: swatch }}
                  />
                  <span style={{
                    fontSize: "8px", fontFamily: "monospace",
                    color: `${CR}0.4)`, width: "20px", textAlign: "right", flexShrink: 0,
                  }}>
                    {Math.round(vol * 100)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Custom BGM upload row */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "6px 10px", borderRadius: "9px",
            border: `0.5px solid ${config.customBgmName ? `${W}0.28)` : `${CR}0.10)`}`,
            background: config.customBgmName ? `${W}0.07)` : `${CR}0.03)`,
          }}>
            {/* upload icon + label */}
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", flex: 1, minWidth: 0 }}>
              <input
                type="file" accept="audio/*"
                style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) onUploadBgm(f); e.target.value = ""; }}
              />
              <svg width="11" height="11" viewBox="0 0 11 11" style={{ flexShrink: 0 }}>
                <path d="M5.5 7.5 V2" stroke={`${W}0.6)`} strokeWidth="1.3" strokeLinecap="round" />
                <path d="M3 4 L5.5 1.5 L8 4" fill="none" stroke={`${W}0.6)`} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1.5 9 H9.5" stroke={`${CR}0.35)`} strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              <span style={{
                fontSize: "10px", letterSpacing: "0.05em", fontFamily: "'DM Sans',sans-serif",
                color: `${CR}${config.customBgmName ? "0.65" : "0.38"})`,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {config.customBgmName ?? t('uploadMusic', lang)}
              </span>
            </label>

            {/* clear button */}
            {config.customBgmName && (
              <div
                onClick={onClearBgm}
                style={{
                  flexShrink: 0, width: "16px", height: "16px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", background: `${CR}0.08)`,
                }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8">
                  <line x1="2" y1="2" x2="6" y2="6" stroke={`${CR}0.45)`} strokeWidth="1.3" strokeLinecap="round" />
                  <line x1="6" y1="2" x2="2" y2="6" stroke={`${CR}0.45)`} strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* divider */}
        <div style={{ height: "0.5px", background: `${CR}0.08)`, margin: "0 16px" }} />

        {/* ── Section 1: Amplitude presets ── */}
        <div style={{ padding: "12px 16px 8px" }}>
          <span style={{
            fontSize: "8px", letterSpacing: "0.28em",
            color: `${CR}0.35)`, fontFamily: "monospace",
            display: "block", marginBottom: "10px",
          }}>
            {t('amplitude', lang)}
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
              }}>{presetLabel(preset.label, lang)}</span>

              {/* − button */}
              <div onClick={() => nudgeAngle(idx, -1)} style={nudgeBtn(CR)}>
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
              <div onClick={() => nudgeAngle(idx, 1)} style={nudgeBtn(CR)}>
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
            {t('steps', lang)}
          </span>
          {orderedSteps.map((step) => {
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
                lang={lang}
                W={W}
                CR={CR}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function nudgeBtn(CR: string): React.CSSProperties {
  return {
    width: "20px", height: "20px", borderRadius: "5px",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    background: `${CR}0.06)`,
    flexShrink: 0,
  };
}
