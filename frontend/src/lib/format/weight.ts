/** Formats a meal's weight for display, e.g. (250, "G") -> "250 g". Trims a
 * trailing ".0" so whole numbers don't render as "500.0 g". */
export function formatMealWeight(value: number, unit: "G" | "KG"): string {
  const trimmed = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return `${trimmed} ${unit === "KG" ? "kg" : "g"}`;
}
