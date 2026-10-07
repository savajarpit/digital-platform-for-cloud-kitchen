"use client";

import { useEffect } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ClipboardList, MessageSquareText } from "lucide-react";
import { getKitchenPrepSummary, type KitchenQuery } from "@/lib/api/kitchen";
import { qk } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

const ALL = "ALL";

/** What to cook for the chosen day and filters: dish totals still to cook
 * (and already done), add-on totals, and the orders with special requests. */
export function KitchenPrepSummary({
  query,
  category,
  onCategoryChange,
}: {
  query: KitchenQuery;
  category: string;
  onCategoryChange: (category: string) => void;
}) {
  const { showToast } = useToast();
  const fullQuery = { ...query, category: category || undefined };
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: qk.admin("kitchen", "prep", fullQuery),
    queryFn: () => getKitchenPrepSummary(fullQuery),
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (isError) showToast("Couldn't load the prep summary.", "error");
  }, [isError, showToast]);

  if (isPending) {
    return (
      <div className="card flex flex-col gap-3 p-6" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Couldn&apos;t load the prep summary.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="btn-outline btn-sm cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {data.ordersToCook} order{data.ordersToCook === 1 ? "" : "s"} still to
          cook
        </p>
        {data.categories.length > 1 && (
          <Select
            value={category || ALL}
            onValueChange={(v) => onCategoryChange(v === ALL ? "" : v)}
          >
            <SelectTrigger
              className="w-auto min-w-40 py-1.5 text-sm"
              aria-label="Menu category"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {data.categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {data.items.length === 0 ? (
        <div className="card">
          <EmptyState
            compact
            icon={ClipboardList}
            title="Nothing to prepare for this day and filter."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="card flex flex-col p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
              <span>Dish</span>
              <span className="flex gap-6">
                <span>Done</span>
                <span>To cook</span>
              </span>
            </div>
            {data.items.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 border-b border-zinc-50 py-2 last:border-none dark:border-zinc-900"
              >
                <div className="min-w-0">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">
                    {item.name}
                  </p>
                  {item.categoryName && (
                    <p className="text-xs text-zinc-400">{item.categoryName}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-6">
                  <span className="w-8 text-right text-sm text-zinc-400">
                    {item.done}
                  </span>
                  <span className="font-display w-12 text-right text-lg font-bold text-primary-600">
                    ×{item.toCook}
                  </span>
                </div>
              </div>
            ))}
            {data.addons.length > 0 && (
              <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Add-ons to cook
                </p>
                {data.addons.map((addon) => (
                  <div
                    key={addon.name}
                    className="flex items-center justify-between py-1.5 text-sm"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {addon.name}
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      ×{addon.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card flex flex-col gap-3 p-4 sm:p-6">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <MessageSquareText className="h-4 w-4 text-amber-600" />
              Special requests
            </p>
            {data.specialRequests.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No customer notes on orders still to cook.
              </p>
            ) : (
              data.specialRequests.map((r) => (
                <div
                  key={r.orderId}
                  className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/40"
                >
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono">{r.orderNumber}</span> ·{" "}
                    {r.customerName} · {r.slotName}
                  </p>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    {r.items}
                  </p>
                  <p className="mt-0.5 text-sm font-medium whitespace-pre-line text-amber-900 dark:text-amber-200">
                    {r.note}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
