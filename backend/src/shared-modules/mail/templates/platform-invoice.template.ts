export interface PlatformInvoiceTemplateData {
  businessName: string;
  amountInPaise: number;
  invoiceUrl: string | null;
}

export function platformInvoiceTemplate(data: PlatformInvoiceTemplateData): {
  subject: string;
  html: string;
} {
  const amount = (data.amountInPaise / 100).toFixed(2);
  const invoiceLine = data.invoiceUrl
    ? `<p><a href="${data.invoiceUrl}">View your invoice</a></p>`
    : '';
  return {
    subject: `Payment received — ₹${amount}`,
    html: `<p>Thanks — we've received your platform subscription payment of ₹${amount} for ${data.businessName}.</p>${invoiceLine}`,
  };
}
