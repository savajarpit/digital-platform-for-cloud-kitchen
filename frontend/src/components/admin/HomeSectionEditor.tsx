"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import {
  ApiError,
  setHomeSectionItems,
  updateHomeSection,
  type HomeSection,
} from "@/lib/api/admin-home-sections";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { MealPickerGrid } from "@/components/admin/MealPickerGrid";
import { formatPriceFromPaise } from "@/lib/format/currency";

interface PickedMeal {
  id: string;
  name: string;
  imageUrl: string | null;
  priceInPaise: number;
}

export function HomeSectionEditor({
  section,
  onClose,
  onSaved,
}: {
  section: HomeSection;
  onClose: () => void;
  onSaved: (section: HomeSection) => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? "");
  const [isEnabled, setIsEnabled] = useState(section.isEnabled);
  const [selected, setSelected] = useState<PickedMeal[]>(
    section.items.map((item) => ({
      id: item.meal.id,
      name: item.meal.name,
      imageUrl: item.meal.imageUrl,
      priceInPaise: item.meal.priceInPaise,
    })),
  );
  const [saving, setSaving] = useState(false);

  function handleToggle(meal: PickedMeal, checked: boolean) {
    setSelected((prev) =>
      checked
        ? prev.some((m) => m.id === meal.id)
          ? prev
          : [...prev, meal]
        : prev.filter((m) => m.id !== meal.id),
    );
  }

  function move(index: number, direction: -1 | 1) {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    if (!title.trim()) {
      showToast("Give the section a name first.", "error");
      return;
    }
    setSaving(true);
    try {
      await updateHomeSection(section.id, {
        title,
        description: description.trim() || undefined,
        isEnabled,
      });
      const updated = await setHomeSectionItems(
        section.id,
        selected.map((m) => m.id),
      );
      onSaved(updated);
      showToast("Section saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save section.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Section name, e.g. Today's Special"
          className="input flex-1"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <Toggle checked={isEnabled} onChange={setIsEnabled} />
          Enabled
        </label>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description shown under the title on the home page (optional)"
        rows={2}
        maxLength={200}
        className="input w-full"
      />

      {selected.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Selected products (same product can appear in more than one section)
          </p>
          {selected.map((meal, i) => (
            <div
              key={meal.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-1.5 text-sm dark:border-zinc-800"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                {meal.name}
                <span className="ml-2 text-xs text-zinc-400">{formatPriceFromPaise(meal.priceInPaise)}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-zinc-400 hover:text-primary-600 disabled:opacity-30"
                  aria-label={`Move ${meal.name} up`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === selected.length - 1}
                  className="text-zinc-400 hover:text-primary-600 disabled:opacity-30"
                  aria-label={`Move ${meal.name} down`}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelected((prev) => prev.filter((m) => m.id !== meal.id))}
                  className="text-zinc-400 hover:text-red-600"
                  aria-label={`Remove ${meal.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Add products</p>
        <MealPickerGrid selectedIds={selected.map((m) => m.id)} onToggle={handleToggle} />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
          {saving ? "Saving…" : "Save section"}
        </button>
        <button type="button" onClick={onClose} className="btn-ghost btn-sm">
          Close
        </button>
      </div>
    </div>
  );
}
