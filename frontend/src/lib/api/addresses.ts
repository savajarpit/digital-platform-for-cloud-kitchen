import { ApiError, parseOrThrow, proxyFetch } from "@/lib/api/client";
import { PUBLIC_API_URL } from "@/lib/config/env";

export { ApiError };

export interface Address {
  id: string;
  label: string | null;
  contactPhone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
}

export interface AddressInput {
  label?: string;
  contactPhone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  deliveryFeeInPaise?: number;
  minOrderAmountInPaise?: number;
  freeDeliveryAboveAmountInPaise?: number;
}

export function listAddresses(): Promise<Address[]> {
  return proxyFetch<Address[]>("/addresses");
}

export function createAddress(input: AddressInput): Promise<Address> {
  return proxyFetch<Address>("/addresses", { method: "POST", body: JSON.stringify(input) });
}

export function updateAddress(id: string, input: Partial<AddressInput>): Promise<Address> {
  return proxyFetch<Address>(`/addresses/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteAddress(id: string): Promise<void> {
  return proxyFetch<void>(`/addresses/${id}`, { method: "DELETE" });
}

export async function checkServiceability(query: {
  pincode?: string;
  lat?: number;
  lng?: number;
}): Promise<ServiceabilityResult> {
  const params = new URLSearchParams();
  if (query.pincode) params.set("pincode", query.pincode);
  if (query.lat !== undefined) params.set("lat", String(query.lat));
  if (query.lng !== undefined) params.set("lng", String(query.lng));

  const res = await fetch(`${PUBLIC_API_URL}/addresses/check-serviceability?${params.toString()}`, {
    headers: { "X-Tenant-Domain": window.location.host },
  });
  return parseOrThrow<ServiceabilityResult>(res);
}
