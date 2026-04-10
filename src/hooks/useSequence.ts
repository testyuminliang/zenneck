import { useEffect, useRef, useState } from "react";
import type { StepDef, StepPhase, HeadRotation } from "../types";

// Base targets at 1× scale. Amplitude presets: 轻 0.65× → ~13°, 中 1.0× → 20°, 大 2.0× → 40°
export const STEPS: StepDef[] = [
  { id: 0, axis: "roll",  target:  20, tolerance: 5, holdMs: 6000, label: "向右侧倾", cue: "tilt right",   arrowDir: "right"       },
  { id: 1, axis: "roll",  target: -20, tolerance: 5, holdMs: 6000, label: "向左侧倾", cue: "tilt left",    arrowDir: "left"        },
  { id: 2, axis: "pitch", target: -33, tolerance: 6, holdMs: 6000, label: "抬头仰望", cue: "look up",      arrowDir: "up"          },
  { id: 3, axis: "pitch", target:  33, tolerance: 6, holdMs: 6000, label: "低头放松", cue: "look down",    arrowDir: "down"        },
  { id: 4, axis: "yaw",   target:  20, tolerance: 6, holdMs: 6000, label: "向右转头", cue: "turn right",   arrowDir: "right"       },
  { id: 5, axis: "yaw",   target: -20, tolerance: 6, holdMs: 6000, label: "向左转头", cue: "turn left",    arrowDir: "left"        },
  { id: 6, axis: "yaw",   target:  25, tolerance: 5, holdMs: 6000, label: "右上方转头", cue: "look up-right",   arrowDir: "up-right",   axis2: "pitch", target2: -20 },
  { id: 7, axis: "yaw",   target: -25, tolerance: 5, holdMs: 6000, label: "左上方转头", cue: "look up-left",    arrowDir: "up-left",    axis2: "pitch", target2: -20 },
  { id: 8, axis: "yaw",   target:  25, tolerance: 5, holdMs: 6000, label: "右下方转头", cue: "look down-right", arrowDir: "down-right", axis2: "pitch", target2:  20 },
  { id: 9, axis: "yaw",   target: -25, tolerance: 5, holdMs: 6000, label: "左下方转头", cue: "look down-left",  arrowDir: "down-left",  axis2: "pitch", target2:  20 },
];

const RESONANCE_MS = 1800;
const PAUSE_MS     = 600;  // brief pause between steps
const GRACE_MS = 600; // ms before resetting when user drifts out of zone

export function useSequence(headRotation: HeadRotation, amplitudeScale = 1.0, steps = STEPS) {
  const rotRef = useRef(headRotation);
  rotRef.current = headRotation;
  const scaleRef = useRef(amplitudeScale);
  scaleRef.current = amplitudeScale;
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

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
  const pauseStartRef = useRef<number | null>(null);
  const lostZoneAtRef = useRef<number | null>(null);
  const holdProgressRef = useRef(0);
  const rafRef = useRef<number>(0);

  function syncPhase(p: StepPhase) {
    phaseRef.current = p;
    setPhase(p);
  }

  useEffect(() => {
    const tick = (now: number) => {
      const step = stepsRef.current[stepIndexRef.current];
      const rot = rotRef.current;
      const value = rot[step.axis];
      const scaledTarget = step.target * scaleRef.current;
      const inZone1 = scaledTarget > 0 ? value >= scaledTarget : value <= scaledTarget;
      const inZone2 = step.axis2 == null ? true : (() => {
        const v2 = rot[step.axis2];
        const st2 = (step.target2 ?? 0) * scaleRef.current;
        return st2 > 0 ? v2 >= st2 : v2 <= st2;
      })();
      // In-zone: reached or passed the target line (same sign = same direction)
      const inZone = inZone1 && inZone2;

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
        } else if (ph === "hold" ) {
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
          pauseStartRef.current = now;
          syncPhase("pause");
        }
      } else if (ph === "pause") {
        if (now - (pauseStartRef.current ?? now) >= PAUSE_MS) {
          const isLast = stepIndexRef.current === stepsRef.current.length - 1;
          const next = isLast ? 0 : stepIndexRef.current + 1;
          stepIndexRef.current = next;
          holdStartRef.current = null;
          resonanceStartRef.current = null;
          pauseStartRef.current = null;
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

  const rawStep = steps[stepIndex] ?? steps[0];
  const activeStep = {
    ...rawStep,
    target: rawStep.target * amplitudeScale,
    tolerance: rawStep.tolerance * amplitudeScale,
    ...(rawStep.target2 !== undefined ? { target2: rawStep.target2 * amplitudeScale } : {}),
  };

  return {
    stepIndex,
    activeStep,
    phase,
    holdProgress,
    resonanceProgress,
    totalSteps: steps.length,
    isCompleted,
    resetCompleted: () => { setIsCompleted(false); syncPhase("guide"); },
  };
}
