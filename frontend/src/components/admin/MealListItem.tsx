"use client";

import { Leaf, Pencil, Star, Trash2 } from "lucide-react";
import type { Category, Meal } from "@/lib/api/admin-menu";
import { Toggle } from "@/components/ui/Toggle";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { MealThumb } from "@/components/ui/MealThumb";

export function MealListItem({
  meal,
  categories,
  canEdit,
  onToggleAvailable,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  categories: Category[];
  canEdit: boolean;
  onToggleAvailable: () => Promise<unknown>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const categoryName = categories.find((c) => c.id === meal.categoryId)?.name ?? "Uncategorized";

  return (
    <div className="card flex gap-3 p-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        <MealThumb src={meal.imageUrl} alt={meal.name} iconClassName="h-5 w-5" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            {meal.isVegetarian && <Leaf className="h-3.5 w-3.5 shrink-0 text-primary-600" />}
            {meal.isPopular && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
            <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{meal.name}</p>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {categoryName} · {formatPriceFromPaise(meal.priceInPaise)}
            {meal.nutrition?.calories ? ` · ${meal.nutrition.calories} cal` : ""}
          </p>
          {meal.dailyQuantityLimit != null && meal.remainingToday != null && (
            <p
              className={`mt-0.5 text-xs font-medium ${
                meal.remainingToday === 0 ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {meal.remainingToday === 0
                ? `Sold out today (${meal.dailyQuantityLimit}/day)`
                : `Today: ${meal.remainingToday} of ${meal.dailyQuantityLimit} left`}
            </p>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Toggle checked={meal.isAvailable} onChange={onToggleAvailable} disabled={!canEdit} />
          <button
            type="button"
            onClick={onEdit}
            disabled={!canEdit}
            className="cursor-pointer text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Edit ${meal.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!canEdit}
            className="cursor-pointer text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Delete ${meal.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
