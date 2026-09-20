"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Utensils } from "lucide-react";
import { listKitchenZones } from "@/lib/api/admin-settings";
import { listDiningTables } from "@/lib/api/dine-in";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePermission } from "@/context/PermissionsContext";
import { useFeatures } from "@/context/FeaturesContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { DineInFloorView } from "@/components/admin/DineInFloorView";
import { TableManagementPanel } from "@/components/admin/TableManagementPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { DineInFloorSkeleton, DineInTablesSkeleton } from "@/components/admin/DineInFloorSkeleton";
import { useToast } from "@/context/ToastContext";

export default function AdminDineInPage() {
  const canOrderCreate = usePermission(PERMISSIONS.DINE_IN_ORDER_CREATE);
  const canManageTables = usePermission(PERMISSIONS.DINE_IN_MANAGE);
  const { has: hasFeature, loading: featuresLoading } = useFeatures();
  const hasDineInFeature = hasFeature("dine-in");
  const { showToast } = useToast();
  const [zoneOverride, setZoneOverride] = useState<string | null>(null);
  const [tab, setTab] = useState<"floor" | "tables">("floor");

  // Unique key suffix (under "settings") so editing outlets in Settings
  // invalidates this list without sharing a shape with other consumers.
  const { data, isError } = useQuery({
    queryKey: qk.admin("settings", "kitchen-zones", "dine-in"),
    queryFn: listKitchenZones,
    enabled: !featuresLoading && hasDineInFeature,
    staleTime: STALE.list,
  });
  const zones = data ?? (isError ? [] : null);
  const zoneId = zoneOverride ?? data?.find((z) => z.isActive)?.id ?? data?.[0]?.id ?? "";

  useEffect(() => {
    if (isError) showToast("Couldn't load kitchen zones. Try reloading the page.", "error");
  }, [isError, showToast]);

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
          <Select value={zoneId} onValueChange={setZoneOverride}>
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
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {t === "floor" ? "Floor" : "Manage Tables"}
            </button>
          ))}
        </div>
      )}

      {!zones ? (
        <DineInFloorSkeleton />
      ) : zones.length === 0 ? (
        <EmptyState
          compact
          title="No outlets configured yet"
          description="Add one under Settings → Delivery Zones first."
        />
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
  const queryClient = useQueryClient();
  const { data: tables, isError } = useQuery({
    queryKey: qk.admin("dine-in", "tables", zoneId),
    queryFn: () => listDiningTables(zoneId),
    staleTime: STALE.short,
  });

  useEffect(() => {
    if (isError) showToast("Couldn't load tables. Try reloading the page.", "error");
  }, [isError, showToast]);

  // Table changes also affect the floor view and any open order's table picker.
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: qk.admin("dine-in") });
  }

  if (!tables) return isError ? null : <DineInTablesSkeleton />;

  return <TableManagementPanel kitchenZoneId={zoneId} tables={tables} onChanged={refresh} />;
}
