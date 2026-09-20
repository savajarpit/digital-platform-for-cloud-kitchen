import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Three small rows for a combobox dropdown while a new search loads. Matches
 * the `px-2 py-1.5` option rows; `thumbnail` adds the 32px image slot the
 * meal options have.
 */
export function ComboboxRowsSkeleton({ rows = 3, thumbnail = false }: { rows?: number; thumbnail?: boolean }) {
  return (
    <div aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          {thumbnail && <Skeleton className="h-8 w-8 shrink-0 rounded-md" />}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
