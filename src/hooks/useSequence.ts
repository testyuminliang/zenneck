import { useEffect, useRef, useState } from "react";
import type { StepDef, StepPhase, HeadRotation } from "../types";

// Base targets at 1× scale. Amplitude presets: 轻 0.65× → ~13°, 中 1.0× → 20°, 大 2.0× → 40°
export const STEPS: StepDef[] = [
  { id: 0, axis: "roll",  target:  20, tolerance: 5, holdMs: 4000, label: "向右侧倾", cue: "tilt right",  arrowDir: "right" },
  { id: 1, axis: "roll",  target: -20, tolerance: 5, holdMs: 4000, label: "向左侧倾", cue: "tilt left",   arrowDir: "left"  },
  { id: 2, axis: "pitch", target: -20, tolerance: 6, holdMs: 4000, label: "抬头仰望", cue: "look up",     arrowDir: "up"    },
  { id: 3, axis: "pitch", target:  20, tolerance: 6, holdMs: 4000, label: "低头放松", cue: "look down",   arrowDir: "down"  },
  { id: 4, axis: "yaw",   target:  20, tolerance: 6, holdMs: 4000, label: "向右转头", cue: "turn right",  arrowDir: "right" },
  { id: 5, axis: "yaw",   target: -20, tolerance: 6, holdMs: 4000, label: "向左转头", cue: "turn left",   arrowDir: "left"  },
];

const RESONANCE_MS = 1800;
const GRACE_MS = 350; // ms before resetting when user drifts out of zone

export function useSequence(headRotation: HeadRotation, amplitudeScale = 1.0) {
  const rotRef = useRef(headRotation);
  rotRef.current = headRotation;
  const scaleRef = useRef(amplitudeScale);
  scaleRef.current = amplitudeScale;

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<StepPhase>("guide");
  const [holdProgress, setHoldProgress] = useState(0);
  const [resonanceProgress, setResonanceProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Mutable refs — used inside rAF loop without re-creating the loop
  const phaseRef = useRef<StepPhase>("guide");
  const stepIndexRef = useRef(0);
  const holdStartRef = useRef<number | null>(null);
  const resonanceStartRef = useRef<number | null>(null);
  const lostZoneAtRef = useRef<number | null>(null);
  const holdProgressRef = useRef(0);
  const rafRef = useRef<number>(0);

  function syncPhase(p: StepPhase) {
    phaseRef.current = p;
    setPhase(p);
  }

  useEffect(() => {
    const tick = (now: number) => {
      const step = STEPS[stepIndexRef.current];
      const rot = rotRef.current;
      const value = rot[step.axis];
      const scaledTarget = step.target * scaleRef.current;
      const scaledTol    = step.tolerance * scaleRef.current;
      // In-zone: within 1.5× tolerance of scaled target
      const inZone = Math.abs(value - scaledTarget) <= scaledTol * 1.5;

      const ph = phaseRef.current;

      if (ph === "guide" || ph === "hold") {
        if (inZone) {
          lostZoneAtRef.current = null;
          if (!holdStartRef.current) {
            holdStartRef.current = now;
            syncPhase("hold");
          }
          const hp = Math.min(1, (now - holdStartRef.current) / step.holdMs);
          holdProgressRef.current = hp;
          setHoldProgress(hp);

          if (hp >= 1) {
            resonanceStartRef.current = now;
            holdProgressRef.current = 0;
            syncPhase("resonance");
          }
        } else if (ph === "hold") {
          // Grace window — don't reset immediately
          if (!lostZoneAtRef.current) {
            lostZoneAtRef.current = now;
          } else if (now - lostZoneAtRef.current > GRACE_MS) {
            holdStartRef.current = null;
            lostZoneAtRef.current = null;
            holdProgressRef.current = 0;
            setHoldProgress(0);
            syncPhase("guide");
          }
        }
      } else if (ph === "resonance") {
        const rp = Math.min(1, (now - (resonanceStartRef.current ?? now)) / RESONANCE_MS);
        setResonanceProgress(rp);

        if (rp >= 1) {
          const isLast = stepIndexRef.current === STEPS.length - 1;
          const next = isLast ? 0 : stepIndexRef.current + 1;
          stepIndexRef.current = next;
          holdStartRef.current = null;
          resonanceStartRef.current = null;
          lostZoneAtRef.current = null;
          holdProgressRef.current = 0;
          setStepIndex(next);
          setHoldProgress(0);
          setResonanceProgress(0);
          syncPhase("guide");
          if (isLast) setIsCompleted(true);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // stable — all data accessed via refs

  const rawStep = STEPS[stepIndex];
  const activeStep = { ...rawStep, target: rawStep.target * amplitudeScale, tolerance: rawStep.tolerance * amplitudeScale };

  return {
    stepIndex,
    activeStep,
    phase,
    holdProgress,
    resonanceProgress,
    totalSteps: STEPS.length,
    isCompleted,
    resetCompleted: () => { setIsCompleted(false); syncPhase("guide"); },
  };
}
