"use client";

import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ChefHat, SearchX } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  getKitchenBoard,
  moveKitchenOrder,
  type KitchenCard,
  type KitchenQuery,
} from "@/lib/api/kitchen";
import { qk } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { orderStatusLabel } from "@/lib/format/order-status";
import { KitchenChip } from "./KitchenChip";
import { KitchenOrderCard } from "./KitchenOrderCard";
import { KitchenBoardSkeleton } from "./KitchenBoardSkeleton";
import type { KitchenStageFilter } from "./useKitchenFilters";

const REFRESH_MS = 30_000;

const STAGE_CHIPS: { key: KitchenStageFilter; label: string }[] = [
  { key: "ACTIVE", label: "In kitchen" },
  { key: "NEW", label: "New" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY", label: "Ready" },
  { key: "DONE", label: "Handed over" },
];

/** One tab's orders (regular orders or plan deliveries), refreshed every
 * 30 seconds so a kitchen screen left open stays current. */
export function KitchenBoard({
  query,
  stage,
  onStageChange,
  canUpdate,
  filtered,
  emptyTitle,
}: {
  query: KitchenQuery;
  stage: KitchenStageFilter;
  onStageChange: (stage: KitchenStageFilter) => void;
  canUpdate: boolean;
  /** Any filter or search is on — changes the empty-state wording. */
  filtered: boolean;
  emptyTitle: string;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [movingId, setMovingId] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: qk.admin("kitchen", "board", query),
    queryFn: () => getKitchenBoard(query),
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (isError) showToast("Couldn't load kitchen orders.", "error");
  }, [isError, showToast]);

  const move = useMutation({
    mutationFn: ({
      card,
      status,
    }: {
      card: KitchenCard;
      status: "PREPARING" | "READY";
    }) => moveKitchenOrder(card.id, status),
    onMutate: ({ card }) => setMovingId(card.id),
    onSuccess: (updated, { card }) => {
      const message =
        updated.stage === "READY"
          ? `${card.orderNumber} is ${orderStatusLabel("READY", card.fulfillmentType).toLowerCase()}`
          : card.stage === "READY"
            ? `${card.orderNumber} is back to preparing`
            : `Started ${card.orderNumber}`;
      showToast(message, "success");
    },
    onError: (error) => {
      showToast(
        error instanceof ApiError
          ? error.message
          : "Couldn't update the order.",
        "error",
      );
    },
    onSettled: () => {
      setMovingId(null);
      void queryClient.invalidateQueries({ queryKey: qk.admin("kitchen") });
    },
  });

  if (isPending) return <KitchenBoardSkeleton />;
  if (!data) {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Couldn&apos;t load orders.
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

  const counts = data.counts;
  const activeCount = counts.NEW + counts.PREPARING + counts.READY;
  const visible =
    stage === "ACTIVE"
      ? data.orders.filter((o) => o.stage !== "DONE")
      : data.orders.filter((o) => o.stage === stage);

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 scrollbar-hidden flex gap-2 overflow-x-auto px-1 pb-1">
        {STAGE_CHIPS.map((chip) => (
          <KitchenChip
            key={chip.key}
            active={stage === chip.key}
            onClick={() => onStageChange(chip.key)}
            count={chip.key === "ACTIVE" ? activeCount : counts[chip.key]}
          >
            {chip.label}
          </KitchenChip>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            compact
            icon={filtered ? SearchX : ChefHat}
            title={filtered ? "No orders match these filters." : emptyTitle}
            description={
              filtered
                ? "Try another search or clear the filters."
                : "New orders show up here on their own."
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((card) => (
            <KitchenOrderCard
              key={card.id}
              card={card}
              canUpdate={canUpdate}
              busy={movingId === card.id}
              onMove={(c, status) => move.mutate({ card: c, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
