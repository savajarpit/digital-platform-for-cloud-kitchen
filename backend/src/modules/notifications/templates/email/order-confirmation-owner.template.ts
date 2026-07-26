import { OrderConfirmationTemplateData } from './order-confirmation-customer.template';

export function orderConfirmationOwnerEmailTemplate(
  data: OrderConfirmationTemplateData,
): { subject: string; html: string } {
  const itemsHtml = data.items
    .map((item) => `<li>${item.name} × ${item.quantity}</li>`)
    .join('');
  const total = (data.totalInPaise / 100).toFixed(2);

  return {
    subject: `New order — ${data.orderNumber}`,
    html: `<p>New paid order from ${data.customerName}.</p><p>Order <strong>${data.orderNumber}</strong> — ₹${total}</p><ul>${itemsHtml}</ul><p>Deliver: <strong>${data.deliverySlotName}</strong> (${data.deliveryWindowStart}–${data.deliveryWindowEnd}) on ${data.deliveryDateLabel}</p>`,
  };
}
