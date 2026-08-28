import { ExternalLink } from "lucide-react";
import { buildGoogleMapsLink } from "@/lib/format/maps-link";

/** "Get directions" — opens turn-by-turn Google Maps directions straight to
 * this location (starting point defaults to whoever opens the link's
 * current location), so an owner/driver doesn't need an extra manual tap.
 * Renders nothing when the address has no captured coordinates (e.g. saved
 * before the map picker existed). */
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
      Get directions
    </a>
  );
}
