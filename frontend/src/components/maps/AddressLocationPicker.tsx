"use client";

import { useState } from "react";
import { LocationPickerMap } from "@/components/maps/LocationPickerMap";
import { MAPS_PROVIDER } from "@/lib/config/env";

export interface PickedAddress {
  lat: number;
  lng: number;
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

function extractGoogleAddressParts(
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

interface NominatimAddress {
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

function extractNominatimAddressParts(address: NominatimAddress): Omit<PickedAddress, "lat" | "lng"> {
  const line1 =
    [address.house_number, address.road].filter(Boolean).join(" ") ||
    address.suburb ||
    address.neighbourhood;
  const city = address.city || address.town || address.village || address.county;
  return { line1, city, state: address.state, pincode: address.postcode };
}

async function reverseGeocodeGoogle(lat: number, lng: number): Promise<Omit<PickedAddress, "lat" | "lng">> {
  return new Promise((resolve) => {
    if (typeof google === "undefined") {
      resolve({});
      return;
    }
    new google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      resolve(status === "OK" && results?.[0] ? extractGoogleAddressParts(results[0].address_components) : {});
    });
  });
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<Omit<PickedAddress, "lat" | "lng">> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    );
    const data = (await res.json()) as { address?: NominatimAddress };
    return data.address ? extractNominatimAddressParts(data.address) : {};
  } catch {
    return {};
  }
}

/** Wraps {@link LocationPickerMap} with reverse-geocoding — every pin
 * move/search/current-location resolves the real street/city/state/pincode
 * at that point (Blinkit/Zomato-style "confirm your location" flow), so the
 * text fields auto-fill but stay editable rather than being locked. Uses
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

  async function handleChange(nextLat: number, nextLng: number) {
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
