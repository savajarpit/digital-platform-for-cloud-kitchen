"use client";

import { useState } from "react";
import { LocationPickerMap, type AddressHint } from "@/components/maps/LocationPickerMap";
import { extractGoogleAddressParts } from "@/lib/format/google-address";
import { extractNominatimAddressParts } from "@/lib/format/nominatim-address";
import { MAPS_PROVIDER } from "@/lib/config/env";

export interface PickedAddress extends AddressHint {
  lat: number;
  lng: number;
}

async function reverseGeocodeGoogle(lat: number, lng: number): Promise<AddressHint> {
  return new Promise((resolve) => {
    if (typeof google === "undefined") {
      resolve({});
      return;
    }
    new google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      resolve(
        status === "OK" && results?.[0]
          ? extractGoogleAddressParts(undefined, results[0].address_components)
          : {},
      );
    });
  });
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
