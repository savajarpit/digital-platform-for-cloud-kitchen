"use client";

import { useState } from "react";
import { LocationPickerMap, type AddressHint } from "@/components/maps/LocationPickerMap";
import { extractGoogleAddressParts } from "@/lib/format/google-address";
import { extractNominatimAddressParts } from "@/lib/format/nominatim-address";
import { GOOGLE_MAPS_API_KEY, MAPS_PROVIDER } from "@/lib/config/env";

export interface PickedAddress extends AddressHint {
  lat: number;
  lng: number;
}

// Geocoding API v4 REST (https://geocode.googleapis.com/v4/geocode/location/...),
// not the classic google.maps.Geocoder JS class — the classic Geocoding API
// is billing-gated the same way legacy Places Autocomplete was, while v4 is
// covered by a plain (even a free demo) API key. CORS-enabled for direct
// browser fetch, confirmed via a real request with an Origin header.
async function reverseGeocodeGoogle(lat: number, lng: number): Promise<AddressHint> {
  if (!GOOGLE_MAPS_API_KEY) return {};
  try {
    const res = await fetch(
      `https://geocode.googleapis.com/v4/geocode/location/${lat},${lng}?key=${GOOGLE_MAPS_API_KEY}`,
    );
    if (!res.ok) return {};
    const data = (await res.json()) as {
      results?: {
        addressComponents?: { longText: string | null; types?: string[] }[];
        // The house/street-level line as free text — v4 sometimes leaves
        // this untagged (no `types` at all) in addressComponents for a
        // less-structured address, so prefer this over hunting for a
        // street_number+route match that may not exist.
        postalAddress?: { addressLines?: string[] };
      }[];
    };
    const result = data.results?.[0];
    if (!result?.addressComponents) return {};
    const addressLine = result.postalAddress?.addressLines?.[0];
    return extractGoogleAddressParts(addressLine, result.addressComponents);
  } catch {
    return {};
  }
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<AddressHint> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    );
    const data = (await res.json()) as { name?: string; address?: Parameters<typeof extractNominatimAddressParts>[1] };
    return extractNominatimAddressParts(data.name, data.address);
  } catch {
    return {};
  }
}

/** Wraps {@link LocationPickerMap} with reverse-geocoding — every pin
 * move/search/current-location resolves the real street/city/state/pincode
 * at that point (Blinkit/Zomato-style "confirm your location" flow), so the
 * text fields auto-fill but stay editable rather than being locked. A
 * search-result pick already carries its own address breakdown (`hint`) —
 * used directly, skipping a redundant reverse-geocode round trip. Uses
 * whichever provider `NEXT_PUBLIC_MAPS_PROVIDER` selects. */
export function AddressLocationPicker({
  lat,
  lng,
  onPicked,
}: {
  lat: number | null;
  lng: number | null;
  onPicked: (result: PickedAddress) => void;
}) {
  const [geocoding, setGeocoding] = useState(false);

  async function handleChange(nextLat: number, nextLng: number, hint?: AddressHint) {
    if (hint) {
      onPicked({ lat: nextLat, lng: nextLng, ...hint });
      return;
    }
    setGeocoding(true);
    const parts =
      MAPS_PROVIDER === "google"
        ? await reverseGeocodeGoogle(nextLat, nextLng)
        : await reverseGeocodeNominatim(nextLat, nextLng);
    setGeocoding(false);
    onPicked({ lat: nextLat, lng: nextLng, ...parts });
  }

  return (
    <div className="flex flex-col gap-1">
      <LocationPickerMap lat={lat} lng={lng} onChange={handleChange} height={260} />
      {geocoding && <p className="text-xs text-zinc-400">Looking up address…</p>}
    </div>
  );
}
