import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartAddonSelection {
  addonItemId: string;
  name: string;
  priceInPaise: number;
  quantity: number;
}

export interface CartItem {
  /** Unique per meal + add-on configuration — two different customizations
   * of the same meal are separate lines, never merged into one quantity. */
  lineKey: string;
  mealId: string;
  name: string;
  priceInPaise: number;
  imageUrl?: string;
  quantity: number;
  addons?: CartAddonSelection[];
}

function buildLineKey(mealId: string, addons?: CartAddonSelection[]): string {
  if (!addons || addons.length === 0) return mealId;
  const sorted = [...addons].sort((a, b) => a.addonItemId.localeCompare(b.addonItemId));
  return `${mealId}::${sorted.map((a) => `${a.addonItemId}:${a.quantity}`).join(",")}`;
}

/** A line's per-unit price including its own add-ons — the meal's own
 * priceInPaise never changes, add-ons are additive on top of it. */
export function cartLineUnitPrice(item: Pick<CartItem, "priceInPaise" | "addons">): number {
  const addonTotal = (item.addons ?? []).reduce((sum, a) => sum + a.priceInPaise * a.quantity, 0);
  return item.priceInPaise + addonTotal;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "lineKey">, quantity?: number) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  /** Replaces a line's add-on selection in place (editing an existing cart
   * line's customization, or auto-pruning a since-unavailable add-on) —
   * recomputes the line's key, merging into an already-identical line if
   * one now exists rather than leaving two lines with the same config. */
  updateItemAddons: (lineKey: string, addons: CartAddonSelection[] | undefined) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        const lineKey = buildLineKey(item.mealId, item.addons);
        set((state) => {
          const existing = state.items.find((i) => i.lineKey === lineKey);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.lineKey === lineKey ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity, lineKey }] };
        });
      },
      removeItem: (lineKey) =>
        set((state) => ({ items: state.items.filter((i) => i.lineKey !== lineKey) })),
      updateQuantity: (lineKey, quantity) => {
        if (quantity <= 0) {
          set((state) => ({ items: state.items.filter((i) => i.lineKey !== lineKey) }));
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.lineKey === lineKey ? { ...i, quantity } : i)),
        }));
      },
      updateItemAddons: (lineKey, addons) => {
        set((state) => {
          const existing = state.items.find((i) => i.lineKey === lineKey);
          if (!existing) return state;
          const cleaned = addons && addons.length > 0 ? addons : undefined;
          const newLineKey = buildLineKey(existing.mealId, cleaned);
          const withoutOld = state.items.filter((i) => i.lineKey !== lineKey);
          const mergeTarget = withoutOld.find((i) => i.lineKey === newLineKey);
          if (mergeTarget) {
            return {
              items: withoutOld.map((i) =>
                i.lineKey === newLineKey ? { ...i, quantity: i.quantity + existing.quantity } : i,
              ),
            };
          }
          return {
            items: [...withoutOld, { ...existing, addons: cleaned, lineKey: newLineKey }],
          };
        });
      },
      clear: () => set({ items: [] }),
    }),
    { name: "cart-storage" },
  ),
);

export function useCartCount(): number {
  return useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));
}

export function useCartSubtotal(): number {
  return useCartStore((state) =>
    state.items.reduce((sum, i) => sum + cartLineUnitPrice(i) * i.quantity, 0),
  );
}
