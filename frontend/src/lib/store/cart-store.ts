import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  mealId: string;
  name: string;
  priceInPaise: number;
  imageUrl?: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (mealId: string) => void;
  updateQuantity: (mealId: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.mealId === item.mealId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.mealId === item.mealId ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        });
      },
      removeItem: (mealId) =>
        set((state) => ({ items: state.items.filter((i) => i.mealId !== mealId) })),
      updateQuantity: (mealId, quantity) => {
        if (quantity <= 0) {
          set((state) => ({ items: state.items.filter((i) => i.mealId !== mealId) }));
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.mealId === mealId ? { ...i, quantity } : i)),
        }));
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
    state.items.reduce((sum, i) => sum + i.priceInPaise * i.quantity, 0),
  );
}
