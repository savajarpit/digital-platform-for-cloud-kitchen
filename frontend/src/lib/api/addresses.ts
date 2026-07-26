import { ApiError, parseOrThrow, proxyFetch } from "@/lib/api/client";
import { PUBLIC_API_URL } from "@/lib/config/env";

export { ApiError };

export interface Address {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  isDefault: boolean;
}

export interface AddressInput {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  deliveryFeeInPaise?: number;
  minOrderAmountInPaise?: number;
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

export async function checkServiceability(pincode: string): Promise<ServiceabilityResult> {
  const res = await fetch(
    `${PUBLIC_API_URL}/addresses/check-serviceability?pincode=${encodeURIComponent(pincode)}`,
    { headers: { "X-Tenant-Domain": window.location.host } },
  );
  return parseOrThrow<ServiceabilityResult>(res);
}
