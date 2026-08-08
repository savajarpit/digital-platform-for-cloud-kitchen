export interface PlatformLimitAlertTemplateData {
  businessName: string;
  type: 'order' | 'subscriber';
  state: 'near' | 'hit';
}

export function platformLimitAlertTemplate(
  data: PlatformLimitAlertTemplateData,
): { subject: string; html: string } {
  const noun = data.type === 'order' ? 'order' : 'subscriber';
  const body =
    data.state === 'hit'
      ? `<p><strong>${data.businessName}</strong> has hit its plan's ${noun} limit — real customers are currently being blocked. Consider reaching out about an upgrade.</p>`
      : `<p><strong>${data.businessName}</strong> is nearing its plan's ${noun} limit. Worth a heads-up before they actually hit it.</p>`;
  return {
    subject:
      data.state === 'hit'
        ? `Limit hit — ${data.businessName}`
        : `Nearing limit — ${data.businessName}`,
    html: body,
  };
}
