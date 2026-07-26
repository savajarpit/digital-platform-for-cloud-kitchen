"use client";

import { useEffect, useState } from "react";
import { Leaf, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import {
  ApiError,
  createCategory,
  createMeal,
  deleteCategory,
  deleteMeal,
  listCategories,
  listMeals,
  updateCategory,
  updateMeal,
  type Category,
  type Meal,
  type MealInput,
} from "@/lib/api/admin-menu";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { formatPriceFromPaise } from "@/lib/format/currency";

export default function MenuPage() {
  const canEdit = usePermission(PERMISSIONS.MENU_MANAGE);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listCategories(), listMeals()])
      .then(([c, m]) => {
        setCategories(c);
        setMeals(m);
      })
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

      {!categories || !meals ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : (
        <>
          <CategoriesCard categories={categories} canEdit={canEdit} onChange={setCategories} />
          <MealsCard
            meals={meals}
            categories={categories}
            canEdit={canEdit}
            onChange={setMeals}
          />
        </>
      )}
    </div>
  );
}

function CategoriesCard({
  categories,
  canEdit,
  onChange,
}: {
  categories: Category[];
  canEdit: boolean;
  onChange: (c: Category[]) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!name || !slug) return;
    setAdding(true);
    try {
      const created = await createCategory({ name, slug });
      onChange([...categories, created]);
      setName("");
      setSlug("");
      showToast("Category added", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't add category.", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(cat: Category) {
    try {
      const updated = await updateCategory(cat.id, { isActive: !cat.isActive });
      onChange(categories.map((c) => (c.id === cat.id ? updated : c)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update category.", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Meals in it will become uncategorized.")) return;
    try {
      await deleteCategory(id);
      onChange(categories.filter((c) => c.id !== id));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't delete category.", "error");
    }
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Categories</h3>
      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
          >
            <div>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {cat.name}
              </span>
              <span className="ml-2 font-mono text-xs text-zinc-400">{cat.slug}</span>
            </div>
            <div className="flex items-center gap-3">
              <Toggle checked={cat.isActive} onChange={() => handleToggleActive(cat)} disabled={!canEdit} />
              <button
                type="button"
                onClick={() => handleDelete(cat.id)}
                disabled={!canEdit}
                className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No categories yet.</p>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
              }}
              className="input w-40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="input w-40"
            />
          </div>
          <button type="button" onClick={handleAdd} disabled={adding || !name || !slug} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      )}
    </div>
  );
}

const emptyMealForm: MealInput = {
  name: "",
  description: "",
  priceInPaise: 0,
  categoryId: undefined,
  isVegetarian: true,
  isAvailable: true,
};

function MealsCard({
  meals,
  categories,
  canEdit,
  onChange,
}: {
  meals: Meal[];
  categories: Category[];
  canEdit: boolean;
  onChange: (m: Meal[]) => void;
}) {
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  async function handleToggleAvailable(meal: Meal) {
    try {
      const updated = await updateMeal(meal.id, { isAvailable: !meal.isAvailable });
      onChange(meals.map((m) => (m.id === meal.id ? updated : m)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update meal.", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this meal?")) return;
    try {
      await deleteMeal(id);
      onChange(meals.filter((m) => m.id !== id));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't delete meal.", "error");
    }
  }

  function categoryName(categoryId: string | null) {
    return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Meals</h3>
        {canEdit && editingId === null && (
          <button type="button" onClick={() => setEditingId("new")} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add Meal
          </button>
        )}
      </div>

      {editingId === "new" && (
        <MealForm
          categories={categories}
          initial={emptyMealForm}
          onCancel={() => setEditingId(null)}
          onSave={async (input) => {
            const created = await createMeal(input);
            onChange([...meals, created]);
            setEditingId(null);
          }}
        />
      )}

      <div className="flex flex-col gap-2">
        {meals.map((meal) =>
          editingId === meal.id ? (
            <MealForm
              key={meal.id}
              categories={categories}
              initial={{
                name: meal.name,
                description: meal.description ?? "",
                imageUrl: meal.imageUrl ?? "",
                priceInPaise: meal.priceInPaise,
                categoryId: meal.categoryId ?? undefined,
                isVegetarian: meal.isVegetarian,
                isAvailable: meal.isAvailable,
                dailyQuantityLimit: meal.dailyQuantityLimit ?? undefined,
              }}
              onCancel={() => setEditingId(null)}
              onSave={async (input) => {
                const updated = await updateMeal(meal.id, input);
                onChange(meals.map((m) => (m.id === meal.id ? updated : m)));
                setEditingId(null);
              }}
            />
          ) : (
            <div
              key={meal.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <div className="flex items-center gap-2">
                {meal.isVegetarian && <Leaf className="h-3.5 w-3.5 shrink-0 text-primary-600" />}
                <div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {meal.name}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {categoryName(meal.categoryId)} · {formatPriceFromPaise(meal.priceInPaise)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={meal.isAvailable} onChange={() => handleToggleAvailable(meal)} disabled={!canEdit} />
                <button
                  type="button"
                  onClick={() => setEditingId(meal.id)}
                  disabled={!canEdit}
                  className="text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Edit ${meal.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(meal.id)}
                  disabled={!canEdit}
                  className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete ${meal.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ),
        )}
        {meals.length === 0 && editingId !== "new" && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No meals yet.</p>
        )}
      </div>
    </div>
  );
}

function MealForm({
  categories,
  initial,
  onCancel,
  onSave,
}: {
  categories: Category[];
  initial: MealInput;
  onCancel: () => void;
  onSave: (input: MealInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [priceRupees, setPriceRupees] = useState(String(initial.priceInPaise / 100));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, priceInPaise: Math.round(Number(priceRupees) * 100) });
      showToast("Meal saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save meal.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/30 p-4 dark:border-primary-900 dark:bg-primary-950/20"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Meal name"
          required
          className="input w-full"
        />
        <select
          value={form.categoryId ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value || undefined }))}
          className="input w-full"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={form.description ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="Description"
        rows={2}
        className="input w-full"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={form.imageUrl ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          placeholder="Image URL"
          className="input w-full"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={priceRupees}
          onChange={(e) => setPriceRupees(e.target.value)}
          placeholder="Price (₹)"
          required
          className="input w-full"
        />
        <input
          type="number"
          min={0}
          value={form.dailyQuantityLimit ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              dailyQuantityLimit: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          placeholder="Daily limit (optional)"
          className="input w-full"
        />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <Toggle
            checked={form.isVegetarian ?? true}
            onChange={(v) => setForm((f) => ({ ...f, isVegetarian: v }))}
          />
          Vegetarian
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <Toggle
            checked={form.isAvailable ?? true}
            onChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))}
          />
          Available
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
