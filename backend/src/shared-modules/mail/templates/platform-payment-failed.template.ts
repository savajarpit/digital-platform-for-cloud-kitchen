export interface PlatformPaymentFailedTemplateData {
  businessName: string;
  amountInPaise: number;
  isOwnerRecipient: boolean;
}

export function platformPaymentFailedTemplate(
  data: PlatformPaymentFailedTemplateData,
): { subject: string; html: string } {
  const amount = (data.amountInPaise / 100).toFixed(2);
  const body = data.isOwnerRecipient
    ? `<p>Your platform subscription payment of ₹${amount} for ${data.businessName} failed. Please update your payment method — we'll keep retrying automatically, but your account may be paused if it keeps failing.</p>`
    : `<p>A platform subscription payment of ₹${amount} failed for tenant <strong>${data.businessName}</strong>. Razorpay will retry automatically; this is a heads-up on revenue at risk.</p>`;
  return {
    subject: `Payment failed — ${data.businessName}`,
    html: body,
  };
}
