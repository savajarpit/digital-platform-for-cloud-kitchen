import type { QueryClient } from "@tanstack/react-query";
import { checkServiceability, type Address } from "@/lib/api/addresses";
import { fetchMealsOrThrow } from "@/lib/api/menu-client";
import { getOrderWindowStatus } from "@/lib/api/order-window";
import { getDeliverySlots } from "@/lib/api/delivery-slots";
import { qk } from "@/lib/query/keys";
import type { CartAddonSelection, CartItem } from "@/lib/store/cart-store";

export type PreflightResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      /** The cart itself must change (item gone) - send the customer there. */
      goToCart?: boolean;
      /** Add-ons that are no longer offered: strip them from these lines. */
      prune?: { lineKey: string; addons: CartAddonSelection[] }[];
    };

/**
 * The checks a customer must pass RIGHT NOW to place an order, run against
 * fresh (never cached) data at the moment they press "Place order": store
 * open, every cart item still available with its add-ons still offered, and
 * (for delivery) the address still serviceable. Cached gate data can be
 * seconds-to-minutes old, and a tenant may have closed the store, disabled a
 * meal or add-on, or shrunk a delivery area in that time - so the click
 * itself re-verifies. The backend independently rejects the same cases; this
 * just turns a late server error into an immediate, specific message.
 *
 * A lookup that fails (network) does not block: the backend stays the
 * authority, and a hiccup shouldn't stop a valid order.
 */
export async function runCheckoutPreflight({
  queryClient,
  items,
  isPickup,
  address,
  schedule,
}: {
  queryClient: QueryClient;
  items: CartItem[];
  isPickup: boolean;
  address: Pick<Address, "pincode" | "lat" | "lng"> | undefined;
  /** Instant needs the kitchen open right now; a scheduled order needs its own day open. */
  schedule: "instant" | { date: string };
}): Promise<PreflightResult> {
  const fresh = { staleTime: 0 } as const;

  const [windowStatus, slotsConfig, meals, serviceability] = await Promise.all([
    schedule === "instant"
      ? queryClient
          .fetchQuery({ queryKey: qk.checkout.orderWindow, queryFn: getOrderWindowStatus, ...fresh })
          .catch(() => null)
      : Promise.resolve(null),
    schedule === "instant"
      ? Promise.resolve(null)
      : queryClient.fetchQuery({ queryKey: qk.checkout.slots, queryFn: getDeliverySlots, ...fresh }).catch(() => null),
    queryClient
      .fetchQuery({ queryKey: qk.meals.list({}), queryFn: () => fetchMealsOrThrow(), ...fresh })
      .catch(() => null),
    !isPickup && address
      ? queryClient
          .fetchQuery({
            queryKey: qk.addresses.serviceability(address.pincode, address.lat ?? null, address.lng ?? null),
            queryFn: () =>
              checkServiceability({
                pincode: address.pincode,
                lat: address.lat ?? undefined,
                lng: address.lng ?? undefined,
              }),
            ...fresh,
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  if (windowStatus && !windowStatus.isAcceptingOrders) {
    return { ok: false, message: windowStatus.reason ?? "We're not accepting orders right now." };
  }
  if (slotsConfig && schedule !== "instant") {
    if (slotsConfig.storeClosedReason) {
      return { ok: false, message: `We're not taking orders right now — ${slotsConfig.storeClosedReason}.` };
    }
    const day = slotsConfig.days.find((d) => d.date === schedule.date);
    if (day && !day.open) {
      return { ok: false, message: `We can't deliver on that day (${day.reason ?? "closed"}) — please pick another.` };
    }
  }

  if (meals) {
    const byId = new Map(meals.map((m) => [m.id, m]));
    const gone = items.filter((i) => !byId.has(i.mealId));
    if (gone.length > 0) {
      return {
        ok: false,
        goToCart: true,
        message: `${gone.map((i) => i.name).join(", ")} ${gone.length > 1 ? "are" : "is"} no longer available.`,
      };
    }

    const prune: { lineKey: string; addons: CartAddonSelection[] }[] = [];
    const names: string[] = [];
    for (const item of items) {
      if (!item.addons?.length) continue;
      const offered = new Set(
        (byId.get(item.mealId)?.addonGroups ?? []).flatMap((g) =>
          g.isActive ? g.items.filter((i) => i.isAvailable).map((i) => i.id) : [],
        ),
      );
      const stillValid = item.addons.filter((a) => offered.has(a.addonItemId));
      if (stillValid.length !== item.addons.length) {
        prune.push({ lineKey: item.lineKey, addons: stillValid });
        names.push(item.name);
      }
    }
    if (prune.length > 0) {
      return {
        ok: false,
        prune,
        message: `Add-ons are no longer available for ${names.join(", ")}. We've removed them - please review your total.`,
      };
    }
  }

  if (serviceability && !serviceability.serviceable) {
    return { ok: false, message: "We no longer deliver to this address. Please choose another." };
  }

  return { ok: true };
}
