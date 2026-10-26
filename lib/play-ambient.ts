import type { AccentColor } from "@/lib/catalog-enums";
import { getAccentTint, getTintRgb } from "@/lib/card-theme";

export interface PlayAccentTheme {
  rgb: [number, number, number];
  glass: string;
  primary: string;
  primaryMuted: string;
  /** Accent mixed halfway to white — stays readable (≥4.5:1) on the dark play panels. */
  textAccent: string;
  gradient: string;
  gradientSoft: string;
  glow: string;
  border: string;
  slider: string;
  panelBg: string;
  activeRow: string;
  /** Ethereal multi-layer inset glow — fairy accent boundary on playback. */
  fairyInnerShadow: string;
  fairyRadialWash: string;
}

export function getPlayFairyInnerGlow(accent?: AccentColor | string) {
  const tint = getAccentTint(accent);
  const [r, g, b] = getTintRgb(tint.glass);

  return {
    innerShadow: [
      `inset 0 0 96px 6px rgba(${r},${g},${b},0.15)`,
      `inset 0 20px 68px rgba(${r},${g},${b},0.11)`,
      `inset 0 -20px 68px rgba(${r},${g},${b},0.09)`,
      `inset 20px 0 68px rgba(${r},${g},${b},0.1)`,
      `inset -20px 0 68px rgba(${r},${g},${b},0.12)`,
      `inset 0 0 150px rgba(${r},${g},${b},0.08)`,
    ].join(", "),
    radialWash: `radial-gradient(ellipse 92% 78% at 50% 100%, rgba(${r},${g},${b},0.34) 0%, rgba(${r},${g},${b},0.14) 42%, transparent 72%)`,
    edgeSparkle: `radial-gradient(ellipse 115% 88% at 50% 48%, rgba(${r},${g},${b},0.1) 0%, transparent 68%)`,
  };
}

export function getPlayAccentTheme(accent?: AccentColor | string): PlayAccentTheme {
  const tint = getAccentTint(accent);
  const [r, g, b] = getTintRgb(tint.glass);
  const r2 = Math.min(255, r + 32);
  const g2 = Math.min(255, g + 20);
  const b2 = Math.min(255, b + 48);
  const fairy = getPlayFairyInnerGlow(accent);

  return {
    rgb: [r, g, b],
    glass: tint.glass,
    primary: `rgb(${r},${g},${b})`,
    primaryMuted: `rgba(${r},${g},${b},0.75)`,
    textAccent: `rgb(${Math.round((r + 255) / 2)},${Math.round((g + 255) / 2)},${Math.round((b + 255) / 2)})`,
    gradient: `linear-gradient(135deg, rgb(${r},${g},${b}) 0%, rgb(${r2},${g2},${b2}) 100%)`,
    gradientSoft: `rgba(${r},${g},${b},0.22)`,
    glow: `0 4px 18px rgba(${r},${g},${b},0.28)`,
    border: `rgba(${r},${g},${b},0.28)`,
    slider: `rgb(${r},${g},${b})`,
    panelBg: "#100d1a",
    activeRow: `rgba(${r},${g},${b},0.12)`,
    fairyInnerShadow: fairy.innerShadow,
    fairyRadialWash: fairy.radialWash,
  };
}

export function getPlayAmbientLayers(accent?: AccentColor | string) {
  const theme = getPlayAccentTheme(accent);
  const [r, g, b] = theme.rgb;

  return {
    theme,
    solidGradient: `linear-gradient(180deg, rgba(${r},${g},${b},0.48) 0%, rgba(${r},${g},${b},0.2) 22%, rgba(14,10,22,0.96) 58%, rgba(9,7,15,1) 100%)`,
    baseFill: "rgba(9,7,15,0.35)",
  };
}
