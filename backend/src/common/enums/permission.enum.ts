export interface PermissionDefinition {
  key: string;
  description: string;
  category: string;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    key: 'settings.branding.edit',
    description: 'Edit business name, logo, and theme colors',
    category: 'settings',
  },
  {
    key: 'settings.order-hours.edit',
    description: 'Edit operating hours and order cutoff time',
    category: 'settings',
  },
  {
    key: 'settings.notifications.edit',
    description: 'Edit WhatsApp/email notification configuration',
    category: 'settings',
  },
  {
    key: 'settings.payment.edit',
    description: 'Edit Razorpay payment configuration',
    category: 'settings',
  },
  {
    key: 'settings.delivery-zones.edit',
    description:
      'Edit serviceable pincodes, kitchen location/radius, delivery slots, and advance-order window',
    category: 'settings',
  },
  {
    key: 'settings.content.edit',
    description:
      'Edit legal/footer pages (Privacy Policy, Terms of Service, Refund Policy, etc.)',
    category: 'settings',
  },
  {
    key: 'menu.manage',
    description: 'Create, edit, and delete menu items',
    category: 'operations',
  },
  {
    key: 'orders.manage',
    description: 'View and manage customer orders',
    category: 'operations',
  },
  {
    key: 'delivery.manage',
    description: 'Assign and track deliveries',
    category: 'operations',
  },
  {
    key: 'subscriptions.manage',
    description: 'View and manage customer subscriptions',
    category: 'operations',
  },
  {
    key: 'staff.manage',
    description: 'Create and manage staff/delivery accounts',
    category: 'operations',
  },
  {
    key: 'promotions.manage',
    description: 'Create and manage coupons and promotions',
    category: 'operations',
  },
  {
    key: 'customers.view',
    description: 'View customer accounts and their order history',
    category: 'operations',
  },
  {
    key: 'notification-templates.email.edit',
    description:
      'Edit the wording of your customer emails (order confirmation, welcome, reset-password) — only takes effect once SUPER_ADMIN has granted the Custom Notification Templates feature',
    category: 'settings',
  },
  {
    key: 'notification-templates.whatsapp.edit',
    description:
      'Preview and pick between SUPER_ADMIN-approved WhatsApp message formats for order confirmations — only takes effect once SUPER_ADMIN has granted the Custom Notification Templates feature',
    category: 'settings',
  },
];
