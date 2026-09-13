"use client";

import { useEffect, useState } from "react";
import { Utensils } from "lucide-react";
import { listKitchenZones, type KitchenZone } from "@/lib/api/admin-settings";
import { listDiningTables, type DiningTable } from "@/lib/api/dine-in";
import { usePermission } from "@/context/PermissionsContext";
import { useFeatures } from "@/context/FeaturesContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { DineInFloorView } from "@/components/admin/DineInFloorView";
import { TableManagementPanel } from "@/components/admin/TableManagementPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";

export default function AdminDineInPage() {
  const canOrderCreate = usePermission(PERMISSIONS.DINE_IN_ORDER_CREATE);
  const canManageTables = usePermission(PERMISSIONS.DINE_IN_MANAGE);
  const { has: hasFeature, loading: featuresLoading } = useFeatures();
  const hasDineInFeature = hasFeature("dine-in");
  const { showToast } = useToast();
  const [zones, setZones] = useState<KitchenZone[] | null>(null);
  const [zoneId, setZoneId] = useState("");
  const [tab, setTab] = useState<"floor" | "tables">("floor");

  useEffect(() => {
    if (featuresLoading || !hasDineInFeature) return;
    listKitchenZones()
      .then((data) => {
        setZones(data);
        setZoneId(data.find((z) => z.isActive)?.id ?? data[0]?.id ?? "");
      })
      .catch(() => {
        setZones([]);
        showToast("Couldn't load kitchen zones. Try reloading the page.", "error");
      });
  }, [featuresLoading, hasDineInFeature, showToast]);

  // Belt-and-braces alongside the sidebar already hiding this link when the
  // feature is off — a tenant who still has the URL (or a stale bookmark)
  // gets a plain "not enabled" message instead of a page that quietly fails
  // every fetch with a 403 from @RequireFeature('dine-in') on the backend.
  if (!featuresLoading && !hasDineInFeature) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-primary-600">
          <Utensils className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Dine-in
          </h2>
        </div>
        <div className="card p-6 text-sm text-zinc-600 dark:text-zinc-400">
          Dine-in &amp; Takeaway isn&apos;t enabled for your account. Contact your platform admin
          if you&apos;d like this turned on.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-primary-600">
          <Utensils className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Dine-in
          </h2>
        </div>
        {zones && zones.length > 1 && (
          <Select value={zoneId} onValueChange={setZoneId}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!canOrderCreate && <ViewOnlyNotice />}

      {canManageTables && (
        <div className="flex gap-1 border-b border-zinc-100 dark:border-zinc-800">
          {(["floor", "tables"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-primary-600 text-primary-700 dark:text-primary-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              }`}
            >
              {t === "floor" ? "Floor" : "Manage Tables"}
            </button>
          ))}
        </div>
      )}

      {!zones ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-32 w-full" />
        </div>
      ) : zones.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No outlets configured yet — add one under Settings → Delivery Zones first.
        </p>
      ) : !zoneId ? null : tab === "tables" && canManageTables ? (
        <TableManagementPanelSection key={zoneId} zoneId={zoneId} />
      ) : (
        <DineInFloorView key={zoneId} kitchenZoneId={zoneId} />
      )}
    </div>
  );
}

/** Small wrapper so TableManagementPanel (which needs the current table
 * list) can self-fetch/refresh without the parent page carrying that
 * state just for one tab. */
function TableManagementPanelSection({ zoneId }: { zoneId: string }) {
  const { showToast } = useToast();
  const [tables, setTables] = useState<DiningTable[] | null>(null);

  function refresh() {
    listDiningTables(zoneId)
      .then(setTables)
      .catch(() => {
        setTables([]);
        showToast("Couldn't load tables. Try reloading the page.", "error");
      });
  }

  // Caller keys this component by zoneId, so a zone switch remounts it
  // fresh (tables already starts at null) instead of resetting state
  // synchronously in this effect.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId]);

  if (!tables) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
      </div>
    );
  }

  return <TableManagementPanel kitchenZoneId={zoneId} tables={tables} onChanged={refresh} />;
}
