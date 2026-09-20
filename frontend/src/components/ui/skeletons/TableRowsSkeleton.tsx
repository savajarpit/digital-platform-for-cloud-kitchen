import { Skeleton } from "@/components/ui/Skeleton";

// Widths cycle so rows read like real data instead of a uniform block.
const CELL_WIDTHS = ["w-32", "w-44", "w-20", "w-12", "w-24", "w-16"];

/**
 * Just the `<tr>` rows of a table body (same `px-5 py-3` cells as the real
 * rows). Use inside the real `<tbody>` while a new filter/search/page loads,
 * so the header and pagination shell stay mounted and nothing shifts.
 */
export function TableRowsSkeleton({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr
          key={r}
          aria-hidden="true"
          className="border-b border-zinc-50 last:border-none dark:border-zinc-900"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-5 py-3">
              <Skeleton className={`h-5 ${CELL_WIDTHS[(r + c) % CELL_WIDTHS.length]}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
