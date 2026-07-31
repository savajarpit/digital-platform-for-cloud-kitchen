import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiResponse } from "@/lib/api/response";

export interface StaticPageSummary {
  id: string;
  slug: string;
  title: string;
}

export interface StaticPage extends StaticPageSummary {
  content: string;
  isPublished: boolean;
  updatedAt: string;
}

/** Server Component-only — published pages for the storefront footer. */
export async function getPublishedPages(): Promise<StaticPageSummary[]> {
  try {
    const res = await serverFetch("/pages");
    if (!res.ok) return [];
    const body = (await res.json()) as ApiResponse<StaticPageSummary[]>;
    return body.data ?? [];
  } catch {
    return [];
  }
}

/** Server Component-only — a single published page by slug, or null if missing/unpublished. */
export async function getPublishedPage(slug: string): Promise<StaticPage | null> {
  try {
    const res = await serverFetch(`/pages/${slug}`);
    if (!res.ok) return null;
    const body = (await res.json()) as ApiResponse<StaticPage>;
    return body.data ?? null;
  } catch {
    return null;
  }
}
