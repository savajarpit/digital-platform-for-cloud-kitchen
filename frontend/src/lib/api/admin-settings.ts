import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

// ── Business profile / branding ──────────────────────────────

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface BusinessProfile {
  id: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  heroImageUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  whatsappBusinessNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  timezone: string;
  currency: string;
  gstNumber: string | null;
  themeConfig: ThemeConfig;
  defaultLocale: string;
  kitchenLat: number | null;
  kitchenLng: number | null;
  deliveryRadiusMeters: number | null;
  deliveryFee: number | null;
  minOrderAmount: number | null;
  freeDeliveryAboveAmount: number | null;
  maxAdvanceOrderDays: number;
  showReviewsOnHomepage: boolean;
  searchConsoleVerification: string | null;
  fssaiLicenseNumber: string | null;
  showFssaiLicense: boolean;
}

export type UpdateBusinessProfileInput = Partial<
  Pick<
    BusinessProfile,
    | "displayName"
    | "description"
    | "logoUrl"
    | "faviconUrl"
    | "heroImageUrl"
    | "supportEmail"
    | "supportPhone"
    | "whatsappBusinessNumber"
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "state"
    | "country"
    | "pincode"
    | "timezone"
    | "currency"
    | "gstNumber"
    | "defaultLocale"
    | "showReviewsOnHomepage"
    | "searchConsoleVerification"
    | "fssaiLicenseNumber"
    | "showFssaiLicense"
  >
> & { themeConfig?: ThemeConfig };

export function getBusinessProfile(): Promise<BusinessProfile> {
  return proxyFetch<BusinessProfile>("/settings/business-profile");
}

export function updateBusinessProfile(
  input: UpdateBusinessProfileInput,
): Promise<BusinessProfile> {
  return proxyFetch<BusinessProfile>("/settings/business-profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ── Order acceptance ──────────────────────────────────────────

export interface DayHours {
  open?: string;
  close?: string;
}

export interface OperatingHours {
  mon?: DayHours;
  tue?: DayHours;
  wed?: DayHours;
  thu?: DayHours;
  fri?: DayHours;
  sat?: DayHours;
  sun?: DayHours;
}

export interface OrderAcceptanceSettings {
  operatingHours: OperatingHours;
  dailyCutoffTime: string | null;
  closedDates: string[];
  isTemporarilyClosed: boolean;
  closureReason: string | null;
}

export interface UpdateOrderAcceptanceInput {
  operatingHours?: OperatingHours;
  dailyCutoffTime?: string;
  closedDates?: string[];
  isTemporarilyClosed?: boolean;
  closureReason?: string;
}

export function getOrderAcceptance(): Promise<OrderAcceptanceSettings> {
  return proxyFetch<OrderAcceptanceSettings>("/settings/order-acceptance");
}

export function updateOrderAcceptance(
  input: UpdateOrderAcceptanceInput,
): Promise<OrderAcceptanceSettings> {
  return proxyFetch<OrderAcceptanceSettings>("/settings/order-acceptance", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export interface InstantDeliverySettings {
  isEnabled: boolean;
  etaMinMinutes: number;
  etaMaxMinutes: number;
}

export interface UpdateInstantDeliveryInput {
  isEnabled?: boolean;
  etaMinMinutes?: number;
  etaMaxMinutes?: number;
}

export function getInstantDeliverySettings(): Promise<InstantDeliverySettings> {
  return proxyFetch<InstantDeliverySettings>("/settings/instant-delivery");
}

export function updateInstantDeliverySettings(
  input: UpdateInstantDeliveryInput,
): Promise<InstantDeliverySettings> {
  return proxyFetch<InstantDeliverySettings>("/settings/instant-delivery", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ── Delivery window ─────────────────────────────────────────────
// Kitchen location/radius/fees moved to the kitchen-zone CRUD below
// (multi-outlet support) — this now only carries the advance-order window.

export interface UpdateDeliveryZonesInput {
  maxAdvanceOrderDays?: number;
}

export function updateDeliveryZones(
  input: UpdateDeliveryZonesInput,
): Promise<BusinessProfile> {
  return proxyFetch<BusinessProfile>("/settings/delivery-zones", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ── Kitchen zones (multi-outlet geo-radius serviceability) ─────

export interface KitchenZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  deliveryFee: number;
  minOrderAmount: number;
  freeDeliveryAboveAmount: number | null;
  isActive: boolean;
}

export interface KitchenZoneInput {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  deliveryFee?: number;
  minOrderAmount?: number;
  freeDeliveryAboveAmount?: number;
  isActive?: boolean;
}

export function listKitchenZones(): Promise<KitchenZone[]> {
  return proxyFetch<KitchenZone[]>("/settings/kitchen-zones");
}

export function createKitchenZone(input: KitchenZoneInput): Promise<KitchenZone> {
  return proxyFetch<KitchenZone>("/settings/kitchen-zones", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateKitchenZone(
  id: string,
  input: Partial<KitchenZoneInput>,
): Promise<KitchenZone> {
  return proxyFetch<KitchenZone>(`/settings/kitchen-zones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteKitchenZone(id: string): Promise<void> {
  return proxyFetch<void>(`/settings/kitchen-zones/${id}`, { method: "DELETE" });
}

// ── Serviceable pincodes ───────────────────────────────────────

export interface ServiceablePincode {
  id: string;
  pincode: string;
  deliveryFee: number;
  minOrderAmount: number;
  freeDeliveryAboveAmount: number | null;
  isActive: boolean;
}

export interface PincodeInput {
  pincode: string;
  deliveryFee?: number;
  minOrderAmount?: number;
  freeDeliveryAboveAmount?: number;
  isActive?: boolean;
}

export function listServiceablePincodes(): Promise<ServiceablePincode[]> {
  return proxyFetch<ServiceablePincode[]>("/settings/serviceable-pincodes");
}

export function createServiceablePincode(input: PincodeInput): Promise<ServiceablePincode> {
  return proxyFetch<ServiceablePincode>("/settings/serviceable-pincodes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateServiceablePincode(
  id: string,
  input: Partial<PincodeInput>,
): Promise<ServiceablePincode> {
  return proxyFetch<ServiceablePincode>(`/settings/serviceable-pincodes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteServiceablePincode(id: string): Promise<void> {
  return proxyFetch<void>(`/settings/serviceable-pincodes/${id}`, { method: "DELETE" });
}

// ── Delivery slots ──────────────────────────────────────────────

export interface DeliverySlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  sortOrder: number;
}

export interface DeliverySlotInput {
  name: string;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  sortOrder?: number;
}

export function listAllDeliverySlots(): Promise<DeliverySlot[]> {
  return proxyFetch<DeliverySlot[]>("/settings/delivery-slots/admin");
}

export function createDeliverySlot(input: DeliverySlotInput): Promise<DeliverySlot> {
  return proxyFetch<DeliverySlot>("/settings/delivery-slots", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDeliverySlot(
  id: string,
  input: Partial<DeliverySlotInput>,
): Promise<DeliverySlot> {
  return proxyFetch<DeliverySlot>(`/settings/delivery-slots/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteDeliverySlot(id: string): Promise<void> {
  return proxyFetch<void>(`/settings/delivery-slots/${id}`, { method: "DELETE" });
}

// ── Notifications ────────────────────────────────────────────────

export type WhatsappProvider = "INTERAKT" | "AISENSY" | "GUPSHUP" | "TWILIO";
export type EmailProvider = "RESEND" | "SMTP";

export interface NotificationSettings {
  whatsappEnabled: boolean;
  whatsappProvider: WhatsappProvider | null;
  whatsappApiKeyConfigured: boolean;
  whatsappSenderNumber: string | null;
  ownerWhatsappNumber: string | null;
  emailEnabled: boolean;
  emailProvider: EmailProvider | null;
  emailFromAddress: string | null;
  emailFromName: string | null;
  emailConfigConfigured: boolean;
  ownerNotificationEmail: string | null;
}

export interface UpdateNotificationSettingsInput {
  whatsappEnabled?: boolean;
  whatsappProvider?: WhatsappProvider;
  whatsappApiKey?: string;
  whatsappSenderNumber?: string;
  ownerWhatsappNumber?: string;
  emailEnabled?: boolean;
  emailProvider?: EmailProvider;
  emailFromAddress?: string;
  emailFromName?: string;
  emailConfig?: { host: string; port: number; secure: boolean; user?: string; password?: string };
  ownerNotificationEmail?: string;
}

export function getNotificationSettings(): Promise<NotificationSettings | null> {
  return proxyFetch<NotificationSettings | null>("/settings/notifications");
}

export function updateNotificationSettings(
  input: UpdateNotificationSettingsInput,
): Promise<NotificationSettings> {
  return proxyFetch<NotificationSettings>("/settings/notifications", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ── Payment ─────────────────────────────────────────────────────

export interface PaymentSettings {
  razorpayKeyId: string | null;
  razorpayKeySecretConfigured: boolean;
  razorpayWebhookSecretConfigured: boolean;
}

export interface UpdatePaymentSettingsInput {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
}

export function getPaymentSettings(): Promise<PaymentSettings | null> {
  return proxyFetch<PaymentSettings | null>("/settings/payment");
}

export function updatePaymentSettings(
  input: UpdatePaymentSettingsInput,
): Promise<PaymentSettings> {
  return proxyFetch<PaymentSettings>("/settings/payment", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
