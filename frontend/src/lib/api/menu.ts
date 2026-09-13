import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiResponse } from "@/lib/api/response";
import type { AddonGroup } from "@/lib/api/addons";

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ActivePromotion {
  promotionName: string;
  discountPercentage: number;
}

export interface Meal {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  priceInPaise: number;
  nutrition: Record<string, unknown>;
  isVegetarian: boolean;
  isAvailable: boolean;
  isPopular: boolean;
  // Both null unless the admin set a weight — only render a badge when both are present.
  weightValue: number | null;
  weightUnit: "G" | "KG" | null;
  dailyQuantityLimit: number | null;
  sortOrder: number;
  category: MenuCategory | null;
  activePromotion?: ActivePromotion | null;
  // Present only when the tenant has the menu-addons feature — which
  // groups this meal actually offers. Absent entirely when the feature is
  // off, never an empty array standing in for "disabled."
  addonGroups?: AddonGroup[];
}

/** Server-side only — fetched fresh per request, never cached (per-tenant data). */
export async function getMeal(id: string): Promise<Meal | null> {
  try {
    const res = await serverFetch(`/menu/meals/${id}`);
    if (!res.ok) return null;
    const body = (await res.json()) as ApiResponse<Meal>;
    return body.data ?? null;
  } catch {
    return null;
  }
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
