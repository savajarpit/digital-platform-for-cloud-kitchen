import { ApiError, proxyFetch } from "@/lib/api/client";
import type { StaticPage } from "@/lib/api/content";

export { ApiError };
export type { StaticPage };

export interface StaticPageInput {
  slug: string;
  title: string;
  content: string;
  isPublished?: boolean;
}

export function listPagesAdmin(): Promise<StaticPage[]> {
  return proxyFetch<StaticPage[]>("/pages/admin");
}

export function createPage(input: StaticPageInput): Promise<StaticPage> {
  return proxyFetch<StaticPage>("/pages", { method: "POST", body: JSON.stringify(input) });
}

export function updatePage(id: string, input: Partial<StaticPageInput>): Promise<StaticPage> {
  return proxyFetch<StaticPage>(`/pages/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deletePage(id: string): Promise<void> {
  return proxyFetch<void>(`/pages/${id}`, { method: "DELETE" });
}
