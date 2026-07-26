export interface OrderConfirmationTemplateData {
  customerName: string;
  orderNumber: string;
  totalInPaise: number;
  deliverySlotName: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  deliveryDateLabel: string;
  items: { name: string; quantity: number }[];
}

export function orderConfirmationCustomerEmailTemplate(
  data: OrderConfirmationTemplateData,
): { subject: string; html: string } {
  const itemsHtml = data.items
    .map((item) => `<li>${item.name} × ${item.quantity}</li>`)
    .join('');
  const total = (data.totalInPaise / 100).toFixed(2);

  return {
    subject: `Order confirmed — ${data.orderNumber}`,
    html: `<p>Hi ${data.customerName},</p><p>Your order <strong>${data.orderNumber}</strong> is confirmed and payment received.</p><ul>${itemsHtml}</ul><p>Delivery: <strong>${data.deliverySlotName}</strong> (${data.deliveryWindowStart}–${data.deliveryWindowEnd}) on ${data.deliveryDateLabel}</p><p>Total: ₹${total}</p>`,
  };
}
