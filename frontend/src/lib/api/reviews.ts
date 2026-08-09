import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiResponse } from "@/lib/api/response";

export interface PublicReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
}

/** Server-side only — published testimonials for the home page. */
export async function getPublicReviews(): Promise<PublicReview[]> {
  try {
    const res = await serverFetch("/reviews");
    if (!res.ok) return [];
    const body = (await res.json()) as ApiResponse<PublicReview[]>;
    return body.data ?? [];
  } catch {
    return [];
  }
}
