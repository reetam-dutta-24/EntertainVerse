import type { CSSProperties } from "react";

/** Shared theming for AniVerse analytics charts. */

/** Named series colours — distinct hues that stay readable on the dark surface. */
export const chartPalette = {
  magenta: "#ff00cc",
  purple: "#ae00ff",
  blue: "#3b82f6",
  teal: "#2dd4bf",
  lime: "#e5ff00",
  green: "#00ff8c",
} as const;

export const chartColors = [
  chartPalette.magenta,
  chartPalette.teal,
  chartPalette.blue,
  chartPalette.lime,
  chartPalette.purple,
  chartPalette.green,
] as const;

export const chartGrid = "rgba(248, 234, 255, 0.12)";
export const chartAxis = "rgba(248, 234, 255, 0.65)";

export const chartTooltipStyle: CSSProperties = {
  backgroundColor: "var(--color-background)",
  border: "1px solid rgba(255, 0, 204, 0.6)",
  borderRadius: 12,
  color: "#ffffff",
};
