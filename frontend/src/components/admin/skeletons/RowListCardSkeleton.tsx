import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder for the settings cards that list bordered rows
 * (`card flex flex-col gap-4 p-6` > `rounded-lg border px-3.5 py-2.5` rows):
 * pincodes, delivery slots, legal pages, social links, FAQs, features...
 * `footer` adds the "add new" input row under the list.
 */
export function RowListCardSkeleton({
  rows = 3,
  description = false,
  footer = false,
  headerAction = false,
  rowLines = 1,
  title = true,
}: {
  rows?: number;
  description?: boolean;
  footer?: boolean;
  headerAction?: boolean;
  /** 2 for rows with a title + a second line of detail (FAQ, features...). */
  rowLines?: 1 | 2;
  /** false for cards that are just a list, with no heading row. */
  title?: boolean;
}) {
  return (
    <div className="card flex flex-col gap-4 p-6" aria-busy="true">
      {title && (
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-40" />
          {headerAction && <Skeleton className="h-8 w-24 rounded-xl" />}
        </div>
      )}
      {description && <Skeleton className="h-4 w-3/4" />}
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
          >
            {rowLines === 2 ? (
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-5 w-48 max-w-[60%]" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <Skeleton className="h-5 w-48 max-w-[60%]" />
            )}
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-11 rounded-full" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
      {footer && (
        <div className="flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <Skeleton className="h-[42px] w-32 rounded-xl" />
          <Skeleton className="h-[42px] w-32 rounded-xl" />
          <Skeleton className="h-8 w-16 rounded-xl" />
        </div>
      )}
    </div>
  );
}
