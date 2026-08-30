import { SubscriptionDisruptionTemplateData } from '../email/subscription-disruption.template';

export function subscriptionDisruptionWhatsAppTemplate(
  data: SubscriptionDisruptionTemplateData,
): { templateKey: string; params: Record<string, string> } {
  return {
    templateKey: 'subscription_disruption',
    params: {
      name: data.customerName,
      plan_name: data.planName,
      date: data.dateLabel,
      reason: data.reason,
      compensation_days: String(data.compensationDays),
    },
  };
}
