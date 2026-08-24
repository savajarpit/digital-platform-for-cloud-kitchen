import type { AddressHint } from "@/components/maps/LocationPickerMap";

/** `name` is the specific place/POI name (e.g. a business or landmark) —
 * prefer it for line1 over the street address, matching how Nominatim
 * results are handled, so both providers give consistent auto-fill. */
export function extractGoogleAddressParts(
  name: string | undefined,
  components: google.maps.GeocoderAddressComponent[],
): AddressHint {
  const get = (type: string) => components.find((c) => c.types.includes(type))?.long_name;
  const roadLine = [get("street_number"), get("route")].filter(Boolean).join(" ");
  const line1 = name || roadLine || get("sublocality_level_1") || get("sublocality");
  const city = get("locality") || get("administrative_area_level_2") || get("sublocality_level_1");
  const state = get("administrative_area_level_1");
  const pincode = get("postal_code");
  return { line1, city, state, pincode };
}
