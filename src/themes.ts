import type { ThemeKey } from "./types";

export interface Theme {
  W: string;       // primary accent as partial rgba, e.g. "rgba(180,95,65,"
  CR: string;      // secondary/text as partial rgba
  swatch: string;  // hex for display
}

export const THEMES: Record<ThemeKey, Theme> = {
  terracotta: { W: "rgba(180,95,65,",  CR: "rgba(100,60,40,",  swatch: "#b45f41" },
  rose:       { W: "rgba(175,85,115,", CR: "rgba(100,50,70,",  swatch: "#af5573" },
  lavender:   { W: "rgba(125,100,170,",CR: "rgba(70,50,110,",  swatch: "#7d64aa" },
  sage:       { W: "rgba(75,135,105,", CR: "rgba(40,80,60,",   swatch: "#4b8769" },
  ocean:      { W: "rgba(60,115,165,", CR: "rgba(35,65,105,",  swatch: "#3c73a5" },
};

export const THEME_ORDER: ThemeKey[] = ["terracotta", "rose", "lavender", "sage", "ocean"];

export function getTheme(key?: ThemeKey): Theme {
  return THEMES[key ?? "terracotta"];
}
