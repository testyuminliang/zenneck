import { useEffect, useRef, useState } from "react";
import type { StepDef, StepPhase, HeadRotation } from "../types";

export const STEPS: StepDef[] = [
  { id: 0, axis: "roll",  target:  18, tolerance: 3, holdMs: 2500, label: "向右侧倾", cue: "tilt right",  arrowDir: "right" },
  { id: 1, axis: "roll",  target: -18, tolerance: 3, holdMs: 2500, label: "向左侧倾", cue: "tilt left",   arrowDir: "left"  },
  { id: 2, axis: "pitch", target: -18, tolerance: 5, holdMs: 2500, label: "抬头仰望", cue: "look up",     arrowDir: "up"    },
  { id: 3, axis: "pitch", target:  18, tolerance: 5, holdMs: 2500, label: "低头放松", cue: "look down",   arrowDir: "down"  },
  { id: 4, axis: "yaw",   target:   6, tolerance: 2, holdMs: 2500, label: "向右转头", cue: "turn right",  arrowDir: "right" },
  { id: 5, axis: "yaw",   target:  -6, tolerance: 2, holdMs: 2500, label: "向左转头", cue: "turn left",   arrowDir: "left"  },
];

const RESONANCE_MS = 1800;
const GRACE_MS = 350; // ms before resetting when user drifts out of zone

export function useSequence(headRotation: HeadRotation) {
  const rotRef = useRef(headRotation);
  rotRef.current = headRotation;

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<StepPhase>("guide");
  const [holdProgress, setHoldProgress] = useState(0);
  const [resonanceProgress, setResonanceProgress] = useState(0);

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
      // In-zone: within 1.5× tolerance of target
      const inZone = Math.abs(value - step.target) <= step.tolerance * 1.5;

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
          // Advance to next step
          const next = (stepIndexRef.current + 1) % STEPS.length;
          stepIndexRef.current = next;
          holdStartRef.current = null;
          resonanceStartRef.current = null;
          lostZoneAtRef.current = null;
          holdProgressRef.current = 0;
          setStepIndex(next);
          setHoldProgress(0);
          setResonanceProgress(0);
          syncPhase("guide");
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // stable — all data accessed via refs

  return {
    stepIndex,
    activeStep: STEPS[stepIndex],
    phase,
    holdProgress,
    resonanceProgress,
    totalSteps: STEPS.length,
  };
}
