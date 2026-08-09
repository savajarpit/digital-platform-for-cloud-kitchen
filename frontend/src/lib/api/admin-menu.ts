import { ApiError, proxyFetch, proxyFetchPaginated } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/response";

export { ApiError };

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CategoryInput {
  name: string;
  slug: string;
  sortOrder?: number;
  isActive?: boolean;
}

export function listCategories(): Promise<Category[]> {
  return proxyFetch<Category[]>("/menu/categories/admin");
}

export function createCategory(input: CategoryInput): Promise<Category> {
  return proxyFetch<Category>("/menu/categories", { method: "POST", body: JSON.stringify(input) });
}

export function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  return proxyFetch<Category>(`/menu/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCategory(id: string): Promise<void> {
  return proxyFetch<void>(`/menu/categories/${id}`, { method: "DELETE" });
}

export interface MealNutrition {
  calories?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
}

export interface Meal {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceInPaise: number;
  nutrition: MealNutrition | null;
  isVegetarian: boolean;
  isAvailable: boolean;
  isPopular: boolean;
  dailyQuantityLimit: number | null;
  sortOrder: number;
}

export interface MealInput {
  name: string;
  description?: string;
  imageUrl?: string;
  priceInPaise: number;
  categoryId?: string;
  nutrition?: MealNutrition;
  isVegetarian?: boolean;
  isAvailable?: boolean;
  isPopular?: boolean;
  dailyQuantityLimit?: number;
  sortOrder?: number;
}

export function listMeals(params: {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  isVegetarian?: boolean;
  isPopular?: boolean;
} = {}): Promise<{ data: Meal[]; meta?: PaginationMeta }> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.search) search.set("search", params.search);
  if (params.isVegetarian !== undefined) search.set("isVegetarian", String(params.isVegetarian));
  if (params.isPopular !== undefined) search.set("isPopular", String(params.isPopular));
  const qs = search.toString();
  return proxyFetchPaginated<Meal[]>(`/menu/meals/admin${qs ? `?${qs}` : ""}`);
}

export function createMeal(input: MealInput): Promise<Meal> {
  return proxyFetch<Meal>("/menu/meals", { method: "POST", body: JSON.stringify(input) });
}

export function updateMeal(id: string, input: Partial<MealInput>): Promise<Meal> {
  return proxyFetch<Meal>(`/menu/meals/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteMeal(id: string): Promise<void> {
  return proxyFetch<void>(`/menu/meals/${id}`, { method: "DELETE" });
}
