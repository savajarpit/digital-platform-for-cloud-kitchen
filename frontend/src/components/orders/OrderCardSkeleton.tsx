import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the real order-card layout in app/orders/page.tsx block-for-block
 * (same gaps, breakpoints and line heights), so the list doesn't jump in
 * height/width once real data replaces it. */
export function OrderCardSkeleton() {
  return (
    <div className="card flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center">
      <div className="flex w-full flex-1 flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          {/* order number: text-sm (20px) / date: mt-1 text-xs (16px) */}
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-4 w-20" />
        </div>
        <div className="flex flex-col items-start md:items-end">
          {/* price: font-semibold base (24px) / status badge: mt-1 (24px) */}
          <Skeleton className="h-6 w-16" />
          <Skeleton className="mt-1 h-6 w-28 rounded-full" />
        </div>
      </div>
      {/* invoice icon link: p-2 + 16px icon */}
      <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
    </div>
  );
}
