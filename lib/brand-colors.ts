/**
 * JS mirrors of the @theme colours in app/globals.css, for places that need a
 * raw value instead of a class: stored avatar colours, SVG/chart strokes.
 */
export const BRAND_COLORS = {
  magenta: "#ff00cc",
  purple: "#ae00ff",
  gold: "#ffd000",
  background: "#120826",
  surface: "#000000",
} as const;

/** Avatar circle colour when a user has none saved. */
export const DEFAULT_AVATAR_COLOR = BRAND_COLORS.magenta;
