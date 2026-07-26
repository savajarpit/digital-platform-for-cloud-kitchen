/**
 * Reads `role` out of a JWT's payload without verifying its signature — used
 * only to decide whether to *show* the Admin nav link, never as an access
 * check (the `/admin` layout and every backend route re-verify for real).
 * Doing this locally avoids an extra network round-trip on every page load
 * just to render one conditional link.
 */
export function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as { role?: string };
    return parsed.role ?? null;
  } catch {
    return null;
  }
}
