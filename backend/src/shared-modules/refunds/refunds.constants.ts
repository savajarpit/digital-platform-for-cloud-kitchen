/** Feature key gating the RAZORPAY refund method — SUPER_ADMIN grants this
 * per tenant, same `Feature`/`TenantFeature` mechanism as every other
 * Feature. MANUAL refunds are never gated by this — they're always
 * available to whoever holds the cancel-refund permission. */
export const RAZORPAY_REFUNDS_FEATURE_KEY = 'razorpay-refunds';
