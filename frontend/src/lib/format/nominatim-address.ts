import type { AddressHint } from "@/components/maps/LocationPickerMap";

export interface NominatimAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
}

/** `name` is the specific place/POI name (e.g. "Madhuvan Green Party Plot")
 * when the point is a named feature — prefer it for line1 over the generic
 * road/area breakdown, which a reverse lookup on a park/POI often lacks. */
export function extractNominatimAddressParts(
  name: string | undefined,
  address: NominatimAddress | undefined,
): AddressHint {
  if (!address) return { line1: name };
  const roadLine = [address.house_number, address.road].filter(Boolean).join(" ");
  const line1 = name || roadLine || address.suburb || address.neighbourhood;
  const city = address.city || address.town || address.village || address.county;
  return { line1, city, state: address.state, pincode: address.postcode };
}
