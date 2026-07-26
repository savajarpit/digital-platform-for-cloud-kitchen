import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the real address-card layout in app/account/addresses/page.tsx. */
export function AddressCardSkeleton() {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3.5 w-24" />
    </div>
  );
}
