import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ReviewInput {
  authorName: string;
  rating: number;
  comment?: string;
  isPublished?: boolean;
  sortOrder?: number;
}

export function listReviewsAdmin(): Promise<Review[]> {
  return proxyFetch<Review[]>("/reviews/admin");
}

export function createReview(input: ReviewInput): Promise<Review> {
  return proxyFetch<Review>("/reviews", { method: "POST", body: JSON.stringify(input) });
}

export function updateReview(id: string, input: Partial<ReviewInput>): Promise<Review> {
  return proxyFetch<Review>(`/reviews/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteReview(id: string): Promise<void> {
  return proxyFetch<void>(`/reviews/${id}`, { method: "DELETE" });
}
