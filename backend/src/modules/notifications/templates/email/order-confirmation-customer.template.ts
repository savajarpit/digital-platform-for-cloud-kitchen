export interface OrderConfirmationTemplateData {
  customerName: string;
  orderNumber: string;
  totalInPaise: number;
  deliverySlotName: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  deliveryDateLabel: string;
  items: { name: string; quantity: number }[];
  deliveryAddress: string;
  deliveryContactPhone: string;
  /** Only present when the address has captured coordinates — older
   * addresses saved before the map picker existed won't have one. */
  mapLink?: string;
}

/** A plain Google Maps URL that opens turn-by-turn directions straight to
 * this location — no `origin` param means Maps defaults the starting point
 * to whoever opens the link's current location (still changeable inside
 * Maps itself), so the recipient (e.g. a delivery driver forwarded this
 * email) doesn't need a manual "Get Directions" tap. No API key needed
 * (unlike an embedded map), so it's safe in a plain email/WhatsApp message,
 * and works whether the coordinate was captured via Google or the free
 * OpenStreetMap picker. */
export function buildGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function orderConfirmationCustomerEmailTemplate(
  data: OrderConfirmationTemplateData,
): { subject: string; html: string } {
  const itemsHtml = data.items
    .map((item) => `<li>${item.name} × ${item.quantity}</li>`)
    .join('');
  const total = (data.totalInPaise / 100).toFixed(2);
  const mapLinkHtml = data.mapLink
    ? ` — <a href="${data.mapLink}">Get directions</a>`
    : '';

  return {
    subject: `Order confirmed — ${data.orderNumber}`,
    html: `<p>Hi ${data.customerName},</p><p>Your order <strong>${data.orderNumber}</strong> is confirmed and payment received.</p><ul>${itemsHtml}</ul><p>Delivery: <strong>${data.deliverySlotName}</strong> (${data.deliveryWindowStart}–${data.deliveryWindowEnd}) on ${data.deliveryDateLabel}</p><p>Deliver to: ${data.deliveryAddress} (${data.deliveryContactPhone})${mapLinkHtml}</p><p>Total: ₹${total}</p>`,
  };
}
