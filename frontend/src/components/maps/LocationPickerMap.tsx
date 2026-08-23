"use client";

import dynamic from "next/dynamic";
import { MAPS_PROVIDER } from "@/lib/config/env";

export interface LocationPickerMapProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
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
