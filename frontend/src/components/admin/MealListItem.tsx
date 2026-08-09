"use client";

import { ImageOff, Leaf, Pencil, Star, Trash2 } from "lucide-react";
import type { Category, Meal } from "@/lib/api/admin-menu";
import { Toggle } from "@/components/ui/Toggle";
import { formatPriceFromPaise } from "@/lib/format/currency";

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
  onToggleAvailable: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const categoryName = categories.find((c) => c.id === meal.categoryId)?.name ?? "Uncategorized";

  return (
    <div className="card flex gap-3 p-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        {meal.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meal.imageUrl} alt={meal.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
            <ImageOff className="h-5 w-5" />
          </div>
        )}
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
