export interface SubscriptionDisruptionTemplateData {
  customerName: string;
  planName: string;
  dateLabel: string;
  reason: string;
  compensationDays: number;
}

export function subscriptionDisruptionEmailTemplate(
  data: SubscriptionDisruptionTemplateData,
): { subject: string; html: string } {
  const dayWord = data.compensationDays === 1 ? 'day' : 'days';

  return {
    subject: `A delivery on your ${data.planName} plan is affected`,
    html: `<p>Hi ${data.customerName},</p><p>Your delivery on <strong>${data.dateLabel}</strong> won't happen — ${data.reason}.</p><p>You've been credited <strong>${data.compensationDays} extra ${dayWord}</strong>, automatically added to the end of your plan.</p>`,
  };
}
