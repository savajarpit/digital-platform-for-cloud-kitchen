import { PUBLIC_API_URL } from "@/lib/config/env";
import type { ApiResponse } from "@/lib/api/response";
import type { Meal } from "@/lib/api/menu";

export type MealSortOption = "price_asc" | "price_desc";

export interface MenuSearchParams {
  categoryId?: string;
  search?: string;
  isVegetarian?: boolean;
  isPopular?: boolean;
  sortBy?: MealSortOption;
}

/**
 * Client Component equivalent of `getMeals` (lib/api/menu.ts) — public
 * endpoint, so it fetches the backend directly rather than through the
 * cookie-forwarding proxy, same pattern as `settings-client.ts`.
 */
export async function fetchMealsClient(params: MenuSearchParams = {}): Promise<Meal[]> {
  try {
    return await fetchMealsOrThrow(params);
  } catch {
    return [];
  }
}

/** Same request, but a failure throws instead of reading as "no meals" — for
 * screens that need to tell "nothing matched" apart from "couldn't load". */
export async function fetchMealsOrThrow(params: MenuSearchParams = {}): Promise<Meal[]> {
  const query = new URLSearchParams();
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.search) query.set("search", params.search);
  if (params.isVegetarian !== undefined) query.set("isVegetarian", String(params.isVegetarian));
  if (params.isPopular !== undefined) query.set("isPopular", String(params.isPopular));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  const qs = query.toString();

  const res = await fetch(`${PUBLIC_API_URL}/menu/meals${qs ? `?${qs}` : ""}`, {
    headers: { "X-Tenant-Domain": window.location.host },
  });
  if (!res.ok) throw new Error(`Menu request failed (${res.status})`);
  const body = (await res.json()) as ApiResponse<Meal[]>;
  return body.data ?? [];
}
