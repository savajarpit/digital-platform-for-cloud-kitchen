export const ORDER_CANCEL_REQUESTS_FEATURE_KEY = 'order-cancel-requests';

/** Reason codes a customer picks from — stored as text, so adding one here
 * never needs a migration. Labels are what the owner email and admin list
 * show. */
export const CANCELLATION_REASONS = {
  MOVING: 'Moving / relocating',
  PRICE: 'Too expensive',
  FOOD: 'Food taste or quality',
  SCHEDULE: 'Schedule or timing doesn’t suit me',
  DELIVERY: 'Delivery problems',
  ORDERED_BY_MISTAKE: 'Ordered by mistake',
  OTHER: 'Something else',
} as const;

export type CancellationReasonCode = keyof typeof CANCELLATION_REASONS;

export const CANCELLATION_REASON_CODES = Object.keys(
  CANCELLATION_REASONS,
) as CancellationReasonCode[];

export function cancellationReasonLabel(code: string): string {
  return CANCELLATION_REASONS[code as CancellationReasonCode] ?? code;
}
