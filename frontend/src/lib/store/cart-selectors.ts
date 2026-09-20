import { useShallow } from "zustand/react/shallow";
import { useCartStore, type CartItem } from "@/lib/store/cart-store";

/** Every cart line for one meal (one per distinct add-on configuration). */
export function useMealCartLines(mealId: string): CartItem[] {
  return useCartStore(useShallow((s) => s.items.filter((i) => i.mealId === mealId)));
}

export function totalQuantity(lines: CartItem[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/** "Extra roti ×2, Raita" - or "No add-ons" for a plain line. */
export function describeAddons(line: Pick<CartItem, "addons">): string {
  if (!line.addons?.length) return "No add-ons";
  return line.addons.map((a) => (a.quantity > 1 ? `${a.name} ×${a.quantity}` : a.name)).join(", ");
}
