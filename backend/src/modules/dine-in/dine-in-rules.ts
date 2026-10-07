/**
 * Shared dine-in rules — one open bill per table, a settled bill is closed
 * to new rounds, and an empty bill can't be settled. Kept pure so the
 * wording stays identical across the table, order and waitlist flows.
 */

/** A bare number reads as "Table 1"; a named table ("Table 4", "Patio")
 * stays as is. */
export function tableName(label: string): string {
  return /^\d/.test(label) ? `Table ${label}` : label;
}

export function tableBusyMessage(label: string): string {
  return `${tableName(label)} already has an open order — add items to it, or pick another table.`;
}

export function tableInUseMessage(
  label: string,
  action: 'deactivate' | 'remove',
): string {
  return `${tableName(label)} has an open order — serve it or move it to another table before you ${action} this table.`;
}

export const BILL_SETTLED_MESSAGE =
  'This bill is already settled — open a new order for more items.';

export const EMPTY_BILL_MESSAGE =
  'Add at least one item before settling the bill.';

export const WAITLIST_ALREADY_SEATED_MESSAGE =
  'This party was already seated or removed from the waitlist.';

/** Natural order, so "Table 2" sorts before "Table 10". */
export function compareTableLabels(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
}
