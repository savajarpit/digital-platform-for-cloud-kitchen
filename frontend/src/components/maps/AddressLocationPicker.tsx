"use client";

import { useState } from "react";
import { LocationPickerMap } from "@/components/maps/LocationPickerMap";

export interface PickedAddress {
  lat: number;
  lng: number;
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

function extractAddressParts(
  components: google.maps.GeocoderAddressComponent[],
): Omit<PickedAddress, "lat" | "lng"> {
  const get = (type: string) => components.find((c) => c.types.includes(type))?.long_name;
  const line1 =
    [get("street_number"), get("route")].filter(Boolean).join(" ") ||
    get("sublocality_level_1") ||
    get("sublocality");
  const city = get("locality") || get("administrative_area_level_2") || get("sublocality_level_1");
  const state = get("administrative_area_level_1");
  const pincode = get("postal_code");
  return { line1, city, state, pincode };
}

/** Wraps {@link LocationPickerMap} with reverse-geocoding — every pin
 * move/search/current-location resolves the real street/city/state/pincode
 * at that point (Blinkit/Zomato-style "confirm your location" flow), so the
 * text fields auto-fill but stay editable rather than being locked. */
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

  function reverseGeocode(nextLat: number, nextLng: number) {
    if (typeof google === "undefined") {
      onPicked({ lat: nextLat, lng: nextLng });
      return;
    }
    setGeocoding(true);
    new google.maps.Geocoder().geocode(
      { location: { lat: nextLat, lng: nextLng } },
      (results, status) => {
        setGeocoding(false);
        if (status === "OK" && results?.[0]) {
          onPicked({
            lat: nextLat,
            lng: nextLng,
            ...extractAddressParts(results[0].address_components),
          });
        } else {
          onPicked({ lat: nextLat, lng: nextLng });
        }
      },
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <LocationPickerMap lat={lat} lng={lng} onChange={reverseGeocode} height={260} />
      {geocoding && <p className="text-xs text-zinc-400">Looking up address…</p>}
    </div>
  );
}
