"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  INSTANT_SLOT,
  type KitchenFulfillmentType,
  type KitchenMeta,
} from "@/lib/api/kitchen";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { addDaysToDateStr } from "@/lib/format/date";
import { formatTime12h } from "@/lib/format/time";
import { KitchenChip } from "./KitchenChip";
import { hasActiveFilters, type KitchenFilterState } from "./useKitchenFilters";

const ALL = "ALL";

const TYPE_LABELS: Record<KitchenFulfillmentType, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
};

/** Order types this business actually offers — delivery always; pickup
 * and dine-in/takeaway only once switched on. */
function availableTypes(meta: KitchenMeta): KitchenFulfillmentType[] {
  return [
    "DELIVERY",
    ...(meta.flags.pickup ? (["PICKUP"] as const) : []),
    ...(meta.flags.dineIn ? (["DINE_IN", "TAKEAWAY"] as const) : []),
  ];
}

export function KitchenFilterBar({
  meta,
  state,
  onChange,
}: {
  meta: KitchenMeta;
  state: KitchenFilterState;
  onChange: (patch: Partial<KitchenFilterState>) => void;
}) {
  const [search, setSearch] = useState(state.q);
  const debounced = useDebouncedValue(search, 300);
  useEffect(() => {
    if (debounced !== state.q) onChange({ q: debounced });
    // Only the settled text should write to the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const tomorrow = addDaysToDateStr(meta.today, 1);
  const types = availableTypes(meta);
  const isPlans = state.tab === "plans";
  const isBoard = state.tab !== "prep";

  return (
    <div className="card flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <KitchenChip
            active={state.date === meta.today}
            onClick={() => onChange({ date: meta.today })}
          >
            Today
          </KitchenChip>
          <KitchenChip
            active={state.date === tomorrow}
            onClick={() => onChange({ date: tomorrow })}
          >
            Tomorrow
          </KitchenChip>
          <label className="relative flex items-center">
            <span className="sr-only">Pick a date</span>
            <CalendarDays className="pointer-events-none absolute left-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="date"
              value={state.date}
              min={meta.minDate}
              max={meta.maxDate}
              onChange={(e) =>
                e.target.value && onChange({ date: e.target.value })
              }
              className="input cursor-pointer py-1.5 pl-8 text-sm dark:[color-scheme:dark]"
            />
          </label>
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, phone, email, address, item, order no…"
          ariaLabel="Search orders"
          className="w-full lg:flex-1"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <KitchenChip
          active={!state.slot}
          onClick={() => onChange({ slot: "" })}
        >
          All times
        </KitchenChip>
        {meta.slots.map((slot) => (
          <KitchenChip
            key={slot.id}
            active={state.slot === slot.id}
            onClick={() => onChange({ slot: slot.id })}
          >
            {slot.name} · {formatTime12h(slot.startTime)}
          </KitchenChip>
        ))}
        {!isPlans && (
          <KitchenChip
            active={state.slot === INSTANT_SLOT}
            onClick={() => onChange({ slot: INSTANT_SLOT })}
          >
            ASAP orders
          </KitchenChip>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isPlans && types.length > 1 && (
          <Select
            value={state.type || ALL}
            onValueChange={(v) =>
              onChange({ type: v === ALL ? "" : (v as KitchenFulfillmentType) })
            }
          >
            <SelectTrigger
              className="w-auto min-w-36 py-1.5 text-sm"
              aria-label="Order type"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All order types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isPlans && meta.plans.length > 0 && (
          <Select
            value={state.planId || ALL}
            onValueChange={(v) => onChange({ planId: v === ALL ? "" : v })}
          >
            <SelectTrigger
              className="w-auto min-w-36 py-1.5 text-sm"
              aria-label="Plan"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All plans</SelectItem>
              {meta.plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <KitchenChip
          active={state.hasNotes}
          onClick={() => onChange({ hasNotes: !state.hasNotes })}
        >
          Has notes
        </KitchenChip>
        {meta.flags.addons && !isPlans && (
          <KitchenChip
            active={state.hasAddons}
            onClick={() => onChange({ hasAddons: !state.hasAddons })}
          >
            Has add-ons
          </KitchenChip>
        )}
        {isPlans && (
          <KitchenChip
            active={state.changedOnly}
            onClick={() => onChange({ changedOnly: !state.changedOnly })}
          >
            Changed by customer
          </KitchenChip>
        )}
        {isBoard && (
          <Select
            value={state.sort}
            onValueChange={(v) =>
              onChange({ sort: v as KitchenFilterState["sort"] })
            }
          >
            <SelectTrigger
              className="w-auto min-w-36 py-1.5 text-sm sm:ml-auto"
              aria-label="Sort"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Due time first</SelectItem>
              <SelectItem value="placed">Order time first</SelectItem>
            </SelectContent>
          </Select>
        )}
        {hasActiveFilters(state) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              onChange({
                slot: "",
                type: "",
                hasNotes: false,
                hasAddons: false,
                planId: "",
                changedOnly: false,
                q: "",
              });
            }}
            className="cursor-pointer text-xs font-medium text-primary-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
