/**
 * Shared by SettingsController (current-tenant admin routes) and
 * PlatformController (SUPER_ADMIN cross-tenant routes) — both ever return
 * NotificationSettings/PaymentSettings, and secrets must never leave the
 * server as anything but a `*Configured: boolean` flag.
 */
export function redactNotificationSettings(settings: {
  whatsappApiKeyEncrypted: string | null;
  whatsappConfigEncrypted: unknown;
  emailConfigEncrypted: unknown;
  [key: string]: unknown;
}) {
  const {
    whatsappApiKeyEncrypted,
    whatsappConfigEncrypted,
    emailConfigEncrypted,
    ...safe
  } = settings;
  return {
    ...safe,
    whatsappApiKeyConfigured: Boolean(whatsappApiKeyEncrypted),
    whatsappConfigConfigured: Boolean(whatsappConfigEncrypted),
    emailConfigConfigured: Boolean(emailConfigEncrypted),
  };
}

export function redactPaymentSettings(settings: {
  razorpayKeySecretEncrypted: string | null;
  razorpayWebhookSecretEncrypted: string | null;
  [key: string]: unknown;
}) {
  const {
    razorpayKeySecretEncrypted,
    razorpayWebhookSecretEncrypted,
    ...safe
  } = settings;
  return {
    ...safe,
    razorpayKeySecretConfigured: Boolean(razorpayKeySecretEncrypted),
    razorpayWebhookSecretConfigured: Boolean(razorpayWebhookSecretEncrypted),
  };
}
