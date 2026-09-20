import { Skeleton } from "@/components/ui/Skeleton";
import { RowListCardSkeleton } from "@/components/admin/skeletons/RowListCardSkeleton";

/**
 * Mirrors the Delivery Zones page: title, then the same four cards in the
 * same order (kitchen zones, pincodes, advance-order window, slots).
 */
export function DeliveryZonesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-7 w-36" />
      </div>

      <RowListCardSkeleton rows={2} rowLines={2} description headerAction />
      <RowListCardSkeleton rows={3} description footer />

      <div className="card flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-40" />
        <div className="flex max-w-xs flex-col gap-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-[42px] w-full rounded-xl" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <RowListCardSkeleton rows={3} footer />
    </div>
  );
}
