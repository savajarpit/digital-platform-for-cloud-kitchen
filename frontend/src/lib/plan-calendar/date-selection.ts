/** The first `count` candidates — the default pre-selection both the manual
 * (short-plan) and pre-selected (long-plan) pickers start from. */
export function initialSelection(
  candidates: string[],
  count: number,
): string[] {
  return candidates.slice(0, count);
}

/** "Auto-fill": tops the selection up to `count` by extending it at the end —
 * the candidates after the current last day — so a date the customer removed
 * is never put back. Falls back to earlier gaps only once the window has no
 * later dates left. */
export function autoFillSelection(
  candidates: string[],
  selected: string[],
  count: number,
): string[] {
  const kept = selected.filter((d) => candidates.includes(d)).sort();
  const keptSet = new Set(kept);
  const last = kept.at(-1) ?? "";
  const later = candidates.filter((d) => d > last && !keptSet.has(d));
  const earlier = candidates.filter((d) => d <= last && !keptSet.has(d));
  const next = [...kept];
  for (const date of [...later, ...earlier]) {
    if (next.length >= count) break;
    next.push(date);
  }
  return next.sort();
}

/** RELATIVE_DAY: the plan day a selected date gets — its 1-based position in
 * the sorted selection, wrapped over the plan length (same rule as the
 * backend's PlanScheduleUtil.resolveKey). Null when the date isn't selected. */
export function relativeDayNumber(
  sortedSelected: string[],
  date: string,
  durationDays: number,
): number | null {
  const index = sortedSelected.indexOf(date);
  if (index === -1) return null;
  return (index % durationDays) + 1;
}
