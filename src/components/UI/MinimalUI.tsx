import { CSSProperties } from "react";

const C = {
  bg: "#F5F2EE",
  bgWarm: "#F0EBE3",
  surface: "rgba(255,255,255,0.72)",
  border: "rgba(180,170,158,0.3)",
  borderSoft: "rgba(180,170,158,0.15)",
  stone: "#9C9188",
  stoneSoft: "#B8AFA5",
  stoneHint: "#D0C8C0",
  text: "#5C5550",
  textSoft: "#8A8078",
  textHint: "#B0A89E",
  accent: "#7A9E8A",
  accentSoft: "rgba(122,158,138,0.25)",
  accentGlow: "rgba(122,158,138,0.12)",
  warm: "#C4A882",
  warmSoft: "rgba(196,168,130,0.2)",
};

interface MinimalUIProps {
  alignmentProgress: number;
  isFormed: boolean;
  headRotation: { roll: number };
}

export default function MinimalUI({
  alignmentProgress,
  isFormed,
  headRotation,
}: MinimalUIProps) {
  const aligned = alignmentProgress > 0.7 || isFormed;
  const roll = headRotation.roll;

  const styles = {
    globalOverlay: {
      position: "fixed" as const,
      inset: 0,
      zIndex: 40,
      pointerEvents: "none" as const,
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
      backgroundSize: "300px 300px",
      opacity: 0.025,
    } as CSSProperties,

    topBar: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      padding: "0 2rem",
      height: "46px",
      background: "rgba(245,242,238,0.82)",
      backdropFilter: "blur(12px)",
      borderBottom: `1px solid ${C.borderSoft}`,
    } as CSSProperties,

    centerContent: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      paddingTop: "46px",
      paddingBottom: "120px",
      position: "relative" as const,
      zIndex: 30,
      pointerEvents: "auto" as const,
    } as CSSProperties,

    wordmark: {
      textAlign: "center" as const,
      marginBottom: "2rem",
    } as CSSProperties,

    title: {
      margin: 0,
      fontSize: "clamp(26px, 3.5vw, 40px)",
      letterSpacing: "0.4em",
      fontWeight: 400,
      color: aligned ? C.accent : C.text,
      fontFamily: "'DM Serif Display', serif",
      fontStyle: "italic" as const,
      transition: "color 0.8s",
    } as CSSProperties,

    subtitle: {
      margin: "5px 0 0",
      fontSize: "8px",
      letterSpacing: "0.4em",
      color: C.textHint,
      fontWeight: 300,
      textTransform: "uppercase" as const,
    } as CSSProperties,

    ringContainer: {
      position: "relative" as const,
      width: "340px",
      height: "340px",
    } as CSSProperties,

    rollBarContainer: {
      marginTop: "2.2rem",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    } as CSSProperties,

    rollBar: {
      width: "180px",
      height: "2px",
      borderRadius: "2px",
      background: C.borderSoft,
      position: "relative" as const,
    } as CSSProperties,

    rollThumb: {
      position: "absolute" as const,
      left: `${((roll + 45) / 90) * 100}%`,
      top: "-5px",
      transform: "translateX(-50%)",
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      background: aligned ? C.accent : C.stoneSoft,
      border: "2px solid white",
      boxShadow: aligned
        ? `0 0 10px rgba(122,158,138,0.4)`
        : "0 1px 4px rgba(0,0,0,0.08)",
      transition: "left 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.5s",
    } as CSSProperties,

    bottomBar: {
      position: "fixed" as const,
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      padding: "0 2rem 1.4rem",
      gap: "10px",
      background:
        "linear-gradient(to top, rgba(245,242,238,0.92) 0%, transparent 100%)",
    } as CSSProperties,

    faceWidget: {
      position: "fixed" as const,
      bottom: "2rem",
      right: "1.5rem",
      width: "112px",
      background: C.surface,
      backdropFilter: "blur(16px)",
      border: `1px solid ${C.border}`,
      borderRadius: "12px",
      padding: "11px",
      boxShadow: "0 2px 16px rgba(100,90,80,0.08)",
      zIndex: 30,
    } as CSSProperties,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@200;300;400&display=swap');
        @keyframes orb-breathe {
          0%,100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes breathe {
          0%,100% { opacity: 0.45; }
          50% { opacity: 0.9; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
      `}</style>

      {/* Global overlay grain */}
      <div style={styles.globalOverlay} />

      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div
          style={{
            flex: 1,
            height: "0.5px",
            background: `linear-gradient(90deg, transparent, ${C.borderSoft})`,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "0 18px",
          }}
        >
          <span
            style={{
              fontSize: "8px",
              letterSpacing: "0.28em",
              color: C.textHint,
              fontWeight: 300,
            }}
          >
            ALPHA
          </span>
          <div
            style={{
              width: "3px",
              height: "3px",
              borderRadius: "50%",
              background: aligned ? C.accent : C.stoneHint,
              transition: "background 0.5s",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "0.18em",
              color: C.stoneSoft,
              fontFamily: "monospace",
              fontWeight: 300,
            }}
          >
            {Math.floor(alignmentProgress * 100)}%
          </span>
        </div>
        <div
          style={{
            flex: 1,
            height: "0.5px",
            background: `linear-gradient(90deg, ${C.borderSoft}, transparent)`,
          }}
        />
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.centerContent}>
        {/* Wordmark */}
        <div style={styles.wordmark}>
          <h1 style={styles.title}>ZenNeck</h1>
          <p style={styles.subtitle}>
            {aligned ? "alignment complete" : "meridian calibration"}
          </p>
        </div>

        {/* Core orb */}
        <div
          style={{
            position: "relative",
            width: "160px",
            height: "160px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "-50px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 65%)`,
              filter: "blur(24px)",
              opacity: aligned ? 1 : 0.5,
              transition: "opacity 1.2s",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: aligned
                ? `radial-gradient(circle, rgba(122,158,138,0.5) 0%, rgba(122,158,138,0.2) 55%, transparent 100%)`
                : `radial-gradient(circle, rgba(180,170,158,0.35) 0%, rgba(180,170,158,0.1) 55%, transparent 100%)`,
              animation: "orb-breathe 4s ease-in-out infinite",
              boxShadow: aligned
                ? "0 0 32px rgba(122,158,138,0.28)"
                : "0 0 16px rgba(160,150,140,0.12)",
              transition: "background 1s, box-shadow 1s",
            }}
          />
        </div>

        {/* Roll indicator */}
        <div style={styles.rollBarContainer}>
          <span
            style={{
              fontSize: "7px",
              color: C.textHint,
              fontFamily: "monospace",
              width: "30px",
              textAlign: "right",
            }}
          >
            −45°
          </span>
          <div style={styles.rollBar}>
            <div
              style={{
                position: "absolute",
                left: `${((13 + 45) / 90) * 100}%`,
                width: "18px",
                height: "100%",
                background: C.accentSoft,
                borderRadius: "2px",
              }}
            />
            <div style={styles.rollThumb} />
          </div>
          <span
            style={{
              fontSize: "7px",
              color: C.textHint,
              fontFamily: "monospace",
              width: "30px",
            }}
          >
            +45°
          </span>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div style={styles.bottomBar}>
        <p
          style={{
            margin: 0,
            fontSize: "10px",
            letterSpacing: "0.18em",
            color: C.textSoft,
            fontFamily: "'DM Serif Display', serif",
            fontStyle: "italic",
            textAlign: "center",
            animation: "breathe 4s ease-in-out infinite",
          }}
        >
          {aligned
            ? "Hold still — you are aligned"
            : "Gently tilt your head to the right"}
        </p>

        <p
          style={{
            margin: 0,
            fontSize: "7px",
            letterSpacing: "0.13em",
            color: C.textHint,
            fontFamily: "monospace",
          }}
        >
          Real-time · MediaPipe FaceLandmarker
        </p>
      </div>

      {/* FACE WIDGET */}
      <div style={styles.faceWidget}>
        <p
          style={{
            margin: "0 0 7px",
            fontSize: "8px",
            letterSpacing: "0.2em",
            color: C.stoneSoft,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            textTransform: "uppercase",
          }}
        >
          Face Track
        </p>

        <svg width="100%" viewBox="0 0 90 78" fill="none">
          <g transform={`rotate(${roll * 2.1}, 45, 39)`}>
            <ellipse
              cx="45"
              cy="41"
              rx="21"
              ry="27"
              stroke={C.stoneSoft}
              strokeWidth="0.8"
              strokeOpacity="0.5"
              fill={C.bgWarm}
              fillOpacity="0.4"
            />
            <ellipse
              cx="37"
              cy="34"
              rx="3.5"
              ry="2.5"
              fill={C.stone}
              fillOpacity="0.4"
            />
            <ellipse
              cx="53"
              cy="34"
              rx="3.5"
              ry="2.5"
              fill={C.stone}
              fillOpacity="0.4"
            />
            <path
              d={aligned ? "M39 49 Q45 53 51 49" : "M39 50 Q45 47 51 50"}
              stroke={C.stoneSoft}
              strokeWidth="1"
              strokeOpacity="0.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M41 39 L39 45 L51 45"
              stroke={C.stoneHint}
              strokeWidth="0.5"
              fill="none"
            />
          </g>
          {/* Corner brackets */}
          {[
            [3, 3, 1, 1],
            [87, 3, -1, 1],
            [3, 75, 1, -1],
            [87, 75, -1, -1],
          ].map(([x, y, sx, sy], i) => (
            <g key={i} transform={`translate(${x},${y}) scale(${sx},${sy})`}>
              <path
                d="M0 6L0 0L6 0"
                stroke={C.stoneHint}
                strokeWidth="0.8"
                strokeOpacity="0.5"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          ))}
          <line
            x1="6"
            y1="39"
            x2="84"
            y2="39"
            stroke={C.stoneHint}
            strokeWidth="0.4"
            strokeOpacity="0.3"
            strokeDasharray="3 5"
          />
        </svg>

        {/* Roll readout */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: "5px",
          }}
        >
          <span
            style={{
              fontSize: "8px",
              color: C.stoneHint,
              fontFamily: "monospace",
            }}
          >
            roll
          </span>
          <span
            style={{
              fontSize: "14px",
              fontFamily: "monospace",
              fontWeight: 300,
              color: aligned ? C.accent : C.stoneSoft,
              transition: "color 0.5s",
            }}
          >
            {roll > 0 ? "+" : ""}
            {roll.toFixed(1)}°
          </span>
        </div>

        {/* Status */}
        <div
          style={{
            marginTop: "5px",
            textAlign: "center",
            padding: "3px 0",
            borderRadius: "20px",
            background: aligned ? C.accentSoft : C.borderSoft,
            border: `1px solid ${aligned ? "rgba(122,158,138,0.35)" : C.borderSoft}`,
            transition: "all 0.5s",
          }}
        >
          <span
            style={{
              fontSize: "7px",
              letterSpacing: "0.14em",
              color: aligned ? C.accent : C.stoneSoft,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 300,
              textTransform: "uppercase",
              transition: "color 0.5s",
            }}
          >
            {aligned ? "aligned" : "tracking"}
          </span>
        </div>
      </div>
    </>
  );
}
