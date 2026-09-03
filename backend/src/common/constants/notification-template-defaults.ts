import { EmailTemplateScope } from '../../generated/prisma';

export interface PlatformEmailTemplateDefault {
  key: string;
  name: string;
  description: string;
  scope: EmailTemplateScope;
  subject: string;
  bodyHtml: string;
  availableVars: string[];
}

export interface PlatformWhatsAppTemplateDefault {
  key: string;
  templateKey: string;
  placeholders: { paramKey: string; label: string }[];
}

const BTN =
  'display:inline-block;padding:12px 24px;background-color:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;';
const CODE_BOX =
  'display:inline-block;padding:16px 28px;background-color:#f4f4f5;border-radius:10px;font-size:28px;font-weight:700;letter-spacing:6px;color:#18181b;margin:12px 0;';
const LABEL = 'color:#71717a;font-size:13px;';

/**
 * The single seed source for every email in the system — both the 7
 * platform-ops rows (SUPER_ADMIN-only, always OkaySync-branded) and the
 * default wording for the 6 customer-facing keys (SUPER_ADMIN-editable;
 * order-confirmation-customer/welcome/reset-password additionally have a
 * tenant-override path via TenantNotificationTemplate). `{{token}}` is
 * replaced by `renderTemplateString` at send time — see that file for the
 * (deliberately simple, no-conditionals) interpolation rule.
 */
export const PLATFORM_EMAIL_TEMPLATE_DEFAULTS: PlatformEmailTemplateDefault[] =
  [
    // ─── Customer-facing (tenant-branded) ──────────────────
    {
      key: 'welcome',
      name: 'Welcome Email',
      description: 'Sent once when a customer’s account is created.',
      scope: EmailTemplateScope.CUSTOMER_DEFAULT,
      subject: 'Welcome to {{businessName}}, {{firstName}}!',
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;">Hi {{firstName}},</p><p style="margin:0 0 16px;">Your account with <strong>{{businessName}}</strong> is ready to go — fresh meals are just a few taps away.</p><p style="margin:0;">Glad to have you with us!</p>`,
      availableVars: ['firstName', 'businessName'],
    },
    {
      key: 'reset-password',
      name: 'Reset Password',
      description: 'Sent when a customer requests a password reset link.',
      scope: EmailTemplateScope.CUSTOMER_DEFAULT,
      subject: 'Reset your {{businessName}} password',
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;">We got a request to reset your password.</p><p style="margin:0 0 24px;"><a href="{{resetUrl}}" style="${BTN}">Reset password</a></p><p style="margin:0;${LABEL}">This link expires in 1 hour. Didn’t request this? You can safely ignore this email.</p>`,
      availableVars: ['resetUrl', 'businessName'],
    },
    {
      key: 'otp',
      name: 'OTP Verification',
      description:
        'Sent for signup/login verification codes. Security-sensitive — never tenant-editable, any role.',
      scope: EmailTemplateScope.CUSTOMER_DEFAULT,
      subject: 'Your {{businessName}} verification code',
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;">Hi {{name}},</p><p style="margin:0 0 8px;">Your verification code is:</p><div style="${CODE_BOX}">{{otp}}</div><p style="margin:16px 0 0;${LABEL}">This code expires in 10 minutes. If you didn’t request this, you can ignore this email.</p>`,
      availableVars: ['name', 'otp', 'businessName'],
    },
    {
      key: 'order-confirmation-customer',
      name: 'Order Confirmation (Customer)',
      description: 'Sent to the customer once a paid order is confirmed.',
      scope: EmailTemplateScope.CUSTOMER_DEFAULT,
      subject: 'Order confirmed — {{orderNumber}}',
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;">Hi {{customerName}},</p><p style="margin:0 0 20px;">Your order <strong>{{orderNumber}}</strong> is confirmed and payment received.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;"><tbody>{{itemsHtml}}</tbody></table><p style="margin:0 0 4px;"><span style="${LABEL}">Delivery</span><br/><strong>{{deliverySlotName}}</strong> ({{deliveryWindowStart}}–{{deliveryWindowEnd}}) on {{deliveryDateLabel}}</p><p style="margin:0 0 20px;"><span style="${LABEL}">Deliver to</span><br/>{{deliveryAddress}} ({{deliveryContactPhone}}){{mapLinkHtml}}</p><p style="margin:0;font-size:18px;font-weight:700;">Total: ₹{{total}}</p>`,
      availableVars: [
        'customerName',
        'orderNumber',
        'total',
        'itemsHtml',
        'deliverySlotName',
        'deliveryWindowStart',
        'deliveryWindowEnd',
        'deliveryDateLabel',
        'deliveryAddress',
        'deliveryContactPhone',
        'mapLinkHtml',
        'businessName',
      ],
    },
    {
      key: 'order-confirmation-owner',
      name: 'Order Confirmation (Owner copy)',
      description:
        'Sent to the tenant’s own order-notification address for every paid order.',
      scope: EmailTemplateScope.CUSTOMER_DEFAULT,
      subject: 'New order — {{orderNumber}}',
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;">New paid order from <strong>{{customerName}}</strong>.</p><p style="margin:0 0 20px;font-size:18px;font-weight:700;">{{orderNumber}} — ₹{{total}}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;"><tbody>{{itemsHtml}}</tbody></table><p style="margin:0 0 4px;"><span style="${LABEL}">Deliver</span><br/><strong>{{deliverySlotName}}</strong> ({{deliveryWindowStart}}–{{deliveryWindowEnd}}) on {{deliveryDateLabel}}</p><p style="margin:0;"><span style="${LABEL}">Address</span><br/>{{deliveryAddress}}<br/>Contact: {{deliveryContactPhone}}{{mapLinkHtml}}</p>`,
      availableVars: [
        'customerName',
        'orderNumber',
        'total',
        'itemsHtml',
        'deliverySlotName',
        'deliveryWindowStart',
        'deliveryWindowEnd',
        'deliveryDateLabel',
        'deliveryAddress',
        'deliveryContactPhone',
        'mapLinkHtml',
      ],
    },
    {
      key: 'subscription-disruption',
      name: 'Subscription Disruption Notice',
      description:
        'Sent when a subscriber’s delivery is skipped/rescheduled and compensation days are added.',
      scope: EmailTemplateScope.CUSTOMER_DEFAULT,
      subject: 'A delivery on your {{planName}} plan is affected',
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;">Hi {{customerName}},</p><p style="margin:0 0 16px;">Your delivery on <strong>{{dateLabel}}</strong> won’t happen — {{reason}}.</p><p style="margin:0;">You’ve been credited <strong>{{compensationDays}} extra {{dayWord}}</strong>, automatically added to the end of your plan.</p>`,
      availableVars: [
        'customerName',
        'planName',
        'dateLabel',
        'reason',
        'compensationDays',
        'dayWord',
      ],
    },

    // ─── Platform-ops (always OkaySync-branded) ────────────
    {
      key: 'platform-activation-invite',
      name: 'Tenant Activation Invite',
      description:
        'Sent to a newly provisioned tenant owner with a link to pay and activate their account.',
      scope: EmailTemplateScope.PLATFORM_OPS,
      subject: 'Activate {{businessName}} on OkaySync',
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;">You’re one step away from going live.</p><p style="margin:0 0 20px;">Complete payment to activate <strong>{{businessName}}</strong> — {{planCode}} plan, ₹{{amount}}/{{cycle}}:</p><p style="margin:0;"><a href="{{activationUrl}}" style="${BTN}">Activate my account</a></p>`,
      availableVars: [
        'businessName',
        'activationUrl',
        'planCode',
        'amount',
        'cycle',
      ],
    },
    {
      key: 'platform-invoice',
      name: 'Platform Invoice',
      description:
        'Sent to a tenant owner once their platform subscription payment is received.',
      scope: EmailTemplateScope.PLATFORM_OPS,
      subject: 'Payment received — ₹{{amount}}',
      bodyHtml: `<p style="margin:0 0 16px;font-size:16px;">Thanks — we’ve received your platform subscription payment of <strong>₹{{amount}}</strong> for {{businessName}}.</p>{{invoiceLinkHtml}}`,
      availableVars: ['businessName', 'amount', 'invoiceLinkHtml'],
    },
    {
      key: 'platform-payment-failed',
      name: 'Platform Payment Failed',
      description:
        'Sent to the tenant owner (and to OkaySync) when a recurring platform-subscription charge fails.',
      scope: EmailTemplateScope.PLATFORM_OPS,
      subject: 'Payment failed — {{businessName}}',
      bodyHtml: `<p style="margin:0;font-size:16px;">{{recipientNote}}</p>`,
      availableVars: ['businessName', 'amount', 'recipientNote'],
    },
    {
      key: 'platform-limit-alert',
      name: 'Usage Limit Alert',
      description:
        'Sent to OkaySync when a tenant nears or hits their plan’s order/subscriber limit.',
      scope: EmailTemplateScope.PLATFORM_OPS,
      subject: '{{stateLabel}} — {{businessName}}',
      bodyHtml: `<p style="margin:0;font-size:16px;">{{message}}</p>`,
      availableVars: ['businessName', 'stateLabel', 'message'],
    },
    {
      key: 'platform-lead-notification',
      name: 'Lead / Upgrade Notification',
      description:
        'Sent to OkaySync when a marketing-site lead comes in or an active tenant requests an upgrade.',
      scope: EmailTemplateScope.PLATFORM_OPS,
      subject: '{{subjectPrefix}} — {{businessName}}',
      bodyHtml: `<p style="margin:0 0 12px;">{{kindLabel}}.</p><p style="margin:0 0 8px;"><span style="${LABEL}">Business</span><br/>{{businessName}}</p><p style="margin:0 0 8px;"><span style="${LABEL}">Contact</span><br/>{{contactLine}}</p>{{planLine}}{{messageLine}}`,
      availableVars: [
        'businessName',
        'kindLabel',
        'subjectPrefix',
        'contactLine',
        'planLine',
        'messageLine',
      ],
    },
    {
      key: 'platform-webhook-failed',
      name: 'Webhook Failure Alert',
      description:
        'Sent to OkaySync when a billing webhook fails processing more than once in a row.',
      scope: EmailTemplateScope.PLATFORM_OPS,
      subject: 'Webhook repeatedly failing — {{eventType}}',
      bodyHtml: `<p style="margin:0 0 12px;">A platform billing webhook (<strong>{{eventType}}</strong>, event id <code>{{eventId}}</code>) has failed processing more than once. Razorpay will keep retrying it automatically for up to 24 hours, but repeated failures usually mean it won’t self-heal.</p><p style="margin:0 0 12px;">Latest error: <code>{{errorMessage}}</code></p><p style="margin:0;${LABEL}">Check the <code>razorpay_webhook_events</code> table for this event id.</p>`,
      availableVars: ['eventType', 'eventId', 'errorMessage'],
    },
    {
      key: 'platform-cancellation-request',
      name: 'Cancellation Request',
      description:
        'Sent to OkaySync when a tenant requests to cancel their platform subscription.',
      scope: EmailTemplateScope.PLATFORM_OPS,
      subject: 'Cancellation request — {{tenantName}}',
      bodyHtml: `<p style="margin:0 0 12px;">A tenant has requested to cancel their platform subscription.</p><p style="margin:0 0 8px;"><span style="${LABEL}">Business</span><br/>{{tenantName}}</p><p style="margin:0 0 16px;"><span style="${LABEL}">Reason</span><br/>{{reason}}</p><p style="margin:0;${LABEL}">Review it in the admin — Platform → Cancellation Requests.</p>`,
      availableVars: ['tenantName', 'reason'],
    },
  ];

/** Sample values for every token any template key uses — backs the
 * SUPER_ADMIN "send test email" button and the tenant-facing live preview,
 * so both can render a real-looking email without a real order/OTP/etc. */
export const SAMPLE_TEMPLATE_DATA: Record<string, string> = {
  firstName: 'Priya',
  name: 'Priya',
  businessName: 'Nutriwell Kitchen',
  resetUrl: 'https://example.com/reset-password?token=sample',
  otp: '482913',
  customerName: 'Priya Sharma',
  orderNumber: 'ORD-10234',
  total: '458.00',
  itemsHtml:
    '<tr><td style="padding:4px 0;">Grilled Chicken Bowl × 2</td></tr><tr><td style="padding:4px 0;">Fresh Lime Soda × 1</td></tr>',
  deliverySlotName: 'Lunch',
  deliveryWindowStart: '12:00 PM',
  deliveryWindowEnd: '1:00 PM',
  deliveryDateLabel: 'Today, 3 Sep',
  deliveryAddress: '221B Baker Street, Bengaluru',
  deliveryContactPhone: '+91 98765 43210',
  mapLinkHtml:
    ' — <a href="https://maps.google.com" style="color:#16a34a;"><strong>Get directions</strong></a>',
  planName: '7-Day Weight Loss Plan',
  dateLabel: 'Thu, 5 Sep',
  reason: 'a kitchen closure on that date',
  compensationDays: '1',
  dayWord: 'day',
  activationUrl: 'https://example.com/activate?token=sample',
  planCode: 'GROWTH',
  amount: '2999.00',
  cycle: 'month',
  invoiceLinkHtml:
    '<p style="margin:0;"><a href="https://example.com/invoice">View your invoice</a></p>',
  recipientNote:
    "Your platform subscription payment of ₹2999.00 for Nutriwell Kitchen failed. Please update your payment method — we'll keep retrying automatically, but your account may be paused if it keeps failing.",
  stateLabel: 'Nearing limit',
  message:
    '<strong>Nutriwell Kitchen</strong> is nearing its plan’s order limit. Worth a heads-up before they actually hit it.',
  kindLabel: 'A new lead came in from the marketing site',
  subjectPrefix: 'New lead',
  contactLine: 'owner@example.com / +91 98765 43210',
  planLine:
    '<p style="margin:0 0 8px;"><span style="color:#71717a;font-size:13px;">Plan interested in</span><br/>Growth</p>',
  messageLine:
    '<p style="margin:0;"><span style="color:#71717a;font-size:13px;">Message</span><br/>Would love a demo.</p>',
  eventType: 'subscription.charged',
  eventId: 'evt_sample123',
  errorMessage: 'Connection timed out',
  tenantName: 'Nutriwell Kitchen',
};

/**
 * SUPER_ADMIN-only registry of the real Meta/Interakt-approved WhatsApp
 * template per notification key (see PlatformWhatsAppTemplate's schema
 * comment for why the wording itself isn't editable here). Seeded from the
 * exact template names/params already live in
 * modules/notifications/templates/whatsapp/*.
 */
export const PLATFORM_WHATSAPP_TEMPLATE_DEFAULTS: PlatformWhatsAppTemplateDefault[] =
  [
    {
      key: 'order-confirmation-customer',
      templateKey: 'order_confirmation_customer',
      placeholders: [
        { paramKey: 'name', label: 'Customer name' },
        { paramKey: 'order_number', label: 'Order number' },
        { paramKey: 'total', label: 'Total (formatted, e.g. ₹450.00)' },
        { paramKey: 'slot', label: 'Delivery slot + window' },
        { paramKey: 'date', label: 'Delivery date' },
      ],
    },
    {
      key: 'order-confirmation-owner',
      templateKey: 'order_confirmation_owner',
      placeholders: [
        { paramKey: 'customer_name', label: 'Customer name' },
        { paramKey: 'order_number', label: 'Order number' },
        { paramKey: 'total', label: 'Total (formatted)' },
        { paramKey: 'slot', label: 'Delivery slot + window' },
        { paramKey: 'date', label: 'Delivery date' },
      ],
    },
    {
      key: 'subscription-disruption',
      templateKey: 'subscription_disruption',
      placeholders: [
        { paramKey: 'name', label: 'Customer name' },
        { paramKey: 'plan_name', label: 'Plan name' },
        { paramKey: 'date', label: 'Affected delivery date' },
        { paramKey: 'reason', label: 'Reason the delivery is affected' },
        { paramKey: 'compensation_days', label: 'Compensation days credited' },
      ],
    },
    {
      key: 'signup-otp',
      templateKey: 'signup_otp',
      placeholders: [
        { paramKey: 'name', label: 'Customer name' },
        { paramKey: 'otp', label: 'Verification code' },
      ],
    },
  ];
