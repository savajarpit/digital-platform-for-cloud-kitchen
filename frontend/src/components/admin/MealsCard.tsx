"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Search, Star } from "lucide-react";
import {
  ApiError,
  createMeal,
  deleteMeal,
  listMeals,
  updateMeal,
  type Category,
  type Meal,
  type MealInput,
} from "@/lib/api/admin-menu";
import { setMealAddonGroups } from "@/lib/api/addons";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateMenuAreas } from "@/lib/query/admin-invalidation";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { MealListSkeleton } from "@/components/admin/MealListSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { MealForm } from "@/components/admin/MealForm";
import { MealListItem } from "@/components/admin/MealListItem";

const emptyMealForm: MealInput = {
  name: "",
  description: "",
  imageUrls: [],
  priceInPaise: 0,
  categoryId: undefined,
  isVegetarian: true,
  isAvailable: true,
  isPopular: false,
};

type VegFilter = "all" | "veg" | "nonveg";

export function MealsCard({ categories, canEdit }: { categories: Category[]; canEdit: boolean }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vegFilter, setVegFilter] = useState<VegFilter>("all");
  const [popularOnly, setPopularOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handle);
  }, [search]);

  // Every filter is in the key; paging/filtering keeps the previous grid on
  // screen (no skeleton) until the next result arrives.
  const {
    data: mealsPage,
    isPending,
    isError,
    isPlaceholderData,
  } = useQuery({
    queryKey: qk.admin("menu", "meals", page, debouncedSearch, vegFilter, popularOnly),
    queryFn: () =>
      listMeals({
        page,
        search: debouncedSearch || undefined,
        isVegetarian: vegFilter === "all" ? undefined : vegFilter === "veg",
        isPopular: popularOnly ? true : undefined,
      }),
    staleTime: STALE.short,
    placeholderData: keepPreviousData,
  });
  const meals = mealsPage?.data ?? null;
  const meta = mealsPage?.meta ?? null;
  const loadError = isError ? "Couldn't load meals." : null;

  function refetch() {
    void invalidateMenuAreas(queryClient);
  }

  async function handleToggleAvailable(meal: Meal) {
    try {
      await updateMeal(meal.id, { isAvailable: !meal.isAvailable });
      refetch();
      showToast(`Meal marked ${!meal.isAvailable ? "available" : "unavailable"}`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update meal.", "error");
    }
  }

  function handleDelete(id: string, name: string) {
    confirm({
      message: `Delete "${name}"?`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteMeal(id);
          refetch();
          showToast("Meal deleted", "success");
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete meal.", "error");
        }
      },
    });
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Meals</h3>
        {canEdit && editingId === null && (
          <button type="button" onClick={() => setEditingId("new")} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add Meal
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search meals…"
            className="input w-full pl-8"
          />
        </div>
        <Select
          value={vegFilter}
          onValueChange={(v) => {
            setVegFilter(v as VegFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="veg">Vegetarian</SelectItem>
            <SelectItem value="nonveg">Non-vegetarian</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => {
            setPopularOnly((v) => !v);
            setPage(1);
          }}
          className={`badge cursor-pointer ${
            popularOnly
              ? "bg-primary-600 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          <Star className="h-3 w-3" />
          Popular only
        </button>
      </div>

      {loadError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {loadError}
        </p>
      )}

      {editingId === "new" && (
        <MealForm
          categories={categories}
          initial={emptyMealForm}
          onCancel={() => setEditingId(null)}
          onSave={async (input, addonGroupIds) => {
            const meal = await createMeal(input);
            if (addonGroupIds) await setMealAddonGroups(meal.id, addonGroupIds);
            setEditingId(null);
            setPage(1);
            refetch();
          }}
        />
      )}

      {isPending ? (
        <MealListSkeleton />
      ) : !meals ? null : (
        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? "opacity-60" : ""}`}
        >
          {meals.map((meal) =>
            editingId === meal.id ? (
              <div key={meal.id} className="col-span-full">
                <MealForm
                  categories={categories}
                  initial={{
                    name: meal.name,
                    description: meal.description ?? "",
                    imageUrl: meal.imageUrl ?? "",
                    imageUrls: meal.imageUrls,
                    priceInPaise: meal.priceInPaise,
                    categoryId: meal.categoryId,
                    nutrition: meal.nutrition ?? undefined,
                    isVegetarian: meal.isVegetarian,
                    isAvailable: meal.isAvailable,
                    isPopular: meal.isPopular,
                    weightValue: meal.weightValue ?? undefined,
                    weightUnit: meal.weightUnit ?? undefined,
                    dailyQuantityLimit: meal.dailyQuantityLimit ?? undefined,
                  }}
                  initialAddonGroupIds={meal.addonGroupIds}
                  onCancel={() => setEditingId(null)}
                  onSave={async (input, addonGroupIds) => {
                    await updateMeal(meal.id, input);
                    if (addonGroupIds) await setMealAddonGroups(meal.id, addonGroupIds);
                    setEditingId(null);
                    refetch();
                  }}
                />
              </div>
            ) : (
              <MealListItem
                key={meal.id}
                meal={meal}
                categories={categories}
                canEdit={canEdit}
                onToggleAvailable={() => handleToggleAvailable(meal)}
                onEdit={() => setEditingId(meal.id)}
                onDelete={() => handleDelete(meal.id, meal.name)}
              />
            ),
          )}
          {meals.length === 0 && editingId !== "new" && (
            <div className="col-span-full">
              <EmptyState compact title="No meals match." />
            </div>
          )}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Page {meta.page} of {meta.totalPages} · {meta.total} meals
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={!meta.hasPrev}
              className="btn-ghost btn-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNext}
              className="btn-ghost btn-sm"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
