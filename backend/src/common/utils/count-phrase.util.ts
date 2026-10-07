/** "1 table" / "3 tables", or null for 0 — for "still used by …" messages.
 * Pass `plural` for nouns that don't just take an "s" ("entry" → "entries"). */
export function countPhrase(
  count: number,
  noun: string,
  plural = `${noun}s`,
): string | null {
  if (count === 0) return null;
  return `${count} ${count === 1 ? noun : plural}`;
}

/** Joins the non-null phrases as "a", "a and b", "a, b and c"; null when
 * every phrase is null. */
export function joinPhrases(phrases: (string | null)[]): string | null {
  const parts = phrases.filter((p): p is string => p !== null);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
