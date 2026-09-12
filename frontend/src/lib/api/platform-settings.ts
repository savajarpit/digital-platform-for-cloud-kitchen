import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export type MapsProvider = "OSM" | "GOOGLE";

export interface PlatformSettings {
  id: string;
  whatsappOtpEnabled: boolean;
  mapsProvider: MapsProvider;
  /** Never the raw key — redacted server-side, same pattern as every other
   * provider credential in this app. */
  googleMapsApiKeyConfigured: boolean;
  updatedAt: string;
}

export interface UpdatePlatformSettingsInput {
  whatsappOtpEnabled?: boolean;
  mapsProvider?: MapsProvider;
  /** Plaintext; omit to leave the currently stored key untouched. */
  googleMapsApiKey?: string;
}

export function getPlatformSettings(): Promise<PlatformSettings> {
  return proxyFetch<PlatformSettings>("/platform/settings");
}

export function updatePlatformSettings(
  input: UpdatePlatformSettingsInput,
): Promise<PlatformSettings> {
  return proxyFetch<PlatformSettings>("/platform/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
