/** Mirrors backend/src/common/enums/permission.enum.ts's PERMISSION_CATALOG keys. */
export const PERMISSIONS = {
  BRANDING_EDIT: "settings.branding.edit",
  ORDER_HOURS_EDIT: "settings.order-hours.edit",
  NOTIFICATIONS_EDIT: "settings.notifications.edit",
  PAYMENT_EDIT: "settings.payment.edit",
  DELIVERY_ZONES_EDIT: "settings.delivery-zones.edit",
  MENU_MANAGE: "menu.manage",
  ORDERS_MANAGE: "orders.manage",
  DELIVERY_MANAGE: "delivery.manage",
  SUBSCRIPTIONS_MANAGE: "subscriptions.manage",
  STAFF_MANAGE: "staff.manage",
  PROMOTIONS_MANAGE: "promotions.manage",
  CUSTOMERS_VIEW: "customers.view",
} as const;
