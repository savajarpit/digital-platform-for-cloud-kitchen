"use client";

import { useEffect, useState } from "react";
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
import type { PaginationMeta } from "@/lib/api/response";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { MealForm } from "@/components/admin/MealForm";
import { MealListItem } from "@/components/admin/MealListItem";

const emptyMealForm: MealInput = {
  name: "",
  description: "",
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
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [vegFilter, setVegFilter] = useState<VegFilter>("all");
  const [popularOnly, setPopularOnly] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      listMeals({
        page,
        search: search || undefined,
        isVegetarian: vegFilter === "all" ? undefined : vegFilter === "veg",
        isPopular: popularOnly ? true : undefined,
      })
        .then(({ data, meta }) => {
          setMeals(data);
          setMeta(meta ?? null);
        })
        .catch(() => setLoadError("Couldn't load meals."));
    }, 250);
    return () => clearTimeout(handle);
  }, [page, search, vegFilter, popularOnly, reloadToken]);

  function refetch() {
    setReloadToken((t) => t + 1);
  }

  async function handleToggleAvailable(meal: Meal) {
    try {
      await updateMeal(meal.id, { isAvailable: !meal.isAvailable });
      refetch();
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
        <select
          value={vegFilter}
          onChange={(e) => {
            setVegFilter(e.target.value as VegFilter);
            setPage(1);
          }}
          className="input w-auto"
        >
          <option value="all">All</option>
          <option value="veg">Vegetarian</option>
          <option value="nonveg">Non-vegetarian</option>
        </select>
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
          onSave={async (input) => {
            await createMeal(input);
            setEditingId(null);
            setPage(1);
            refetch();
          }}
        />
      )}

      {!meals ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meals.map((meal) =>
            editingId === meal.id ? (
              <div key={meal.id} className="col-span-full">
                <MealForm
                  categories={categories}
                  initial={{
                    name: meal.name,
                    description: meal.description ?? "",
                    imageUrl: meal.imageUrl ?? "",
                    priceInPaise: meal.priceInPaise,
                    categoryId: meal.categoryId ?? undefined,
                    nutrition: meal.nutrition ?? undefined,
                    isVegetarian: meal.isVegetarian,
                    isAvailable: meal.isAvailable,
                    isPopular: meal.isPopular,
                    dailyQuantityLimit: meal.dailyQuantityLimit ?? undefined,
                  }}
                  onCancel={() => setEditingId(null)}
                  onSave={async (input) => {
                    await updateMeal(meal.id, input);
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
            <p className="col-span-full text-sm text-zinc-500 dark:text-zinc-400">No meals match.</p>
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
