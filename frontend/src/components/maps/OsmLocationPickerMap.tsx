"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Search } from "lucide-react";
import type { LocationPickerMapProps } from "./LocationPickerMap";
import { extractNominatimAddressParts, type NominatimAddress } from "@/lib/format/nominatim-address";

// Leaflet's default marker icon references relative image paths that never
// resolve under a bundler (Turbopack/webpack) — point them at the CDN copies
// instead of shipping/wiring the asset files ourselves.
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];
// Locks panning to India (incl. J&K, NE states, Andaman/Nicobar) —
// `maxBoundsViscosity={1.0}` makes the edge solid instead of elastic.
const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.0, 68.0],
  [37.6, 97.5],
];

interface NominatimResult {
  display_name: string;
  /** The specific place/POI name (e.g. "Madhuvan Green Party Plot") — present
   * whenever the result is a named feature, not just a bare road/area. */
  name?: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Recenters the map whenever the picked point changes from outside a
 * direct map interaction (search result, current-location, programmatic). */
function RecenterOnChange({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

/** Same contract as {@link GoogleLocationPickerMap} — search box + draggable
 * pin + "use my current location" — built on free OpenStreetMap tiles
 * (Leaflet) and free Nominatim search/geocoding. No API key, no billing. */
export function OsmLocationPickerMap({
  lat,
  lng,
  onChange,
  radiusMeters,
  height = 320,
}: LocationPickerMapProps) {
  const [query, setQuery] = useState("");
  // Tagged with the query they belong to, so a stale result set from a
  // previous search term is never mistaken for the current one — avoids
  // needing an extra effect just to clear state when `query` changes.
  const [searched, setSearched] = useState<{
    query: string;
    results: NominatimResult[] | null;
    error: boolean;
  }>({ query: "", results: null, error: false });
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set right before setQuery() in handlePickResult — lets that one query
  // change skip re-searching, since it's a selection being written back
  // into the box, not the user typing a new term to look up.
  const skipNextSearchRef = useRef(false);
  const hasPin = lat != null && lng != null;

  const queryTooShort = query.trim().length < 3;
  const results = searched.query === query ? searched.results : null;
  const searchError = searched.query === query && searched.error;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (queryTooShort) return;
    // Nominatim's usage policy caps free public use at ~1 request/sec —
    // debounce well past that instead of searching on every keystroke.
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`,
        );
        if (!res.ok) throw new Error(`Nominatim search failed: ${res.status}`);
        const data = (await res.json()) as NominatimResult[];
        setSearched({ query, results: data, error: false });
      } catch {
        setSearched({ query, results: null, error: true });
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, queryTooShort]);

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handlePickResult(result: NominatimResult) {
    // Use the search result's own name/address breakdown directly instead of
    // a separate reverse-geocode call — a reverse lookup on a park/POI often
    // only resolves the surrounding suburb, losing the actual place name.
    onChange(
      Number(result.lat),
      Number(result.lon),
      extractNominatimAddressParts(result.name, result.address),
    );
    // Changing `query` here is what hides the dropdown — `results` is
    // derived from whether `searched.query` still matches `query`, and a
    // display name is never the same string as what was typed to find it.
    // Also skip the search effect this one time: without it, writing the
    // long formatted display name back into the box would re-trigger a
    // search for that whole string, which Nominatim can't match — showing
    // "No matches" right after a successful pick.
    skipNextSearchRef.current = true;
    setQuery(result.display_name);
  }

  return (
    // `isolate` sandboxes the z-[2000] below inside this box — it only needs
    // to beat Leaflet's own controls (z-index up to 1000), never the page's
    // sticky header/nav; without this, z-[2000] would escape and render on
    // top of that header too once this component scrolls under it.
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
          {!queryTooShort && !searchError && (searching || results !== null) && (
            <div className="absolute top-full right-0 left-0 z-[2000] mt-1 max-h-80 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              {searching ? (
                <p className="px-3 py-2 text-xs text-zinc-400">Searching…</p>
              ) : results !== null && results.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-400">
                  No matches — try a shorter or more general search (e.g. just the area name).
                </p>
              ) : (
                (results ?? []).map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePickResult(r)}
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {r.display_name}
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
      <MapContainer
        center={hasPin ? [lat, lng] : DEFAULT_CENTER}
        zoom={hasPin ? 16 : 5}
        minZoom={5}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height, width: "100%", borderRadius: "0.75rem", overflow: "hidden" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <RecenterOnChange lat={lat} lng={lng} />
        {hasPin && (
          <Marker
            position={[lat, lng]}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const pos = marker.getLatLng();
                onChange(pos.lat, pos.lng);
              },
            }}
          />
        )}
        {hasPin && radiusMeters && (
          <Circle
            center={[lat, lng]}
            radius={radiusMeters}
            pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.1, opacity: 0.4, weight: 1 }}
          />
        )}
      </MapContainer>
      <p className="text-xs text-zinc-400">Search, use your current location, or click/drag the pin.</p>
    </div>
  );
}
