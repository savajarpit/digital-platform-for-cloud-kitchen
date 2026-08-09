import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiResponse } from "@/lib/api/response";
import type { Meal } from "@/lib/api/menu";

export interface PublicHomeSection {
  id: string;
  title: string;
  description: string | null;
  items: { id: string; meal: Meal }[];
}

/** Server-side only — enabled home page sections with their products. */
export async function getPublicHomeSections(): Promise<PublicHomeSection[]> {
  try {
    const res = await serverFetch("/home-sections");
    if (!res.ok) return [];
    const body = (await res.json()) as ApiResponse<PublicHomeSection[]>;
    return body.data ?? [];
  } catch {
    return [];
  }
}
