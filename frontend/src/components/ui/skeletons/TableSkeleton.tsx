import { Skeleton } from "@/components/ui/Skeleton";

// Widths cycle so rows read like real data instead of a uniform block.
const CELL_WIDTHS = ["w-32", "w-44", "w-20", "w-12", "w-24", "w-16"];

/**
 * Same shell as the real admin tables (`card overflow-x-auto` > `table.w-full
 * text-sm`, `px-5 py-3` cells, uppercase header row): column count and row
 * height match, so swapping to real data never shifts the layout.
 */
export function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <div className="card overflow-x-auto" aria-busy="true">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left dark:border-zinc-800">
            {Array.from({ length: cols }).map((_, c) => (
              <th key={c} className="px-5 py-3">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-zinc-50 last:border-none dark:border-zinc-900">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-5 py-3">
                  <Skeleton className={`h-5 ${CELL_WIDTHS[(r + c) % CELL_WIDTHS.length]}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
