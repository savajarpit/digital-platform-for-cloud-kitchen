import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the prep-plan result card: `card p-6` with a subscriber-count
 * line and `py-2` item rows (label left, ×quantity right). */
export function PrepPlanSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card flex flex-col gap-2 p-6" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-7 w-10" />
        </div>
      ))}
    </div>
  );
}
