const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const FALLBACK_COLORS = {
  primaryColor: "#16A34A",
  secondaryColor: "#0EA5E9",
  accentColor: "#F59E0B",
} as const;

export function safeHex(value: string | undefined, fallback: string): string {
  return value && HEX_PATTERN.test(value) ? value : fallback;
}
