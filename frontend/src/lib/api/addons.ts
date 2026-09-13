import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface AddonItem {
  id: string;
  addonGroupId: string;
  name: string;
  priceInPaise: number;
  /** Caps the +/- stepper once this item is picked — 1 renders a single
   * tap-to-select toggle instead. */
  maxQuantityPerOrder: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface AddonGroup {
  id: string;
  name: string;
  /** 0 = entirely optional; 1+ makes at least one selection required. */
  minSelections: number;
  /** How many distinct items a customer can pick from this group. */
  maxSelections: number;
  isActive: boolean;
  sortOrder: number;
  items: AddonItem[];
}

export interface AddonGroupInput {
  name: string;
  minSelections?: number;
  maxSelections?: number;
}

export interface AddonItemInput {
  addonGroupId: string;
  name: string;
  priceInPaise: number;
  maxQuantityPerOrder?: number;
  isAvailable?: boolean;
}

export function listAddonGroups(): Promise<AddonGroup[]> {
  return proxyFetch<AddonGroup[]>("/addon-groups");
}

export function createAddonGroup(input: AddonGroupInput): Promise<AddonGroup> {
  return proxyFetch<AddonGroup>("/addon-groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAddonGroup(
  id: string,
  input: Partial<AddonGroupInput> & { isActive?: boolean },
): Promise<AddonGroup> {
  return proxyFetch<AddonGroup>(`/addon-groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAddonGroup(id: string): Promise<void> {
  return proxyFetch<void>(`/addon-groups/${id}`, { method: "DELETE" });
}

export function createAddonItem(input: AddonItemInput): Promise<AddonItem> {
  return proxyFetch<AddonItem>("/addon-groups/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAddonItem(
  id: string,
  input: Partial<Omit<AddonItemInput, "addonGroupId">>,
): Promise<AddonItem> {
  return proxyFetch<AddonItem>(`/addon-groups/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAddonItem(id: string): Promise<void> {
  return proxyFetch<void>(`/addon-groups/items/${id}`, { method: "DELETE" });
}

/** Replaces the full set of groups a meal offers in one call — matches a
 * multi-select checkbox list in the meal editor. */
export function setMealAddonGroups(
  mealId: string,
  addonGroupIds: string[],
): Promise<void> {
  return proxyFetch<void>(`/menu/meals/${mealId}/addon-groups`, {
    method: "PUT",
    body: JSON.stringify({ addonGroupIds }),
  });
}
