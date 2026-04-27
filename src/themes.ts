import type { ThemeKey } from "./types";

export interface Theme {
  W: string;          // primary accent as partial rgba, e.g. "rgba(180,95,65,"
  CR: string;         // secondary/text as partial rgba
  swatch: string;     // hex for swatch dot in UI

  bgBase: string;     // canvas fill base color for FluidBackground
  bgPalette: string[];// blob colors for FluidBackground

  bloomPalette: string[];   // CondenseBloom inner blobs (PALETTE)
  deepPalette: string[];    // CondenseBloom outer halo rings (DEEP_PALETTE)
  arcColor: string;         // HoldArc meteor color
}

export const THEMES: Record<ThemeKey, Theme> = {
  terracotta: {
    W:  "rgba(180,95,65,",
    CR: "rgba(100,60,40,",
    swatch: "#b45f41",
    bgBase:    "#f3ece2",
    bgPalette: ["#fbe8d8", "#ead8e8", "#e4d8ea", "#e8dfd0"],
    bloomPalette: ["#ffcab0", "#f0c4dc", "#d4c4ec", "#f8d8b8"],
    deepPalette:  ["#f5b598", "#e8a8c4", "#c4a8dc", "#b8b4e0", "#f0c898"],
    arcColor: "#fff2d8",
  },
  rose: {
    W:  "rgba(175,85,115,",
    CR: "rgba(100,50,70,",
    swatch: "#af5573",
    bgBase:    "#f5e8ee",
    bgPalette: ["#f9d4e0", "#f0d8ec", "#e8d0f0", "#f4dde8"],
    bloomPalette: ["#ffb8cc", "#f0a8d0", "#e8b8e4", "#ffc4d4"],
    deepPalette:  ["#f590b0", "#e878bc", "#d890cc", "#c8a0d8", "#f0a8c0"],
    arcColor: "#ffe0ec",
  },
  lavender: {
    W:  "rgba(125,100,170,",
    CR: "rgba(70,50,110,",
    swatch: "#7d64aa",
    bgBase:    "#eceaf5",
    bgPalette: ["#ddd8f0", "#e8d4f4", "#d8ddf8", "#e4dcf0"],
    bloomPalette: ["#c8b8ec", "#d4bcf8", "#b8c4f8", "#dcc8f0"],
    deepPalette:  ["#b098e0", "#a8a0e8", "#98a0e0", "#b0a8ec", "#c0b4f0"],
    arcColor: "#ece8ff",
  },
  sage: {
    W:  "rgba(75,135,105,",
    CR: "rgba(40,80,60,",
    swatch: "#4b8769",
    bgBase:    "#e8f2ec",
    bgPalette: ["#d4ecd8", "#d8ecd0", "#cce8e4", "#dcecd4"],
    bloomPalette: ["#b4e4c4", "#c4e8b4", "#acdcd8", "#c8e8c0"],
    deepPalette:  ["#90ccaa", "#a0cc90", "#88c8b4", "#a0cca0", "#acd4a8"],
    arcColor: "#e0f8ec",
  },
  ocean: {
    W:  "rgba(60,115,165,",
    CR: "rgba(35,65,105,",
    swatch: "#3c73a5",
    bgBase:    "#e8eef8",
    bgPalette: ["#d4e4f4", "#cce0f8", "#d4eaf4", "#d0daf8"],
    bloomPalette: ["#a8ccec", "#b0c8f8", "#a0d4f4", "#b8ccf4"],
    deepPalette:  ["#80a8d8", "#88a0e0", "#78b8d8", "#90a8e4", "#98b8e4"],
    arcColor: "#e0f2ff",
  },
};

export const THEME_ORDER: ThemeKey[] = ["terracotta", "rose", "lavender", "sage", "ocean"];

export function getTheme(key?: ThemeKey): Theme {
  return THEMES[key ?? "terracotta"];
}
