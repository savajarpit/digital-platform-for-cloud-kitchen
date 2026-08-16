"use client";

import { useState } from "react";
import { ApiError, type Category, type MealInput } from "@/lib/api/admin-menu";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { ImageUploadInput } from "@/components/admin/ImageUploadInput";

export function MealForm({
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
  const [calories, setCalories] = useState(
    initial.nutrition?.calories !== undefined ? String(initial.nutrition.calories) : "",
  );
  const [protein, setProtein] = useState(initial.nutrition?.protein ?? "");
  const [carbs, setCarbs] = useState(initial.nutrition?.carbs ?? "");
  const [fat, setFat] = useState(initial.nutrition?.fat ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const hasNutrition = calories || protein || carbs || fat;
      await onSave({
        ...form,
        priceInPaise: Math.round(Number(priceRupees) * 100),
        nutrition: hasNutrition
          ? {
              ...(calories && { calories: Number(calories) }),
              ...(protein && { protein }),
              ...(carbs && { carbs }),
              ...(fat && { fat }),
            }
          : undefined,
      });
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
        <Select
          value={form.categoryId ?? ""}
          onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v || undefined }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Uncategorized</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <textarea
        value={form.description ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="Description"
        rows={2}
        className="input w-full"
      />
      <ImageUploadInput
        label="Photo"
        value={form.imageUrl || undefined}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url ?? "" }))}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Nutrition (optional — only shown on the meal card if filled in)
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            type="number"
            min={0}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="Calories"
            className="input w-full"
          />
          <input
            type="text"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="Protein (e.g. 18g)"
            className="input w-full"
          />
          <input
            type="text"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="Carbs (e.g. 45g)"
            className="input w-full"
          />
          <input
            type="text"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="Fat (e.g. 16g)"
            className="input w-full"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
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
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <Toggle
            checked={form.isPopular ?? false}
            onChange={(v) => setForm((f) => ({ ...f, isPopular: v }))}
          />
          Popular
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
