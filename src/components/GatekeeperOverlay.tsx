import { getTheme } from "../themes";
import type { ThemeKey } from "../types";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface Props {
  onMeditate: () => void;
  onLater:    () => void;
  themeKey?:  ThemeKey;
}

export default function GatekeeperOverlay({ onMeditate, onLater, themeKey }: Props) {
  const { W, CR, bgBase } = getTheme(themeKey);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300&display=swap');
        @keyframes gk-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .gk-start:hover { opacity:.88; transform:translateY(-1px); }
        .gk-later:hover { background: ${W}0.07) !important; }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: hexToRgba(bgBase, 0.92),
        backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        animation: "gk-in 0.45s cubic-bezier(.34,1.2,.64,1) both",
      }}>
        <span style={{
          fontSize: 24, fontFamily: "'DM Serif Display',serif", fontStyle: "italic",
          color: `${CR}0.6)`, marginBottom: 32, letterSpacing: "0.02em",
        }}>
          时间到了
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 220 }}>
          <button
            className="gk-start"
            onClick={onMeditate}
            style={{
              height: 50, borderRadius: 14,
              background: `${W}0.82)`, border: "none", cursor: "pointer",
              fontSize: 14, letterSpacing: "0.06em",
              color: "rgba(255,248,240,0.95)",
              fontFamily: "'DM Serif Display',serif", fontStyle: "italic",
              transition: "all 0.2s", outline: "none",
            }}
          >
            开始放松
          </button>

          <button
            className="gk-later"
            onClick={onLater}
            style={{
              height: 40, borderRadius: 14,
              background: "transparent", border: `0.5px solid ${W}0.22)`,
              cursor: "pointer", fontSize: 11, letterSpacing: "0.2em",
              color: `${CR}0.38)`, fontFamily: "monospace",
              transition: "all 0.2s", outline: "none",
            }}
          >
            稍后再说
          </button>
        </div>
      </div>
    </>
  );
}
