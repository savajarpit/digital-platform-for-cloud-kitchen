export type ColorScale = Record<
  "50" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "950",
  string
>;

const WHITE = "#ffffff";
const BLACK = "#000000";

// Shade 500 is the pure input color. Shades below mix toward white (lighter),
// shades above mix toward black (darker) — the standard Tailwind-style ramp.
const LIGHTEN_TOWARD_WHITE: Record<string, number> = {
  "50": 0.95,
  "100": 0.88,
  "200": 0.75,
  "300": 0.55,
  "400": 0.3,
};
const DARKEN_TOWARD_BLACK: Record<string, number> = {
  "600": 0.12,
  "700": 0.28,
  "800": 0.42,
  "900": 0.56,
  "950": 0.7,
};

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((channel) =>
        Math.max(0, Math.min(255, Math.round(channel)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Mixes `hex` toward `target` by `amount` (0 = hex, 1 = target). */
function mix(hex: string, target: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(target);
  return rgbToHex(
    r1 + (r2 - r1) * amount,
    g1 + (g2 - g1) * amount,
    b1 + (b2 - b1) * amount,
  );
}

/** Generates a 50–900 Tailwind-style shade scale from a single hex color. */
export function generateColorScale(hex: string): ColorScale {
  const scale: Partial<ColorScale> = { "500": hex };

  for (const [shade, amount] of Object.entries(LIGHTEN_TOWARD_WHITE)) {
    scale[shade as keyof ColorScale] = mix(hex, WHITE, amount);
  }
  for (const [shade, amount] of Object.entries(DARKEN_TOWARD_BLACK)) {
    scale[shade as keyof ColorScale] = mix(hex, BLACK, amount);
  }

  return scale as ColorScale;
}
