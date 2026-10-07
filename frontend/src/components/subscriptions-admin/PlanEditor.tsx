"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  getPlanAdmin,
  getPlanCyclePreview,
  replacePlanDays,
  updatePlan,
  type MealSlotType,
  type Plan,
  type PlanDayInput,
  type PlanInput,
} from "@/lib/api/admin-subscriptions";
import type { Meal } from "@/lib/api/admin-menu";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateSubscriptionAreas } from "@/lib/query/subscription-invalidation";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { MealCombobox } from "@/components/admin/MealCombobox";
import { PlanMetaForm } from "@/components/subscriptions-admin/PlanMetaForm";
import { formatDate } from "@/lib/format/date";

const SLOT_TYPES: MealSlotType[] = ["BREAKFAST", "LUNCH", "DINNER"];
const SLOT_LABELS: Record<MealSlotType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

type SlotState = { included: boolean; mealId: string };
type DayState = Record<MealSlotType, SlotState>;
// A week's 7 days, keyed by weekday (0=Sun..6=Sat, matching the backend).
type WeekState = Record<number, DayState>;

function emptyDayState(): DayState {
  return {
    BREAKFAST: { included: false, mealId: "" },
    LUNCH: { included: false, mealId: "" },
    DINNER: { included: false, mealId: "" },
  };
}

// Display order (Mon-first) — the storage key stays 0=Sun..6=Sat.
const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

function emptyWeekState(): WeekState {
  return {
    0: emptyDayState(),
    1: emptyDayState(),
    2: emptyDayState(),
    3: emptyDayState(),
    4: emptyDayState(),
    5: emptyDayState(),
    6: emptyDayState(),
  };
}

function buildDays(p: Plan): DayState[] {
  const initial: DayState[] = Array.from({ length: p.durationDays }, () => emptyDayState());
  for (const day of p.days ?? []) {
    if (day.dayNumber == null || day.dayNumber < 1 || day.dayNumber > p.durationDays) continue;
    const dayState = initial[day.dayNumber - 1];
    for (const slot of day.slots) {
      dayState[slot.slotType] = { included: true, mealId: slot.mealId ?? "" };
    }
  }
  return initial;
}

function buildWeeks(p: Plan): WeekState[] {
  const weekCount = p.weekCount ?? 1;
  const initialWeeks: WeekState[] = Array.from({ length: weekCount }, () => emptyWeekState());
  for (const day of p.days ?? []) {
    if (day.weekNumber == null || day.weekday == null) continue;
    if (day.weekNumber < 1 || day.weekNumber > weekCount) continue;
    const weekState = initialWeeks[day.weekNumber - 1][day.weekday];
    for (const slot of day.slots) {
      weekState[slot.slotType] = { included: true, mealId: slot.mealId ?? "" };
    }
  }
  return initialWeeks;
}

/** Inline editor for one plan: its details form plus the day-by-day meal
 * grid. The plan is cached per id (shared with the plan detail page); the
 * grid shows what is saved until the admin edits it, and from then on the
 * edits are a draft that a background refetch never overwrites. */
export function PlanEditor({
  planId,
  meals,
  canEdit,
  onClose,
}: {
  planId: string;
  meals: Meal[] | undefined;
  canEdit: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const planKey = qk.admin("subscriptions", "plan", planId);
  const { data: plan, isError } = useQuery({
    queryKey: planKey,
    queryFn: () => getPlanAdmin(planId),
    staleTime: STALE.short,
  });

  // Reflects the last-SAVED meal plan, not unsaved grid edits — refetched
  // after every save (via the subscription-areas invalidation). Silent on
  // failure: a convenience preview, not core functionality worth a toast.
  const { data: cyclePreview } = useQuery({
    queryKey: qk.admin("subscriptions", "plan-cycle-preview", planId),
    queryFn: () => getPlanCyclePreview(planId),
    enabled: plan?.schedulingMode === "WEEKLY_FIXED",
    staleTime: STALE.short,
  });

  const baseDays = useMemo(
    () => (plan && plan.schedulingMode !== "WEEKLY_FIXED" ? buildDays(plan) : null),
    [plan],
  );
  const baseWeeks = useMemo(
    () => (plan && plan.schedulingMode === "WEEKLY_FIXED" ? buildWeeks(plan) : null),
    [plan],
  );
  const [daysDraft, setDaysDraft] = useState<DayState[] | null>(null);
  const [weeksDraft, setWeeksDraft] = useState<WeekState[] | null>(null);
  const days = daysDraft ?? baseDays;
  const weeks = weeksDraft ?? baseWeeks;
  const [activeWeek, setActiveWeek] = useState(0);
  const [savingDays, setSavingDays] = useState(false);

  async function handleSaveMeta(input: PlanInput) {
    const updated = await updatePlan(planId, input);
    // A mode toggled mid-session (only possible before this plan has any
    // subscribers — the backend rejects it otherwise) needs its authoring
    // state rebuilt to match; otherwise the editor would keep showing the
    // old shape until the page is reloaded.
    if (plan && plan.schedulingMode !== updated.schedulingMode) {
      if (updated.schedulingMode === "WEEKLY_FIXED") {
        setWeeksDraft(Array.from({ length: updated.weekCount ?? 1 }, () => emptyWeekState()));
        setDaysDraft(null);
        setActiveWeek(0);
      } else {
        setDaysDraft(Array.from({ length: updated.durationDays }, () => emptyDayState()));
        setWeeksDraft(null);
      }
    }
    queryClient.setQueryData<Plan>(planKey, (old) => ({
      ...(old ?? updated),
      ...updated,
      days: updated.days ?? old?.days,
    }));
    void invalidateSubscriptionAreas(queryClient);
    showToast("Plan details saved", "success");
  }

  async function handleSaveDays() {
    if (!plan) return;
    setSavingDays(true);
    try {
      let payload: PlanDayInput[];
      if (plan.schedulingMode === "WEEKLY_FIXED") {
        if (!weeks) return;
        payload = weeks.flatMap((week, wi) =>
          WEEKDAY_DISPLAY_ORDER.map((weekday) => ({
            weekNumber: wi + 1,
            weekday,
            slots: SLOT_TYPES.filter((slotType) => week[weekday][slotType].included).map((slotType) => ({
              slotType,
              mealId: week[weekday][slotType].mealId || undefined,
            })),
          })),
        );
      } else {
        if (!days) return;
        payload = days.map((day, i) => ({
          dayNumber: i + 1,
          slots: SLOT_TYPES.filter((slotType) => day[slotType].included).map((slotType) => ({
            slotType,
            mealId: day[slotType].mealId || undefined,
          })),
        }));
      }
      await replacePlanDays(planId, payload);
      void invalidateSubscriptionAreas(queryClient);
      showToast("Meal plan saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save meal plan.", "error");
    } finally {
      setSavingDays(false);
    }
  }

  function updateSlot(dayIndex: number, slotType: MealSlotType, patch: Partial<SlotState>) {
    setDaysDraft((prev) => {
      const current = prev ?? baseDays;
      if (!current) return prev;
      const next = [...current];
      next[dayIndex] = { ...next[dayIndex], [slotType]: { ...next[dayIndex][slotType], ...patch } };
      return next;
    });
  }

  function updateWeekSlot(
    weekIndex: number,
    weekday: number,
    slotType: MealSlotType,
    patch: Partial<SlotState>,
  ) {
    setWeeksDraft((prev) => {
      const current = prev ?? baseWeeks;
      if (!current) return prev;
      const next = current.map((w) => ({ ...w }));
      next[weekIndex] = {
        ...next[weekIndex],
        [weekday]: {
          ...next[weekIndex][weekday],
          [slotType]: { ...next[weekIndex][weekday][slotType], ...patch },
        },
      };
      return next;
    });
  }

  // "Off day" isn't a separate field — a weekday with zero decided slots is
  // already treated as off by materialization (see PlanScheduleUtil), so
  // this is purely a convenience: one click to clear every slot for the day
  // instead of unchecking each one, plus a badge making the already-off
  // state visible instead of only discoverable by an empty row.
  function markWeekdayOff(weekIndex: number, weekday: number) {
    for (const slotType of SLOT_TYPES) {
      updateWeekSlot(weekIndex, weekday, slotType, { included: false });
    }
  }

  if (!plan || !meals || (!days && !weeks)) {
    if (isError) {
      return (
        <div className="card flex flex-col gap-3 p-5">
          <EmptyState compact title="Couldn't load this plan." />
          <button type="button" onClick={onClose} className="btn-ghost btn-sm self-center">
            Close
          </button>
        </div>
      );
    }
    return (
      <div className="card flex flex-col gap-5 p-5" aria-busy="true">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-16 rounded-xl" />
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
          {[0, 1].map((row) => (
            <div key={row} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[0, 1].map((col) => (
                <div key={col} className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-[42px] w-full rounded-xl" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-100 p-3 sm:grid-cols-[3rem_repeat(3,1fr)] sm:items-center dark:border-zinc-800"
              >
                <Skeleton className="h-5 w-10" />
                {SLOT_TYPES.map((slotType) => (
                  <Skeleton key={slotType} className="h-[42px] w-full rounded-xl" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Editing: {plan.name}
        </h3>
        <button type="button" onClick={onClose} className="btn-ghost btn-sm">
          Close
        </button>
      </div>

      <PlanMetaForm
        initial={{
          name: plan.name,
          description: plan.description ?? undefined,
          durationDays: plan.durationDays,
          priceInPaise: plan.priceInPaise,
          features: plan.features,
          badgeText: plan.badgeText ?? undefined,
          isPopular: plan.isPopular,
          accentColor: plan.accentColor,
          schedulingMode: plan.schedulingMode,
          weekCount: plan.weekCount ?? undefined,
          scheduleAnchorDate: plan.scheduleAnchorDate ?? undefined,
          offDayHandling: plan.offDayHandling,
        }}
        onCancel={onClose}
        onSave={handleSaveMeta}
      />

      {plan.schedulingMode === "WEEKLY_FIXED" && cyclePreview && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          A subscriber joining now would run{" "}
          <strong className="text-zinc-900 dark:text-zinc-100">
            {formatDate(cyclePreview.startDate)} –{" "}
            {formatDate(cyclePreview.cycleEnd)}
          </strong>{" "}
          — {cyclePreview.durationDays} paid delivery day{cyclePreview.durationDays === 1 ? "" : "s"}
          {cyclePreview.calendarSpanDays !== cyclePreview.durationDays &&
            ` across ${cyclePreview.calendarSpanDays} calendar days (off days extend the plan, not counted against it)`}
          . Based on the currently-saved meal plan below and today&apos;s date — reflects the last
          save, not unsaved edits.
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Meal plan</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {plan.schedulingMode === "WEEKLY_FIXED"
              ? "Tick a meal slot to give it a real weekday; leave the meal as “Meal to be announced” if it's not decided yet."
              : "Tick a meal slot to give it a day; leave the meal as “Meal to be announced” if it's not decided yet — customers will see that instead of a blank slot."}
          </p>
        </div>

        {plan.schedulingMode === "WEEKLY_FIXED" && weeks ? (
          <div className="flex flex-col gap-3">
            {weeks.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {weeks.map((_, wi) => (
                  <button
                    key={wi}
                    type="button"
                    onClick={() => setActiveWeek(wi)}
                    className={`badge cursor-pointer border transition-colors ${
                      activeWeek === wi
                        ? "border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                        : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    Week {wi + 1}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
                const isOffDay = SLOT_TYPES.every(
                  (slotType) => !weeks[activeWeek][weekday][slotType].included,
                );
                return (
                <div
                  key={weekday}
                  className={`grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[3rem_repeat(3,1fr)] sm:items-center ${
                    isOffDay
                      ? "border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20"
                      : "border-zinc-100 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {WEEKDAY_LABELS[weekday]}
                    </span>
                    {isOffDay ? (
                      <span className="badge w-fit bg-amber-50 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        Off day
                      </span>
                    ) : (
                      canEdit && (
                        <button
                          type="button"
                          onClick={() => markWeekdayOff(activeWeek, weekday)}
                          className="w-fit text-[10px] font-medium text-zinc-400 hover:text-amber-600 hover:underline dark:hover:text-amber-400"
                        >
                          Mark off
                        </button>
                      )
                    )}
                  </div>
                  {SLOT_TYPES.map((slotType) => (
                    <div key={slotType} className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={weeks[activeWeek][weekday][slotType].included}
                        onChange={(e) =>
                          updateWeekSlot(activeWeek, weekday, slotType, { included: e.target.checked })
                        }
                        disabled={!canEdit}
                        className="h-3.5 w-3.5 accent-primary-600"
                      />
                      <MealCombobox
                        value={weeks[activeWeek][weekday][slotType].mealId}
                        onChange={(mealId) => updateWeekSlot(activeWeek, weekday, slotType, { mealId })}
                        knownMeals={meals}
                        noneLabel={`${SLOT_LABELS[slotType]} — to be announced`}
                        disabled={!canEdit || !weeks[activeWeek][weekday][slotType].included}
                      />
                    </div>
                  ))}
                </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(days ?? []).map((day, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-100 p-3 sm:grid-cols-[3rem_repeat(3,1fr)] sm:items-center dark:border-zinc-800"
              >
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Day {i + 1}</span>
                {SLOT_TYPES.map((slotType) => (
                  <div key={slotType} className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={day[slotType].included}
                      onChange={(e) => updateSlot(i, slotType, { included: e.target.checked })}
                      disabled={!canEdit}
                      className="h-3.5 w-3.5 accent-primary-600"
                    />
                    <MealCombobox
                      value={day[slotType].mealId}
                      onChange={(mealId) => updateSlot(i, slotType, { mealId })}
                      knownMeals={meals}
                      noneLabel={`${SLOT_LABELS[slotType]} — to be announced`}
                      disabled={!canEdit || !day[slotType].included}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={handleSaveDays}
            disabled={savingDays}
            className="btn-primary btn-sm self-start"
          >
            {savingDays ? "Saving…" : "Save meal plan"}
          </button>
        )}
      </div>
    </div>
  );
}
