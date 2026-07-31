import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiResponse } from "@/lib/api/response";

export interface PlatformPageSummary {
  id: string;
  slug: string;
  title: string;
}

export interface PlatformPage extends PlatformPageSummary {
  content: string;
  isPublished: boolean;
  updatedAt: string;
}

/** Server Component-only — a single published platform page by slug, or null if missing/unpublished. */
export async function getPublishedPlatformPage(slug: string): Promise<PlatformPage | null> {
  try {
    const res = await serverFetch(`/platform-pages/${slug}`);
    if (!res.ok) return null;
    const body = (await res.json()) as ApiResponse<PlatformPage>;
    return body.data ?? null;
  } catch {
    return null;
  }
}
