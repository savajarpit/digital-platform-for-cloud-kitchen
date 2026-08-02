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
];
