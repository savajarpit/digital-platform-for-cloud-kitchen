"use client";

import { useCartAddonSync } from "@/lib/hooks/useCartAddonSync";
import { useCartStore } from "@/lib/store/cart-store";

/**
 * Renders nothing. Keeps a cart's saved add-ons honest on EVERY page, not
 * just the cart: a customer who added an add-on last week and returns after
 * the tenant (or the platform admin) switched add-ons off would otherwise
 * carry that add-on around until they happened to open the cart. It only
 * fetches when the cart actually holds a line with add-ons, so an ordinary
 * visit costs nothing.
 */
export function CartAddonSanitizer() {
  const hasAddonLines = useCartStore((s) => s.items.some((i) => (i.addons?.length ?? 0) > 0));
  useCartAddonSync({ enabled: hasAddonLines });
  return null;
}
