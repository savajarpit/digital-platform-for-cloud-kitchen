export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
}

/**
 * Tenant entitlement catalog — "does this tenant have access to X at all?",
 * separate from Permission's "can this role do X within a tenant that
 * already has it?" (see common/enums/permission.enum.ts). Core ordering is
 * not listed here — it's always on, not an entitlement toggle.
 */
export const FEATURE_CATALOG: FeatureDefinition[] = [
  {
    key: 'subscriptions',
    name: 'Meal Subscriptions',
    description:
      'Weekly/monthly subscription plans with recurring meal selection',
  },
  {
    key: 'custom-plan-builder',
    name: 'Custom Plan Builder',
    description: 'Customer-facing wizard to build a custom subscription plan',
  },
  {
    key: 'subscription-curated-plans',
    name: 'Curated Subscription Plans',
    description:
      'Owner-authored day-by-day meal plans (e.g. "7-Day Weight Loss Plan") customers subscribe to as-is',
  },
  {
    key: 'subscription-self-cancel',
    name: 'Self-Service Subscription Cancellation (retired)',
    description:
      'No longer used — every customer can now request a cancellation, and the business approves it with a refund or rejects it',
  },
  {
    key: 'order-cancel-requests',
    name: 'Order Cancellation Requests',
    description:
      'Lets customers ask to cancel a one-time order before the kitchen starts preparing it — the business also has to switch it on in Order Hours settings, then approves with a refund or rejects',
  },
  {
    key: 'subscription-plan-time-lock',
    name: 'Lock Subscription Delivery Times',
    description:
      'Hides delivery-time selection for subscription plans (at signup and per-day changes) — customers can still change the delivery address, not the time',
  },
  {
    key: 'delivery-management',
    name: 'Delivery Management',
    description: 'In-house delivery assignment and driver-scoped tracking',
  },
  {
    key: 'promotions',
    name: 'Promotions & Coupons',
    description:
      'Coupon codes, BOGO/free-item offers, and scheduled menu discounts',
  },
  {
    key: 'home-plans-customization',
    name: 'Home & Plans Page Customization',
    description:
      'Lets OWNER/STAFF edit the home page hero/CTA/reviews-section copy and the Plans page header + Why-subscribe/FAQ/contact sections. Without this, the storefront uses sensible defaults and the admin editors are hidden entirely.',
  },
  {
    key: 'custom-notification-templates',
    name: 'Custom Notification Templates',
    description:
      'Lets OWNER/STAFF (with the matching permission) customize their own order-confirmation/welcome/reset-password email wording and pick among SUPER_ADMIN-approved WhatsApp message variants. Off by default — the tenant still gets fully tenant-branded emails, just with platform-authored default wording.',
  },
  {
    key: 'razorpay-refunds',
    name: 'Razorpay Refunds',
    description:
      "Lets OWNER/STAFF (with the matching permission) issue a real refund straight to the customer via the tenant's own Razorpay account when cancelling an order or subscription — not just record a manual refund for the books. Off by default.",
  },
  {
    key: 'dine-in',
    name: 'Dine-in & Takeaway',
    description:
      'In-store ordering at physical tables and counter takeaway — table management, a waitlist queue for walk-ins, and staff-taken orders settled by cash/UPI. Off by default.',
  },
  {
    key: 'menu-addons',
    name: 'Menu Add-ons',
    description:
      'Lets OWNER/STAFF (with menu.manage) build reusable add-on groups — e.g. "Extra Roti", "Choose Spice Level" — and attach them to specific meals. Customers customize a meal before adding it to cart. Off by default.',
  },
  {
    key: 'plan-calendar-view',
    name: 'Plan Calendar View',
    description:
      "Lets OWNER/STAFF show a plan's meals as a month calendar (with a day-details panel) instead of, or alongside, the accordion list — and unlocks named closed dates/holidays on the calendar. Off by default; the storefront keeps the accordion view.",
  },
  {
    key: 'kitchen-display',
    name: 'Kitchen Display',
    description:
      "A Kitchen screen for chefs and staff: today's (or any upcoming day's) orders and plan deliveries with search and filters, a prep summary, and Start / Mark ready buttons. Off by default.",
  },
  {
    key: 'delivery-date-selection',
    name: 'Delivery Date Selection',
    description:
      'Lets customers pick their own delivery dates before checkout and (optionally, tenant-controlled) move a delivery to another date later. Requires Plan Calendar View — has no effect without it. Off by default.',
  },
];
