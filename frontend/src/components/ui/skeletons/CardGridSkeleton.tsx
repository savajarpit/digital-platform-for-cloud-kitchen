import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Grid of `card p-5` placeholders. Pass the SAME `gridClassName` the real
 * list uses (defaults to the common 1 / sm:2 / lg:3 admin card grid) so the
 * column count changes at the same breakpoints as the real content.
 */
export function CardGridSkeleton({
  count = 6,
  gridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  lines = 2,
}: {
  count?: number;
  gridClassName?: string;
  lines?: number;
}) {
  return (
    <div className={gridClassName} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex flex-col gap-3 p-5">
          <Skeleton className="h-5 w-2/3" />
          {Array.from({ length: lines }).map((_, l) => (
            <Skeleton key={l} className={`h-4 ${l === lines - 1 ? "w-1/2" : "w-full"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
