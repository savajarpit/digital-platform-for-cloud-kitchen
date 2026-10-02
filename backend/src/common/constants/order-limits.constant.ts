/** Hard caps on a single order, enforced by DTO validation and again per
 * meal in OrdersService (a meal split across add-on variants counts as one).
 * Mirrored in frontend/src/lib/constants/order-limits.ts — keep in sync. */
export const MAX_ITEM_QUANTITY = 50;
export const MAX_ADDON_QUANTITY = 20;
export const MAX_CART_LINES = 50;

/** Razorpay rejects orders below ₹1. */
export const MIN_ONLINE_PAYMENT_IN_PAISE = 100;
