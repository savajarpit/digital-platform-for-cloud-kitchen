import { OrderConfirmationTemplateData } from '../email/order-confirmation-customer.template';

export function orderConfirmationCustomerWhatsAppTemplate(
  data: OrderConfirmationTemplateData,
): { templateKey: string; params: Record<string, string> } {
  return {
    templateKey: 'order_confirmation_customer',
    params: {
      name: data.customerName,
      order_number: data.orderNumber,
      total: `₹${(data.totalInPaise / 100).toFixed(2)}`,
      slot: `${data.deliverySlotName} (${data.deliveryWindowStart}-${data.deliveryWindowEnd})`,
      date: data.deliveryDateLabel,
    },
  };
}
