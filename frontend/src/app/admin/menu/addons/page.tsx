"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { listAddonGroups, type AddonGroup } from "@/lib/api/addons";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateMenuAreas } from "@/lib/query/admin-invalidation";
import { usePermission } from "@/context/PermissionsContext";
import { useFeatures } from "@/context/FeaturesContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { AddonGroupsCard } from "@/components/admin/AddonGroupsCard";
import { AddonGroupsSkeleton } from "@/components/admin/AddonGroupsSkeleton";
import { useToast } from "@/context/ToastContext";

export default function AdminAddonsPage() {
  const canEdit = usePermission(PERMISSIONS.MENU_MANAGE);
  const { has: hasFeature, loading: featuresLoading } = useFeatures();
  const hasAddonsFeature = hasFeature("menu-addons");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const groupsKey = qk.admin("menu", "addon-groups");
  const { data, isError } = useQuery({
    queryKey: groupsKey,
    queryFn: listAddonGroups,
    enabled: !featuresLoading && hasAddonsFeature,
    staleTime: STALE.short,
  });
  const groups = data ?? (isError ? [] : null);

  useEffect(() => {
    if (isError) showToast("Couldn't load add-on groups. Try reloading the page.", "error");
  }, [isError, showToast]);

  // Called by AddonGroupsCard only after a successful write: show the new
  // list immediately, then refetch every menu-dependent view (meal forms).
  function handleGroupsChange(next: AddonGroup[]) {
    queryClient.setQueryData(groupsKey, next);
    void invalidateMenuAreas(queryClient);
  }

  // Belt-and-braces alongside the sidebar hiding this link when the
  // feature is off — a direct URL gets a plain "not enabled" message
  // instead of a page that silently 403s on every fetch.
  if (!featuresLoading && !hasAddonsFeature) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-primary-600">
          <Layers className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Add-ons
          </h2>
        </div>
        <div className="card p-6 text-sm text-zinc-600 dark:text-zinc-400">
          Menu Add-ons isn&apos;t enabled for your account. Contact your platform admin if
          you&apos;d like this turned on.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <Layers className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Add-ons
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Build reusable add-on groups here, then attach them to specific meals from the meal
        editor in Menu.
      </p>

      {!canEdit && <ViewOnlyNotice />}

      {!groups ? (
        <AddonGroupsSkeleton />
      ) : (
        <AddonGroupsCard groups={groups} canEdit={canEdit} onChange={handleGroupsChange} />
      )}
    </div>
  );
}
