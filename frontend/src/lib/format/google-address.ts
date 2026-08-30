import type { AddressHint } from "@/components/maps/LocationPickerMap";

/** Structurally compatible with both `google.maps.places.AddressComponent`
 * (New Places API, used by the search-box pick path) and the plain JSON
 * `addressComponents` array the Geocoding API v4 REST endpoint returns (used
 * by reverse-geocoding) — same field names/shape either way, so one
 * extractor serves both without a cast. `types` is occasionally absent on a
 * v4 REST component (e.g. a bare premise/sub-premise line), so it's
 * optional here and guarded below rather than assumed always-present. */
interface RawAddressComponent {
  longText: string | null;
  types?: string[];
}

/** `name` is the specific place/POI name (e.g. a business or landmark) —
 * prefer it for line1 over the street address, matching how Nominatim
 * results are handled, so both providers give consistent auto-fill. */
export function extractGoogleAddressParts(
  name: string | null | undefined,
  components: RawAddressComponent[],
): AddressHint {
  const get = (type: string) => components.find((c) => c.types?.includes(type))?.longText ?? undefined;
  const roadLine = [get("street_number"), get("route")].filter(Boolean).join(" ");
  const line1 = name || roadLine || get("sublocality_level_1") || get("sublocality");
  const city = get("locality") || get("administrative_area_level_2") || get("sublocality_level_1");
  const state = get("administrative_area_level_1");
  const pincode = get("postal_code");
  return { line1, city, state, pincode };
}
