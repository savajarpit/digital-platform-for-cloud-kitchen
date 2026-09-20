"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed } from "lucide-react";
import { listCategories, type Category } from "@/lib/api/admin-menu";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateMenuAreas } from "@/lib/query/admin-invalidation";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { MenuPageSkeleton } from "@/components/admin/MenuPageSkeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { CategoriesCard } from "@/components/admin/CategoriesCard";
import { MealsCard } from "@/components/admin/MealsCard";

export default function MenuPage() {
  const canEdit = usePermission(PERMISSIONS.MENU_MANAGE);
  const queryClient = useQueryClient();
  const categoriesKey = qk.admin("menu", "categories");
  const { data: categories, isError } = useQuery({
    queryKey: categoriesKey,
    queryFn: listCategories,
    staleTime: STALE.short,
  });

  // Called by CategoriesCard only after a successful write: show the new
  // list immediately, then refetch every menu-dependent view.
  function handleCategoriesChange(next: Category[]) {
    queryClient.setQueryData(categoriesKey, next);
    void invalidateMenuAreas(queryClient);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <UtensilsCrossed className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">Menu</h2>
      </div>
      {!canEdit && <ViewOnlyNotice />}
      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          Couldn&apos;t load menu.
        </p>
      )}

      {!categories ? (
        isError ? null : <MenuPageSkeleton />
      ) : (
        <>
          <CategoriesCard categories={categories} canEdit={canEdit} onChange={handleCategoriesChange} />
          <MealsCard categories={categories} canEdit={canEdit} />
        </>
      )}
    </div>
  );
}
