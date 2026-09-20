import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder for a settings card: same `card flex flex-col gap-4 p-6`
 * shell, a heading row, then label + `.input`-height (42px) field pairs,
 * optionally two per row from `sm` up like the real forms.
 */
export function FormSkeleton({
  fields = 4,
  columns = 1,
  cards = 1,
}: {
  fields?: number;
  columns?: 1 | 2 | 3;
  cards?: number;
}) {
  const grid =
    columns === 3
      ? "grid grid-cols-1 gap-4 sm:grid-cols-3"
      : columns === 2
        ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
        : "flex flex-col gap-4";

  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="card flex flex-col gap-4 p-6">
          <Skeleton className="h-5 w-32" />
          <div className={grid}>
            {Array.from({ length: fields }).map((_, f) => (
              <div key={f} className="flex flex-col gap-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-[42px] w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
