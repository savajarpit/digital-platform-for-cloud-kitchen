"use client";

import { useRef, useState } from "react";
import { Autocomplete, Circle, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { LocateFixed, Search } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/config/env";
import { extractGoogleAddressParts } from "@/lib/format/google-address";
import type { LocationPickerMapProps } from "./LocationPickerMap";

const LIBRARIES: "places"[] = ["places"];
// India's rough centroid — only used as the map's starting view when no
// location has been picked yet.
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

/** Search box + draggable pin + "use my current location", backed by the
 * Maps JavaScript API + Places API. Falls back to a plain notice (never a
 * crash) when no API key is configured yet. */
export function GoogleLocationPickerMap({
  lat,
  lng,
  onChange,
  radiusMeters,
  height = 320,
}: LocationPickerMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  });
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const hasPin = lat != null && lng != null;

  function moveTo(nextLat: number, nextLng: number, hint?: Parameters<typeof onChange>[2]) {
    onChange(nextLat, nextLng, hint);
    mapRef.current?.panTo({ lat: nextLat, lng: nextLng });
    mapRef.current?.setZoom(17);
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => moveTo(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handlePlaceChanged() {
    const place = autocomplete?.getPlace();
    const location = place?.geometry?.location;
    if (!location) return;
    // Autocomplete already returns the full address breakdown — use it
    // directly instead of a separate reverse-geocode call, and prefer the
    // place's own name (e.g. a business/landmark) over its street address.
    const hint = place.address_components
      ? extractGoogleAddressParts(place.name, place.address_components)
      : undefined;
    moveTo(location.lat(), location.lng(), hint);
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Map picker unavailable — add a Google Maps API key
        (<code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>) to enable it.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
        Couldn&apos;t load Google Maps — check the API key and that the Maps JavaScript/Places
        APIs are enabled for it.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
        style={{ height }}
      />
    );
  }

  return (
    // `isolate` sandboxes the autocomplete dropdown's stacking below this
    // box, so it never competes with page-level chrome like the sticky
    // header once this component scrolls under it.
    <div className="isolate flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <Autocomplete onLoad={setAutocomplete} onPlaceChanged={handlePlaceChanged}>
            <input type="text" placeholder="Search for an address" className="input w-full pl-8" />
          </Autocomplete>
        </div>
        <button type="button" onClick={handleUseCurrentLocation} className="btn-outline btn-sm shrink-0">
          <LocateFixed className="h-4 w-4" />
          Use current location
        </button>
      </div>
      <GoogleMap
        onLoad={(map) => {
          mapRef.current = map;
        }}
        center={hasPin ? { lat, lng } : DEFAULT_CENTER}
        zoom={hasPin ? 16 : 5}
        mapContainerStyle={{ height, width: "100%", borderRadius: "0.75rem", overflow: "hidden" }}
        onClick={(e) => {
          if (e.latLng) onChange(e.latLng.lat(), e.latLng.lng());
        }}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {hasPin && (
          <Marker
            position={{ lat, lng }}
            draggable
            onDragEnd={(e) => {
              if (e.latLng) onChange(e.latLng.lat(), e.latLng.lng());
            }}
          />
        )}
        {hasPin && radiusMeters && (
          <Circle
            center={{ lat, lng }}
            radius={radiusMeters}
            options={{
              fillColor: "#16a34a",
              fillOpacity: 0.1,
              strokeColor: "#16a34a",
              strokeOpacity: 0.4,
              strokeWeight: 1,
            }}
          />
        )}
      </GoogleMap>
      <p className="text-xs text-zinc-400">Search, use your current location, or click/drag the pin.</p>
    </div>
  );
}
