import { ApiError, proxyFetch } from "@/lib/api/client";
import type { PlatformPage } from "@/lib/api/platform-pages";

export { ApiError };
export type { PlatformPage };

export interface PlatformPageInput {
  slug: string;
  title: string;
  content: string;
  isPublished?: boolean;
}

export function listPlatformPagesAdmin(): Promise<PlatformPage[]> {
  return proxyFetch<PlatformPage[]>("/platform-pages/admin");
}

export function createPlatformPage(input: PlatformPageInput): Promise<PlatformPage> {
  return proxyFetch<PlatformPage>("/platform-pages", { method: "POST", body: JSON.stringify(input) });
}

export function updatePlatformPage(
  id: string,
  input: Partial<PlatformPageInput>,
): Promise<PlatformPage> {
  return proxyFetch<PlatformPage>(`/platform-pages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deletePlatformPage(id: string): Promise<void> {
  return proxyFetch<void>(`/platform-pages/${id}`, { method: "DELETE" });
}
