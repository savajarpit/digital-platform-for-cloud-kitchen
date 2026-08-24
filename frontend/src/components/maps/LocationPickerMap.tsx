"use client";

import dynamic from "next/dynamic";
import { MAPS_PROVIDER } from "@/lib/config/env";

/** Address parts a provider can hand back alongside lat/lng when it already
 * knows them (a search-result pick) — lets the caller skip a redundant
 * reverse-geocode call and avoids losing a specific place name (e.g. "Madhuvan
 * Green Party Plot") to a reverse lookup's more generic area match. */
export interface AddressHint {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface LocationPickerMapProps {
  lat: number | null;
  lng: number | null;
  /** `hint` is only ever passed for a search-result pick — click/drag/current-location
   * genuinely have no address data beyond the coordinate, so the caller reverse-geocodes those itself. */
  onChange: (lat: number, lng: number, hint?: AddressHint) => void;
  /** Draws a translucent circle around the pin — used for the kitchen's delivery radius. */
  radiusMeters?: number;
  height?: number;
}

// Both providers touch the DOM/window directly (Leaflet, Google's JS SDK) —
// loaded client-only, and only whichever one is actually configured.
const GoogleLocationPickerMap = dynamic(
  () => import("./GoogleLocationPickerMap").then((m) => m.GoogleLocationPickerMap),
  { ssr: false },
);
const OsmLocationPickerMap = dynamic(
  () => import("./OsmLocationPickerMap").then((m) => m.OsmLocationPickerMap),
  { ssr: false },
);

/** Renders whichever map provider `NEXT_PUBLIC_MAPS_PROVIDER` selects — every
 * caller (kitchen location, customer address picker) uses this single
 * component and never needs to know which provider is active. */
export function LocationPickerMap(props: LocationPickerMapProps) {
  return MAPS_PROVIDER === "google" ? (
    <GoogleLocationPickerMap {...props} />
  ) : (
    <OsmLocationPickerMap {...props} />
  );
}
