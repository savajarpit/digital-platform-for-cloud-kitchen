"use client";

import { useEffect, useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { listCategories, type Category } from "@/lib/api/admin-menu";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { CategoriesCard } from "@/components/admin/CategoriesCard";
import { MealsCard } from "@/components/admin/MealsCard";

export default function MenuPage() {
  const canEdit = usePermission(PERMISSIONS.MENU_MANAGE);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setError("Couldn't load menu."));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <UtensilsCrossed className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">Menu</h2>
      </div>
      {!canEdit && <ViewOnlyNotice />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!categories ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : (
        <>
          <CategoriesCard categories={categories} canEdit={canEdit} onChange={setCategories} />
          <MealsCard categories={categories} canEdit={canEdit} />
        </>
      )}
    </div>
  );
}
