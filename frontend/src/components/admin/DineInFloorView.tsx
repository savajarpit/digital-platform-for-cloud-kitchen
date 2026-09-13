"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { listDiningTables, type DiningTable } from "@/lib/api/dine-in";
import type { AdminOrderDetail } from "@/lib/api/admin-orders";
import { TableGrid } from "@/components/admin/TableGrid";
import { WaitlistPanel } from "@/components/admin/WaitlistPanel";
import { NewDineInOrderForm } from "@/components/admin/NewDineInOrderForm";
import { Skeleton } from "@/components/ui/Skeleton";

/** The counter's day-to-day view: table grid + waitlist for one outlet.
 * Table CRUD lives in a separate tab (TableManagementPanel) — this is
 * purely the "take/seat orders" surface. */
export function DineInFloorView({ kitchenZoneId }: { kitchenZoneId: string }) {
  const router = useRouter();
  const [tables, setTables] = useState<DiningTable[] | null>(null);
  const [openForTableId, setOpenForTableId] = useState<string | null>(null);
  const [openGeneric, setOpenGeneric] = useState(false);

  function refresh() {
    listDiningTables(kitchenZoneId).then(setTables).catch(() => setTables([]));
  }

  // Parent keys this component by kitchenZoneId, so a zone switch remounts
  // it fresh (tables already starts at null) instead of resetting state
  // synchronously in this effect.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchenZoneId]);

  function handleCreated(order: AdminOrderDetail) {
    setOpenForTableId(null);
    setOpenGeneric(false);
    router.push(`/admin/orders/${order.id}`);
  }

  if (!tables) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

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
