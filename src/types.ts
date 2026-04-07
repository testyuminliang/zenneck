export type StepAxis = "roll" | "pitch" | "yaw";
export type StepPhase = "guide" | "hold" | "resonance";

export interface StepDef {
  id: number;
  axis: StepAxis;
  target: number;
  tolerance: number;
  holdMs: number;
  label: string;       // Chinese label
  cue: string;         // English sub-cue
  arrowDir: "right" | "left" | "up" | "down";
}

export interface HeadRotation {
  yaw: number;
  pitch: number;
  roll: number;
}
