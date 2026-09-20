"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { listDiningTables } from "@/lib/api/dine-in";
import { qk, STALE } from "@/lib/query/keys";
import type { AdminOrderDetail } from "@/lib/api/admin-orders";
import { TableGrid } from "@/components/admin/TableGrid";
import { WaitlistPanel } from "@/components/admin/WaitlistPanel";
import { NewDineInOrderForm } from "@/components/admin/NewDineInOrderForm";
import { DineInFloorSkeleton } from "@/components/admin/DineInFloorSkeleton";

/** The counter's day-to-day view: table grid + waitlist for one outlet.
 * Table CRUD lives in a separate tab (TableManagementPanel) — this is
 * purely the "take/seat orders" surface. */
export function DineInFloorView({ kitchenZoneId }: { kitchenZoneId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openForTableId, setOpenForTableId] = useState<string | null>(null);
  const [openGeneric, setOpenGeneric] = useState(false);

  // Cached per outlet, so switching zones back and forth is instant. A failed
  // load falls back to an empty grid, as before.
  const { data, isError } = useQuery({
    queryKey: qk.admin("dine-in", "tables", kitchenZoneId),
    queryFn: () => listDiningTables(kitchenZoneId),
    staleTime: STALE.short,
  });
  const tables = data ?? (isError ? [] : null);

  // Seating a party changes tables, the waitlist and orders alike.
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: qk.admin("dine-in") });
  }

  function handleCreated(order: AdminOrderDetail) {
    setOpenForTableId(null);
    setOpenGeneric(false);
    router.push(`/admin/orders/${order.id}`);
  }

  if (!tables) return <DineInFloorSkeleton />;

  const freeTables = tables.filter((t) => t.isActive && !t.activeOrderId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tables</h3>
        <button
          type="button"
          onClick={() => {
            setOpenForTableId(null);
            setOpenGeneric((v) => !v);
          }}
          className="btn-primary btn-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New Order
        </button>
      </div>

      {openGeneric && (
        <NewDineInOrderForm
          kitchenZoneId={kitchenZoneId}
          freeTables={freeTables}
          onCreated={handleCreated}
          onCancel={() => setOpenGeneric(false)}
        />
      )}

      <div className="card p-6">
        <TableGrid
          tables={tables}
          onSeatTable={(tableId) => {
            setOpenGeneric(false);
            setOpenForTableId(tableId);
          }}
        />
      </div>

      {openForTableId && (
        <NewDineInOrderForm
          kitchenZoneId={kitchenZoneId}
          freeTables={freeTables}
          defaultTableId={openForTableId}
          onCreated={handleCreated}
          onCancel={() => setOpenForTableId(null)}
        />
      )}

      <WaitlistPanel kitchenZoneId={kitchenZoneId} freeTables={freeTables} onSeated={refresh} />
    </div>
  );
}
