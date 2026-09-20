import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the real address-card layout in app/account/addresses/page.tsx
 * (`card flex flex-col gap-2 p-5`): title row, two-line address, then the
 * "set as default" link. */
export function AddressCardSkeleton() {
  return (
    <div className="card flex flex-col gap-2 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
      {/* address paragraph: text-sm, two 20px lines */}
      <div className="flex h-10 flex-col justify-between">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      {/* "set default" link: mt-1 text-xs */}
      <Skeleton className="mt-1 h-4 w-24" />
    </div>
  );
}
