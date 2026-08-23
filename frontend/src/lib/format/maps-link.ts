/** A plain Google Maps URL that opens/pinpoints a location — works with no
 * API key (unlike an embedded/interactive map), so this is safe to render
 * anywhere a delivery address has captured coordinates. */
export function buildGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
