import { registerAs } from '@nestjs/config';

/**
 * Arpit's own Razorpay account — used to charge tenant OWNERs for the
 * platform subscription itself. Never a tenant's own PaymentSettings row
 * (that's a separate, per-tenant encrypted DB row — see
 * shared-modules/razorpay/razorpay-client.service.ts). A single
 * env-configured credential, since there's only ever one platform.
 */
export default registerAs('platformBilling', () => ({
  razorpayKeyId: process.env.PLATFORM_RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.PLATFORM_RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.PLATFORM_RAZORPAY_WEBHOOK_SECRET,
  // Notified alongside the tenant on subscription.payment.failed — revenue
  // at risk is Arpit's own concern, not just the tenant's.
  alertEmail: process.env.PLATFORM_ALERT_EMAIL,
}));
