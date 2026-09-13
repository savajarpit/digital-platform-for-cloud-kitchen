"use client";

import { useEffect, useState } from "react";
import { ApiError, type Category, type MealInput } from "@/lib/api/admin-menu";
import { listAddonGroups, type AddonGroup } from "@/lib/api/addons";
import { useFeatures } from "@/context/FeaturesContext";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { ImageUploadInput } from "@/components/admin/ImageUploadInput";
import { MultiImageUploadInput } from "@/components/admin/MultiImageUploadInput";

export function MealForm({
  categories,
  initial,
  initialAddonGroupIds,
  onCancel,
  onSave,
}: {
  categories: Category[];
  initial: MealInput;
  /** Which add-on groups this meal already offers — omit for a new meal. */
  initialAddonGroupIds?: string[];
  onCancel: () => void;
  onSave: (input: MealInput, addonGroupIds?: string[]) => Promise<void>;
}) {
  const { showToast } = useToast();
  const { has: hasFeature } = useFeatures();
  const hasAddonsFeature = hasFeature("menu-addons");
  const [form, setForm] = useState(initial);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[] | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    initialAddonGroupIds ?? [],
  );
  const [priceRupees, setPriceRupees] = useState(String(initial.priceInPaise / 100));
  const [calories, setCalories] = useState(
    initial.nutrition?.calories !== undefined ? String(initial.nutrition.calories) : "",
  );
  const [protein, setProtein] = useState(initial.nutrition?.protein ?? "");
  const [carbs, setCarbs] = useState(initial.nutrition?.carbs ?? "");
  const [fat, setFat] = useState(initial.nutrition?.fat ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasAddonsFeature) return;
    listAddonGroups()
      .then(setAddonGroups)
      .catch(() => setAddonGroups([]));
  }, [hasAddonsFeature]);

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(
        {
          ...form,
          priceInPaise: Math.round(Number(priceRupees) * 100),
          // Always an explicit object (never `undefined`) — `JSON.stringify`
          // drops `undefined` keys entirely, so an update payload that omits
          // `nutrition` reads as "don't touch it," not "clear it." Sending an
          // empty object here is what actually clears previously-saved values.
          nutrition: {
            ...(calories && { calories: Number(calories) }),
            ...(protein && { protein }),
            ...(carbs && { carbs }),
            ...(fat && { fat }),
          },
        },
        hasAddonsFeature ? selectedGroupIds : undefined,
      );
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
          onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v || null }))}
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
        label="Thumbnail (used on the menu card and cart)"
        value={form.imageUrl || undefined}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url ?? "" }))}
      />
      <MultiImageUploadInput
        label="Gallery (shown on the meal's own detail page)"
        value={form.imageUrls ?? []}
        onChange={(urls) => setForm((f) => ({ ...f, imageUrls: urls }))}
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
          Weight (optional — only shown on the menu card if filled in)
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.weightValue ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                weightValue: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            placeholder="e.g. 250"
            className="input w-full"
          />
          <Select
            value={form.weightUnit ?? "G"}
            onValueChange={(v) => setForm((f) => ({ ...f, weightUnit: v as "G" | "KG" }))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="G">g</SelectItem>
              <SelectItem value="KG">kg</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
      {hasAddonsFeature && addonGroups && addonGroups.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Add-ons this meal offers (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {addonGroups.map((group) => {
              const checked = selectedGroupIds.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    checked
                      ? "border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {group.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
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
