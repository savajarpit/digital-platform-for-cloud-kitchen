import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export type PlatformSubscriptionStatus = "PENDING_PAYMENT" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
export type BillingCycle = "MONTHLY" | "YEARLY";

export interface PlatformSubscriptionSummary {
  status: PlatformSubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  plan: string;
  status: string;
  createdAt: string;
  businessProfile: { displayName: string } | null;
  users: { email: string }[];
  platformSubscription: PlatformSubscriptionSummary | null;
}

export interface TenantDetail extends TenantListItem {
  updatedAt: string;
  businessProfile: {
    displayName: string;
    description: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    pincode: string | null;
    timezone: string;
    currency: string;
  } | null;
  users: { id: string; email: string }[];
  notificationSettings: {
    whatsappEnabled: boolean;
    whatsappProvider: string | null;
    whatsappApiKeyConfigured: boolean;
    whatsappSenderNumber: string | null;
    ownerWhatsappNumber: string | null;
    emailEnabled: boolean;
    emailProvider: string | null;
    emailFromAddress: string | null;
    emailFromName: string | null;
    emailConfigConfigured: boolean;
    ownerNotificationEmail: string | null;
  } | null;
  paymentSettings: {
    razorpayKeyId: string | null;
    razorpayKeySecretConfigured: boolean;
    razorpayWebhookSecretConfigured: boolean;
  } | null;
}

export interface CreateTenantInput {
  businessName: string;
  customDomain?: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName?: string;
}

export interface UpdateTenantInput {
  businessName?: string;
  customDomain?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export function listTenants(): Promise<TenantListItem[]> {
  return proxyFetch<TenantListItem[]>("/platform/tenants");
}

export function createTenant(
  input: CreateTenantInput,
): Promise<{ tenant: TenantListItem; owner: { id: string; email: string } }> {
  return proxyFetch("/platform/tenants", { method: "POST", body: JSON.stringify(input) });
}

export function getTenant(id: string): Promise<TenantDetail> {
  return proxyFetch<TenantDetail>(`/platform/tenants/${id}`);
}

export function updateTenant(id: string, input: UpdateTenantInput): Promise<TenantDetail> {
  return proxyFetch<TenantDetail>(`/platform/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export interface TenantNotificationInput {
  whatsappEnabled?: boolean;
  whatsappProvider?: string;
  whatsappApiKey?: string;
  whatsappSenderNumber?: string;
  ownerWhatsappNumber?: string;
  emailEnabled?: boolean;
  emailProvider?: string;
  emailFromAddress?: string;
  emailFromName?: string;
  emailConfig?: { host: string; port: number; secure: boolean; user?: string; password?: string };
  ownerNotificationEmail?: string;
}

export function updateTenantNotifications(
  id: string,
  input: TenantNotificationInput,
): Promise<TenantDetail["notificationSettings"]> {
  return proxyFetch(`/platform/tenants/${id}/notifications`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export interface TenantPaymentInput {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
}

export function updateTenantPayment(
  id: string,
  input: TenantPaymentInput,
): Promise<TenantDetail["paymentSettings"]> {
  return proxyFetch(`/platform/tenants/${id}/payment`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ── Role-permission grid ─────────────────────────────────────────

export interface PermissionGrant {
  key: string;
  description: string;
  category: string;
  granted: boolean;
}

export function getRoleGrants(tenantId: string, role: string): Promise<PermissionGrant[]> {
  return proxyFetch<PermissionGrant[]>(`/permissions/tenants/${tenantId}/roles/${role}`);
}

export function setPermissionGrant(
  tenantId: string,
  role: string,
  permissionKey: string,
  granted: boolean,
): Promise<PermissionGrant> {
  return proxyFetch<PermissionGrant>(
    `/permissions/tenants/${tenantId}/roles/${role}/${permissionKey}`,
    { method: "PUT", body: JSON.stringify({ granted }) },
  );
}

// ── Feature grid ──────────────────────────────────────────────────

export interface FeatureGrant {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

export function getTenantFeatures(tenantId: string): Promise<FeatureGrant[]> {
  return proxyFetch<FeatureGrant[]>(`/features/tenants/${tenantId}`);
}

export function setFeatureGrant(
  tenantId: string,
  featureKey: string,
  enabled: boolean,
): Promise<FeatureGrant> {
  return proxyFetch<FeatureGrant>(`/features/tenants/${tenantId}/${featureKey}`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
}

// ── Platform billing (Phase 8) ─────────────────────────────────────

export interface CreateSubscriptionInviteInput {
  /** Pick an existing PlatformPlan catalog entry — the other three fields
   * are derived from it server-side when set. Omit to specify a one-off/
   * comped deal via planCode/billingCycle/amountInPaise instead. */
  planId?: string;
  planCode?: string;
  billingCycle?: BillingCycle;
  amountInPaise?: number;
}

export function createSubscriptionInvite(
  tenantId: string,
  input: CreateSubscriptionInviteInput,
): Promise<{ activationUrl: string }> {
  return proxyFetch(`/platform/tenants/${tenantId}/subscription`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function manualActivateTenant(tenantId: string): Promise<void> {
  return proxyFetch<void>(`/platform/tenants/${tenantId}/activate`, { method: "PATCH" });
}

export function cancelSubscriptionAtPeriodEnd(tenantId: string): Promise<void> {
  return proxyFetch<void>(`/platform/tenants/${tenantId}/subscription/cancel`, { method: "POST" });
}

export function resumeSubscription(tenantId: string): Promise<void> {
  return proxyFetch<void>(`/platform/tenants/${tenantId}/subscription/resume`, { method: "POST" });
}

export type PlatformInvoiceStatus = "PAID" | "FAILED";

export interface PlatformInvoice {
  id: string;
  razorpayInvoiceId: string | null;
  razorpayPaymentId: string | null;
  amountInPaise: number;
  status: PlatformInvoiceStatus;
  invoiceUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export function listTenantInvoices(tenantId: string): Promise<PlatformInvoice[]> {
  return proxyFetch<PlatformInvoice[]>(`/platform/tenants/${tenantId}/invoices`);
}

// ── Tenant usage limits ────────────────────────────────────────────

export interface TenantLimits {
  maxOrdersOverride: number | null;
  maxSubscribersOverride: number | null;
  signupLimitEnabled: boolean;
  maxSignupsPerMonth: number | null;
  blockedOrderAttempts: number;
  blockedSubscriberAttempts: number;
  blockedSignupAttempts: number;
}

export interface UpdateTenantLimitsInput {
  maxOrdersOverride?: number | null;
  maxSubscribersOverride?: number | null;
  signupLimitEnabled?: boolean;
  maxSignupsPerMonth?: number | null;
}

export function getTenantLimits(tenantId: string): Promise<TenantLimits> {
  return proxyFetch<TenantLimits>(`/platform/tenants/${tenantId}/limits`);
}

export function updateTenantLimits(
  tenantId: string,
  input: UpdateTenantLimitsInput,
): Promise<TenantLimits> {
  return proxyFetch<TenantLimits>(`/platform/tenants/${tenantId}/limits`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
