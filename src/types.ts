export type StepAxis = "roll" | "pitch" | "yaw";
export type StepPhase = "guide" | "hold" | "resonance" | "pause";
export type ArrowDir = "right" | "left" | "up" | "down" | "up-right" | "up-left" | "down-right" | "down-left";

export interface CustomPreset {
  label: string;   // 轻 / 中 / 深
  angle: number;   // reference angle in °; scale = angle / BASE_ANGLE(20)
}

export interface CustomConfig {
  presets: [CustomPreset, CustomPreset, CustomPreset];
  stepOrder: number[];   // ordered step IDs (subset of all STEPS)
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  voiceCuesEnabled: boolean;
  customBgmName?: string; // filename shown in UI; actual audio stored in IndexedDB
}

export interface StepDef {
  id: number;
  axis: StepAxis;
  target: number;
  tolerance: number;
  axis2?: StepAxis;
  target2?: number;
  holdMs: number;
  label: string;       // Chinese label
  cue: string;         // English sub-cue
  arrowDir: ArrowDir;
}

export interface HeadRotation {
  yaw: number;
  pitch: number;
  roll: number;
}
