"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Inbox,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { usePermission } from "@/context/PermissionsContext";
import { useFeature } from "@/context/FeaturesContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { SearchInput } from "@/components/ui/SearchInput";
import { PlansPageSettingsCard } from "@/components/subscriptions-admin/PlansPageSettingsCard";
import { PlanFeaturesManager } from "@/components/admin/PlanFeaturesManager";
import { PlanFaqManager } from "@/components/admin/PlanFaqManager";
import { SubscriptionAnalyticsTab } from "@/components/admin/SubscriptionAnalyticsTab";
import { PlansTab } from "@/components/subscriptions-admin/PlansTab";
import { SubscribersTab } from "@/components/subscriptions-admin/SubscribersTab";
import { TodaysDeliveriesTab } from "@/components/subscriptions-admin/TodaysDeliveriesTab";
import { SubscriptionSettingsTab } from "@/components/subscriptions-admin/SubscriptionSettingsTab";
import { PlanDisplaySettingsCard } from "@/components/subscriptions-admin/PlanDisplaySettingsCard";
import { DeliveryDateSelectionCard } from "@/components/subscriptions-admin/DeliveryDateSelectionCard";
import { CancellationRequestsList } from "@/components/admin/CancellationRequestsList";
import { usePendingCancellationCount } from "@/lib/hooks/usePendingCancellationCount";

type Tab = "plans" | "subscribers" | "today" | "requests" | "analytics" | "settings";
const TABS: { key: Tab; label: string; icon: typeof CalendarClock }[] = [
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "plans", label: "Plans", icon: CalendarClock },
  { key: "subscribers", label: "Subscribers", icon: Users },
  { key: "today", label: "Today's Deliveries", icon: ClipboardList },
  { key: "requests", label: "Cancel requests", icon: Inbox },
  { key: "settings", label: "Settings", icon: Settings },
];

export default function AdminSubscriptionsPage() {
  const canEdit = usePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE);
  const hasCustomization = useFeature("home-plans-customization");
  const [tab, setTab] = useState<Tab>("analytics");
  const [page, setPage] = useState(1);
  const [planSearch, setPlanSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const pendingRequests = usePendingCancellationCount().subscriptions;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-primary-600">
          <CalendarClock className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Subscription Plans
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/subscriptions/disruptions"
            className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Declared disruptions
          </Link>
          {tab === "plans" && (
            <>
              <SearchInput
                value={planSearch}
                onChange={(v) => {
                  setPlanSearch(v);
                  setPage(1);
                }}
                placeholder="Search plans…"
                className="w-48"
              />
              {canEdit && !creating && editingPlanId === null && (
                <button type="button" onClick={() => setCreating(true)} className="btn-primary btn-sm">
                  <Plus className="h-4 w-4" />
                  New Plan
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-zinc-200 px-1 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.key === "requests" && pendingRequests > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-[11px] leading-5 font-semibold text-white">
                {pendingRequests}
              </span>
            )}
          </button>
        ))}
      </div>

      {!canEdit && <ViewOnlyNotice />}
      {tab === "plans" && (
        <PlansTab
          planSearch={planSearch}
          page={page}
          onPageChange={(updater) => setPage(updater)}
          creating={creating}
          onCreatingChange={setCreating}
          editingPlanId={editingPlanId}
          onEditingPlanIdChange={setEditingPlanId}
          canEdit={canEdit}
        />
      )}
      {tab === "subscribers" && <SubscribersTab />}
      {tab === "today" && <TodaysDeliveriesTab />}
      {tab === "requests" && <CancellationRequestsList kind="SUBSCRIPTION" />}
      {tab === "analytics" && <SubscriptionAnalyticsTab />}
      {tab === "settings" && (
        <div className="flex flex-col gap-6">
          <SubscriptionSettingsTab canEdit={canEdit} />
          <PlanDisplaySettingsCard canEdit={canEdit} />
          <DeliveryDateSelectionCard canEdit={canEdit} />
          {hasCustomization && (
            <>
              <PlansPageSettingsCard canEdit={canEdit} />
              <PlanFeaturesManager canEdit={canEdit} />
              <PlanFaqManager canEdit={canEdit} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
