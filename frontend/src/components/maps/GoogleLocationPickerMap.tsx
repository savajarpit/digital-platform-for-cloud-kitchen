"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { LocateFixed, Search } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/config/env";
import { extractGoogleAddressParts } from "@/lib/format/google-address";
import type { LocationPickerMapProps } from "./LocationPickerMap";

const LIBRARIES: "places"[] = ["places"];
// India's rough centroid — only used as the map's starting view when no
// location has been picked yet.
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
// Locks panning to India (incl. J&K, NE states, Andaman/Nicobar) and biases
// Autocomplete predictions the same way.
const INDIA_BOUNDS: google.maps.LatLngBoundsLiteral = {
  south: 6.0,
  west: 68.0,
  north: 37.6,
  east: 97.5,
};

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
  const mapRef = useRef<google.maps.Map | null>(null);
  const hasPin = lat != null && lng != null;

  // Search box — New Places API "data only" Autocomplete (the legacy
  // `google.maps.places.Autocomplete` widget this used to wrap is blocked
  // for any Google Cloud project created after Google's legacy-API cutoff).
  // Structurally mirrors OsmLocationPickerMap's search pattern exactly:
  // debounce -> dropdown of results tagged by the query they belong to ->
  // pick one -> skip the next search (writing the picked display text back
  // into the box shouldn't re-trigger a lookup for that whole string).
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<{
    query: string;
    suggestions: google.maps.places.AutocompleteSuggestion[] | null;
    error: boolean;
  }>({ query: "", suggestions: null, error: false });
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSearchRef = useRef(false);
  // One token per "session" (first keystroke through the resulting pick) —
  // lets Google bill the whole search as one session instead of per
  // keystroke, per Google's own session-token guidance. Cleared after a
  // pick or when the box empties, so the next search starts a fresh one.
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const queryTooShort = query.trim().length < 3;
  const suggestions = searched.query === query ? searched.suggestions : null;
  const searchError = searched.query === query && searched.error;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (!isLoaded || queryTooShort) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }
        const { suggestions: results } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            includedRegionCodes: ["in"],
            locationBias: INDIA_BOUNDS,
            sessionToken: sessionTokenRef.current,
          });
        setSearched({ query, suggestions: results, error: false });
      } catch {
        setSearched({ query, suggestions: null, error: true });
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, queryTooShort, isLoaded]);

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

  async function handlePickResult(suggestion: google.maps.places.AutocompleteSuggestion) {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;
    const place = prediction.toPlace();
    await place.fetchFields({
      fields: ["addressComponents", "location", "displayName", "formattedAddress"],
    });
    if (!place.location) return;
    // The suggestion's own address breakdown, not a separate reverse-geocode
    // call — same reasoning as the legacy path this replaces: a reverse
    // lookup on a park/POI often only resolves the surrounding suburb.
    const hint = place.addressComponents
      ? extractGoogleAddressParts(place.displayName, place.addressComponents)
      : undefined;
    moveTo(place.location.lat(), place.location.lng(), hint);
    skipNextSearchRef.current = true;
    sessionTokenRef.current = null;
    setQuery(place.formattedAddress ?? place.displayName ?? "");
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
      <div className="relative z-[2000] flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for an address"
            className="input w-full pl-8"
          />
          {!queryTooShort && !searching && searchError && (
            <div className="absolute top-full right-0 left-0 z-[2000] mt-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 shadow-lg dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              Couldn&apos;t search right now — check your connection and try again.
            </div>
          )}
          {!queryTooShort && !searchError && (searching || suggestions !== null) && (
            <div className="absolute top-full right-0 left-0 z-[2000] mt-1 max-h-80 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              {searching ? (
                <p className="px-3 py-2 text-xs text-zinc-400">Searching…</p>
              ) : suggestions !== null && suggestions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-400">
                  No matches — try a shorter or more general search (e.g. just the area name).
                </p>
              ) : (
                (suggestions ?? []).map((s, i) => (
                  <button
                    key={s.placePrediction?.placeId ?? i}
                    type="button"
                    onClick={() => handlePickResult(s)}
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {s.placePrediction?.text.toString()}
                  </button>
                ))
              )}
            </div>
          )}
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
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          restriction: { latLngBounds: INDIA_BOUNDS, strictBounds: true },
          minZoom: 5,
        }}
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
