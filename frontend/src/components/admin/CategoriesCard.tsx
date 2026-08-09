"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createCategory,
  deleteCategory,
  updateCategory,
  type Category,
} from "@/lib/api/admin-menu";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";

export function CategoriesCard({
  categories,
  canEdit,
  onChange,
}: {
  categories: Category[];
  canEdit: boolean;
  onChange: (c: Category[]) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
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

  function handleDelete(id: string) {
    confirm({
      message: "Delete this category? Meals in it will become uncategorized.",
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteCategory(id);
          onChange(categories.filter((c) => c.id !== id));
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete category.", "error");
        }
      },
    });
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
