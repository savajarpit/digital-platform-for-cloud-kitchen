import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface HomeSectionMeal {
  id: string;
  name: string;
  imageUrl: string | null;
  priceInPaise: number;
  isAvailable: boolean;
}

export interface HomeSectionItem {
  id: string;
  mealId: string;
  sortOrder: number;
  meal: HomeSectionMeal;
}

export interface HomeSection {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isEnabled: boolean;
  items: HomeSectionItem[];
}

export interface HomeSectionInput {
  title: string;
  description?: string;
  sortOrder?: number;
  isEnabled?: boolean;
}

export function listHomeSectionsAdmin(): Promise<HomeSection[]> {
  return proxyFetch<HomeSection[]>("/home-sections/admin");
}

export function createHomeSection(input: HomeSectionInput): Promise<HomeSection> {
  return proxyFetch<HomeSection>("/home-sections", { method: "POST", body: JSON.stringify(input) });
}

export function updateHomeSection(id: string, input: Partial<HomeSectionInput>): Promise<HomeSection> {
  return proxyFetch<HomeSection>(`/home-sections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function setHomeSectionItems(id: string, mealIds: string[]): Promise<HomeSection> {
  return proxyFetch<HomeSection>(`/home-sections/${id}/items`, {
    method: "PUT",
    body: JSON.stringify({ mealIds }),
  });
}

export function deleteHomeSection(id: string): Promise<void> {
  return proxyFetch<void>(`/home-sections/${id}`, { method: "DELETE" });
}
