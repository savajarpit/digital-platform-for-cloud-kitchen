export interface PlatformCancellationRequestTemplateData {
  tenantName: string;
  reason: string;
}

export function platformCancellationRequestTemplate(
  data: PlatformCancellationRequestTemplateData,
): { subject: string; html: string } {
  const html = `
    <p>A tenant has requested to cancel their platform subscription.</p>
    <p><strong>Business:</strong> ${data.tenantName}</p>
    <p><strong>Reason:</strong> ${data.reason}</p>
    <p>Review it in the admin — Platform → Cancellation Requests.</p>
  `;
  return {
    subject: `Cancellation request — ${data.tenantName}`,
    html,
  };
}
