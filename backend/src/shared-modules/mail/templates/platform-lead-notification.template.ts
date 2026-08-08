export interface PlatformLeadNotificationTemplateData {
  businessName: string;
  contactEmail: string;
  contactPhone: string | null;
  planName: string | null;
  message: string | null;
  isUpgradeRequest: boolean;
}

export function platformLeadNotificationTemplate(
  data: PlatformLeadNotificationTemplateData,
): { subject: string; html: string } {
  const kind = data.isUpgradeRequest
    ? 'An active tenant requested a plan upgrade'
    : 'A new lead came in from the marketing site';
  const html = `
    <p>${kind}.</p>
    <p><strong>Business:</strong> ${data.businessName}</p>
    <p><strong>Contact:</strong> ${data.contactEmail}${data.contactPhone ? ` / ${data.contactPhone}` : ''}</p>
    ${data.planName ? `<p><strong>Plan interested in:</strong> ${data.planName}</p>` : ''}
    ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
  `;
  return {
    subject: `${data.isUpgradeRequest ? 'Upgrade request' : 'New lead'} — ${data.businessName}`,
    html,
  };
}
