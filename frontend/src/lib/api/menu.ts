import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiResponse } from "@/lib/api/response";

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Meal {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceInPaise: number;
  nutrition: Record<string, unknown>;
  isVegetarian: boolean;
  isAvailable: boolean;
  dailyQuantityLimit: number | null;
  sortOrder: number;
  category: MenuCategory | null;
}

/** Server-side only — fetched fresh per request, never cached (per-tenant data). */
export async function getCategories(): Promise<MenuCategory[]> {
  try {
    const res = await serverFetch("/menu/categories");
    if (!res.ok) return [];
    const body = (await res.json()) as ApiResponse<MenuCategory[]>;
    return body.data ?? [];
  } catch {
    return [];
  }
}

export async function getMeals(params?: {
  categoryId?: string;
  search?: string;
}): Promise<Meal[]> {
  try {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set("categoryId", params.categoryId);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();

    const res = await serverFetch(`/menu/meals${qs ? `?${qs}` : ""}`);
    if (!res.ok) return [];
    const body = (await res.json()) as ApiResponse<Meal[]>;
    return body.data ?? [];
  } catch {
    return [];
  }
}
