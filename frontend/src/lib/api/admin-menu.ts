import { ApiError, proxyFetch } from "@/lib/api/client";

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

export interface Meal {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceInPaise: number;
  isVegetarian: boolean;
  isAvailable: boolean;
  dailyQuantityLimit: number | null;
  sortOrder: number;
}

export interface MealInput {
  name: string;
  description?: string;
  imageUrl?: string;
  priceInPaise: number;
  categoryId?: string;
  isVegetarian?: boolean;
  isAvailable?: boolean;
  dailyQuantityLimit?: number;
  sortOrder?: number;
}

export function listMeals(): Promise<Meal[]> {
  return proxyFetch<Meal[]>("/menu/meals/admin");
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
