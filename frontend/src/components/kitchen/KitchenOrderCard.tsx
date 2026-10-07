"use client";

import {
  AlertTriangle,
  ChefHat,
  CheckCircle2,
  Clock,
  MessageSquareText,
  Phone,
  Undo2,
} from "lucide-react";
import type { KitchenCard } from "@/lib/api/kitchen";
import { orderStatusLabel } from "@/lib/format/order-status";
import { ORDER_STATUS_STYLES } from "@/lib/format/status-styles";
import { formatTime12h } from "@/lib/format/time";
import { formatDateTime } from "@/lib/format/date";

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  PICKUP: {
    label: "Pickup",
    className:
      "bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400",
  },
  DINE_IN: {
    label: "Dine-in",
    className:
      "bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-400",
  },
  TAKEAWAY: {
    label: "Takeaway",
    className:
      "bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-400",
  },
};

/** "Lunch · 12:30–2:00 PM", "ASAP · 1:05–1:35 PM", "Any time" (a plan day
 * with no set time), or when a counter order was placed. */
function dueLabel(card: KitchenCard): string {
  if (!card.windowStart || !card.windowEnd) {
    const inStore =
      card.fulfillmentType === "DINE_IN" || card.fulfillmentType === "TAKEAWAY";
    return inStore
      ? `Placed ${formatDateTime(card.placedAt).split(", ").pop()}`
      : card.slotName;
  }
  const window = `${formatTime12h(card.windowStart)}–${formatTime12h(card.windowEnd)}`;
  return card.isInstant ? `ASAP · ${window}` : `${card.slotName} · ${window}`;
}

export function KitchenOrderCard({
  card,
  canUpdate,
  busy,
  onMove,
}: {
  card: KitchenCard;
  canUpdate: boolean;
  busy: boolean;
  onMove: (card: KitchenCard, status: "PREPARING" | "READY") => void;
}) {
  const typeBadge = TYPE_BADGE[card.fulfillmentType];
  const cookingNotes = [card.prepNotes, card.plan?.customerNote].filter(
    Boolean,
  ) as string[];
  const startBlocked = card.stage === "NEW" && card.cancelRequested;

  return (
    <article
      className={`card flex flex-col gap-3 p-4 ${
        cookingNotes.length > 0
          ? "ring-1 ring-amber-300 dark:ring-amber-800"
          : ""
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {card.orderNumber}
          </p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            {card.customerName}
          </p>
          {card.area && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {card.area}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {typeBadge && (
            <span className={`badge ${typeBadge.className}`}>
              {typeBadge.label}
            </span>
          )}
          <span
            className={`badge ${ORDER_STATUS_STYLES[card.status] ?? ORDER_STATUS_STYLES.CONFIRMED}`}
          >
            {card.stage === "NEW"
              ? "New"
              : orderStatusLabel(card.status, card.fulfillmentType)}
          </span>
        </div>
      </header>

      <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
        <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        {dueLabel(card)}
      </p>

      {card.plan && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-primary-700 dark:text-primary-400">
          <span className="font-medium">
            {card.plan.planName}
            {card.plan.dayLabel && ` · ${card.plan.dayLabel}`}
          </span>
          {card.dayChanged && (
            <span className="badge bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400">
              Changed by customer
            </span>
          )}
        </p>
      )}

      {card.cancelRequested && (
        <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The customer asked to cancel — hold off until it&apos;s answered on
          the Orders page.
        </p>
      )}

      {cookingNotes.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase">
            <MessageSquareText className="h-3.5 w-3.5" />
            Note for the kitchen
          </p>
          {cookingNotes.map((note) => (
            <p
              key={note}
              className="mt-0.5 text-sm font-medium whitespace-pre-line"
            >
              {note}
            </p>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {card.items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-800 dark:text-zinc-200">
            <span className="font-display font-bold text-primary-600">
              {item.quantity}×
            </span>{" "}
            {item.name}
            {item.isFreeItem && (
              <span className="ml-1 text-xs text-zinc-400">(free)</span>
            )}
            {item.addons.length > 0 && (
              <ul className="mt-0.5 ml-6 text-xs text-zinc-500 dark:text-zinc-400">
                {item.addons.map((addon) => (
                  <li key={addon.name}>
                    + {addon.name} ×{addon.quantity}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {card.deliveryNote && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium">Delivery note:</span>{" "}
          {card.deliveryNote}
        </p>
      )}

      {card.contact && (
        <details className="text-xs text-zinc-600 dark:text-zinc-400">
          <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
            Contact details
          </summary>
          <div className="mt-1.5 flex flex-col gap-0.5">
            <span>{card.contact.fullName}</span>
            {card.contact.phone && (
              <a
                href={`tel:${card.contact.phone}`}
                className="inline-flex items-center gap-1 text-primary-600 hover:underline"
              >
                <Phone className="h-3 w-3" />
                {card.contact.phone}
              </a>
            )}
            {card.contact.email && (
              <span className="break-all">{card.contact.email}</span>
            )}
            {card.contact.address && <span>{card.contact.address}</span>}
          </div>
        </details>
      )}

      {canUpdate && card.stage !== "DONE" && (
        <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {card.stage === "NEW" && (
            <button
              type="button"
              onClick={() => onMove(card, "PREPARING")}
              disabled={busy || startBlocked}
              title={
                startBlocked
                  ? "Answer the cancellation request first"
                  : undefined
              }
              className="btn-primary btn-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <ChefHat className="h-4 w-4" />
              Start preparing
            </button>
          )}
          {card.stage === "PREPARING" && (
            <button
              type="button"
              onClick={() => onMove(card, "READY")}
              disabled={busy}
              className="btn-primary btn-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark{" "}
              {orderStatusLabel("READY", card.fulfillmentType).toLowerCase()}
            </button>
          )}
          {card.stage === "READY" && (
            <>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Waiting to be handed over
              </span>
              <button
                type="button"
                onClick={() => onMove(card, "PREPARING")}
                disabled={busy}
                className="btn-outline btn-sm ml-auto cursor-pointer disabled:cursor-not-allowed"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo ready
              </button>
            </>
          )}
        </footer>
      )}
    </article>
  );
}
