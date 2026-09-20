import type { QueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";

/** An order changed (status, payment, refund, created...): every screen that
 * lists or summarises orders must refetch. */
export function invalidateOrderAreas(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: qk.admin("orders") }),
    qc.invalidateQueries({ queryKey: qk.admin("overview") }),
    qc.invalidateQueries({ queryKey: qk.admin("customers") }),
    qc.invalidateQueries({ queryKey: qk.admin("dine-in") }),
    qc.invalidateQueries({ queryKey: qk.orders.all }),
  ]);
}

/** Meals / categories / add-ons changed: admin menu screens, meal pickers and
 * the storefront menu cache all refetch. */
export function invalidateMenuAreas(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: qk.admin("menu") }),
    qc.invalidateQueries({ queryKey: qk.meals.all }),
  ]);
}
