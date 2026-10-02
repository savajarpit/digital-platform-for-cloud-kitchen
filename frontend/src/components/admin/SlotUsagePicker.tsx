"use client";

import type { DeliverySlotUsage } from "@/lib/api/admin-settings";

const OPTIONS: { value: DeliverySlotUsage; label: string }[] = [
  { value: "BOTH", label: "Both" },
  { value: "ORDERS", label: "Orders" },
  { value: "SUBSCRIPTIONS", label: "Subscriptions" },
];

/** Short label for a slot row; null for BOTH (the unremarkable default). */
export function slotUsageLabel(usage: DeliverySlotUsage): string | null {
  if (usage === "ORDERS") return "Orders only";
  if (usage === "SUBSCRIPTIONS") return "Subscriptions only";
  return null;
}

/**
 * "Used for: Both / Orders / Subscriptions" — which flows offer a delivery
 * slot. Same segmented look as the closed dates' "Applies to". Only rendered
 * while the tenant has the subscriptions feature.
 */
export function SlotUsagePicker({
  value,
  onChange,
  disabled,
}: {
  value: DeliverySlotUsage;
  onChange: (usage: DeliverySlotUsage) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Used for
      </span>
      <div
        role="radiogroup"
        aria-label="Used for"
        className="inline-flex w-fit rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800"
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
              value === opt.value
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
