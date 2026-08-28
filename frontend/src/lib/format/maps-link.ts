/** A plain Google Maps URL that opens turn-by-turn directions straight to
 * this location — no `origin` param means Maps defaults the starting point
 * to whoever opens the link's current location (still changeable inside
 * Maps itself), so this needs no manual "Get Directions" tap. Works with no
 * API key (unlike an embedded/interactive map), so it's safe to render
 * anywhere a delivery address has captured coordinates. */
export function buildGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}
