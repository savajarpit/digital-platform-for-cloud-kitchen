"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import type { DiningTable } from "@/lib/api/dine-in";

/** Occupied/free is purely derived from `activeOrderId` — there's no
 * stored table status to fall out of sync with the order lifecycle. */
export function TableGrid({
  tables,
  onSeatTable,
}: {
  tables: DiningTable[];
  onSeatTable: (tableId: string) => void;
}) {
  if (tables.length === 0) {
    return <p className="text-sm text-zinc-400">No tables at this outlet yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {tables.map((table) => {
        const occupied = Boolean(table.activeOrderId);
        const inactive = !table.isActive;
        const content = (
          <div
            className={`flex h-24 flex-col items-center justify-center gap-1 rounded-xl border-2 text-center transition-colors ${
              inactive
                ? "border-zinc-100 bg-zinc-50 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-700"
                : occupied
                  ? "cursor-pointer border-red-200 bg-red-50 text-red-700 hover:border-red-300 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                  : "cursor-pointer border-primary-200 bg-primary-50 text-primary-700 hover:border-primary-300 dark:border-primary-900 dark:bg-primary-950/40 dark:text-primary-400"
            }`}
          >
            <span className="font-display text-sm font-bold">{table.label}</span>
            {table.capacity != null && (
              <span className="flex items-center gap-1 text-[11px] opacity-80">
                <Users className="h-3 w-3" />
                {table.capacity}
              </span>
            )}
            <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {inactive ? "Inactive" : occupied ? "Occupied" : "Free"}
            </span>
          </div>
        );

        if (inactive) return <div key={table.id}>{content}</div>;

        return occupied ? (
          <Link key={table.id} href={`/admin/orders/${table.activeOrderId}`}>
            {content}
          </Link>
        ) : (
          <button key={table.id} type="button" onClick={() => onSeatTable(table.id)}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
