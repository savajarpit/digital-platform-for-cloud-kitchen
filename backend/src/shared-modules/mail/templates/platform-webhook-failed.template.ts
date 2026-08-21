export interface PlatformWebhookFailedTemplateData {
  eventType: string;
  eventId: string;
  errorMessage: string;
}

/** Fires only once a webhook event has already failed at least once before
 * and fails again on retry — a single transient blip (network hiccup, a
 * momentary DB error) self-heals on Razorpay's own automatic retry and
 * isn't worth paging over; two-in-a-row is the "this looks genuinely
 * stuck" signal. */
export function platformWebhookFailedTemplate(
  data: PlatformWebhookFailedTemplateData,
): { subject: string; html: string } {
  return {
    subject: `Webhook repeatedly failing — ${data.eventType}`,
    html: `<p>A platform billing webhook (<strong>${data.eventType}</strong>, event id <code>${data.eventId}</code>) has failed processing more than once. Razorpay will keep retrying it automatically for up to 24 hours, but repeated failures usually mean it won't self-heal.</p><p>Latest error: <code>${data.errorMessage}</code></p><p>Check the <code>razorpay_webhook_events</code> table for this event id.</p>`,
  };
}
