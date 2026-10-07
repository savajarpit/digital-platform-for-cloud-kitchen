import type { KitchenCard } from './kitchen-card.util';

export interface KitchenPrepSummary {
  /** Dish totals: still to cook (New + Preparing) and already done. */
  items: {
    name: string;
    categoryName: string | null;
    toCook: number;
    done: number;
  }[];
  /** Add-on totals still to cook — "Extra roti ×12". */
  addons: { name: string; quantity: number }[];
  /** Orders still to cook that carry a customer note — the exceptions to
   * read next to the totals. */
  specialRequests: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    slotName: string;
    items: string;
    note: string;
  }[];
  /** Categories present on this day, for the category filter. */
  categories: { id: string; name: string }[];
  ordersToCook: number;
}

const isToCook = (card: KitchenCard): boolean =>
  card.stage === 'NEW' || card.stage === 'PREPARING';

export function buildPrepSummary(
  cards: KitchenCard[],
  categoryId?: string,
): KitchenPrepSummary {
  const categories = new Map<string, string>();
  const items = new Map<string, KitchenPrepSummary['items'][number]>();
  const addons = new Map<string, number>();
  const specialRequests: KitchenPrepSummary['specialRequests'] = [];
  let ordersToCook = 0;

  for (const card of cards) {
    const toCook = isToCook(card);
    const lines = card.items.filter((item) => {
      if (item.categoryId && item.categoryName) {
        categories.set(item.categoryId, item.categoryName);
      }
      return !categoryId || item.categoryId === categoryId;
    });
    if (lines.length === 0) continue;
    if (toCook) ordersToCook += 1;

    for (const line of lines) {
      const row = items.get(line.name) ?? {
        name: line.name,
        categoryName: line.categoryName,
        toCook: 0,
        done: 0,
      };
      if (toCook) row.toCook += line.quantity;
      else row.done += line.quantity;
      items.set(line.name, row);
      if (!toCook) continue;
      for (const addon of line.addons) {
        addons.set(
          addon.name,
          (addons.get(addon.name) ?? 0) + addon.quantity * line.quantity,
        );
      }
    }

    const note = [card.prepNotes, card.plan?.customerNote]
      .filter(Boolean)
      .join(' · ');
    if (toCook && note) {
      specialRequests.push({
        orderId: card.id,
        orderNumber: card.orderNumber,
        customerName: card.customerName,
        slotName: card.slotName,
        items: lines.map((l) => `${l.name} ×${l.quantity}`).join(', '),
        note,
      });
    }
  }

  return {
    items: [...items.values()].sort(
      (a, b) => b.toCook - a.toCook || a.name.localeCompare(b.name),
    ),
    addons: [...addons]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity),
    specialRequests,
    categories: [...categories]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    ordersToCook,
  };
}
