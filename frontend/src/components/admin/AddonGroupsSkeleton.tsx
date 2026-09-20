import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors AddonGroupsCard: `card p-6` shell, heading, collapsed group rows. */
export function AddonGroupsSkeleton() {
  return (
    <div className="card flex flex-col gap-4 p-6" aria-busy="true">
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[42px] w-full" />
        ))}
      </div>
    </div>
  );
}
