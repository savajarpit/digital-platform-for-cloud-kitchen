import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

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
