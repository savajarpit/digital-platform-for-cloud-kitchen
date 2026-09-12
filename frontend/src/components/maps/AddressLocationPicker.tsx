"use client";

import { useEffect, useState } from "react";
import { LocationPickerMap, type AddressHint } from "@/components/maps/LocationPickerMap";
import { extractGoogleAddressParts } from "@/lib/format/google-address";
import { extractNominatimAddressParts } from "@/lib/format/nominatim-address";
import { fetchPublicConfig } from "@/lib/api/settings-client";

export interface PickedAddress extends AddressHint {
  lat: number;
  lng: number;
}

// Geocoding API v4 REST (https://geocode.googleapis.com/v4/geocode/location/...),
// not the classic google.maps.Geocoder JS class — the classic Geocoding API
// is billing-gated the same way legacy Places Autocomplete was, while v4 is
// covered by a plain (even a free demo) API key. CORS-enabled for direct
// browser fetch, confirmed via a real request with an Origin header.
async function reverseGeocodeGoogle(
  lat: number,
  lng: number,
  apiKey: string | undefined,
): Promise<AddressHint> {
  if (!apiKey) return {};
  try {
    const res = await fetch(
      `https://geocode.googleapis.com/v4/geocode/location/${lat},${lng}?key=${apiKey}`,
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
 * whichever provider SUPER_ADMIN has selected (Platform settings → Maps),
 * fetched at runtime — never a build-time env var. */
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
  const [mapsConfig, setMapsConfig] = useState<{
    provider: "google" | "osm";
    apiKey?: string;
  } | null>(null);

  useEffect(() => {
    fetchPublicConfig().then((c) =>
      setMapsConfig({ provider: c.mapsProvider, apiKey: c.googleMapsApiKey }),
    );
  }, []);

  async function handleChange(nextLat: number, nextLng: number, hint?: AddressHint) {
    if (hint) {
      onPicked({ lat: nextLat, lng: nextLng, ...hint });
      return;
    }
    setGeocoding(true);
    const parts =
      mapsConfig?.provider === "google"
        ? await reverseGeocodeGoogle(nextLat, nextLng, mapsConfig.apiKey)
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
