import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface PlatformSettings {
  id: string;
  whatsappOtpEnabled: boolean;
  updatedAt: string;
}

export function getPlatformSettings(): Promise<PlatformSettings> {
  return proxyFetch<PlatformSettings>("/platform/settings");
}

export function updatePlatformSettings(
  input: Partial<Pick<PlatformSettings, "whatsappOtpEnabled">>,
): Promise<PlatformSettings> {
  return proxyFetch<PlatformSettings>("/platform/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
