import { OrderConfirmationTemplateData } from './order-confirmation-customer.template';

export function orderConfirmationOwnerEmailTemplate(
  data: OrderConfirmationTemplateData,
): { subject: string; html: string } {
  const itemsHtml = data.items
    .map((item) => `<li>${item.name} × ${item.quantity}</li>`)
    .join('');
  const total = (data.totalInPaise / 100).toFixed(2);
  // A tappable map link is the whole point of including this on the owner's
  // copy — it's what actually gets forwarded to a delivery driver.
  const mapLinkHtml = data.mapLink
    ? ` — <a href="${data.mapLink}"><strong>View on map</strong></a>`
    : '';

  return {
    subject: `New order — ${data.orderNumber}`,
    html: `<p>New paid order from ${data.customerName}.</p><p>Order <strong>${data.orderNumber}</strong> — ₹${total}</p><ul>${itemsHtml}</ul><p>Deliver: <strong>${data.deliverySlotName}</strong> (${data.deliveryWindowStart}–${data.deliveryWindowEnd}) on ${data.deliveryDateLabel}</p><p>Address: ${data.deliveryAddress}<br/>Contact: ${data.deliveryContactPhone}${mapLinkHtml}</p>`,
  };
}
