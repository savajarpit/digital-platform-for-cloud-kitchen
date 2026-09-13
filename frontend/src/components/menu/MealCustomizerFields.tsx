"use client";

import { Minus, Plus } from "lucide-react";
import type { AddonGroup } from "@/lib/api/addons";
import type { AddonSelectionState } from "@/lib/hooks/useMealCustomization";
import { formatPriceFromPaise } from "@/lib/format/currency";

/**
 * Pure rendering of the group/item picker — no modal chrome, no footer.
 * Used both inline on the meal detail page and inside CustomizeMealSheet's
 * popup, so the two surfaces can never drift on how a group/item behaves.
 */
export function MealCustomizerFields({
  groups,
  getSelection,
  distinctCount,
  setItemQuantity,
}: {
  groups: AddonGroup[];
  getSelection: (addonItemId: string) => AddonSelectionState | undefined;
  distinctCount: (groupId: string) => number;
  setItemQuantity: (
    groupId: string,
    item: { id: string; name: string; priceInPaise: number },
    nextQuantity: number,
  ) => void;
}) {
  const activeGroups = groups.filter((g) => g.isActive && g.items.some((i) => i.isAvailable));
  if (activeGroups.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {activeGroups.map((group) => (
        <div key={group.id}>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{group.name}</h4>
            <span className="text-xs text-zinc-400">
              {group.minSelections > 0
                ? `Pick ${group.minSelections}–${group.maxSelections}`
                : `Pick up to ${group.maxSelections}`}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {group.items
              .filter((item) => item.isAvailable)
              .map((item) => {
                const current = getSelection(item.id);
                const isStepper = item.maxQuantityPerOrder > 1;
                const groupFull = !current && distinctCount(group.id) >= group.maxSelections;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                  >
                    <div>
                      <p className="text-sm text-zinc-800 dark:text-zinc-200">{item.name}</p>
                      <p className="text-xs text-zinc-400">+{formatPriceFromPaise(item.priceInPaise)}</p>
                    </div>
                    {isStepper ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setItemQuantity(group.id, item, (current?.quantity ?? 0) - 1)}
                          disabled={!current}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {current?.quantity ?? 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => setItemQuantity(group.id, item, (current?.quantity ?? 0) + 1)}
                          disabled={(current?.quantity ?? 0) >= item.maxQuantityPerOrder || groupFull}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setItemQuantity(group.id, item, current ? 0 : 1)}
                        disabled={groupFull}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          current
                            ? "border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                            : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {current ? "Selected" : "Select"}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
