export interface PlatformActivationInviteTemplateData {
  businessName: string;
  activationUrl: string;
  planCode: string;
  amountInPaise: number;
  billingCycle: 'MONTHLY' | 'YEARLY';
}

export function platformActivationInviteTemplate(
  data: PlatformActivationInviteTemplateData,
): { subject: string; html: string } {
  const amount = (data.amountInPaise / 100).toFixed(2);
  const cycle = data.billingCycle === 'MONTHLY' ? 'month' : 'year';
  return {
    subject: `Activate ${data.businessName} on the platform`,
    html: `<p>You're one step away from going live. Complete payment to activate <strong>${data.businessName}</strong> (${data.planCode} plan, ₹${amount}/${cycle}):</p><p><a href="${data.activationUrl}">${data.activationUrl}</a></p>`,
  };
}
