import { ExternalLink } from "lucide-react";
import { buildGoogleMapsLink } from "@/lib/format/maps-link";

/** "View on map" — opens the exact pinned location in Google Maps so an
 * owner can forward it straight to a delivery driver. Renders nothing when
 * the address has no captured coordinates (e.g. saved before the map
 * picker existed). */
export function MapLink({
  lat,
  lng,
  className = "",
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  className?: string;
}) {
  if (lat == null || lng == null) return null;

  return (
    <a
      href={buildGoogleMapsLink(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400 ${className}`}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      View on map
    </a>
  );
}
