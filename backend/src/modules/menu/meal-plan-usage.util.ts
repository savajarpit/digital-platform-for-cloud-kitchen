/** One plan day that serves a meal — the shape findPlanSlotsUsingMeal returns. */
export interface MealPlanUsage {
  planDay: {
    dayNumber: number | null;
    weekNumber: number | null;
    weekday: number | null;
    plan: { id: string; name: string };
  };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Keeps the message readable when a meal is on many days. */
const MAX_DAYS_LISTED = 4;

function dayLabel(day: MealPlanUsage['planDay']): string {
  if (day.dayNumber !== null) return `Day ${day.dayNumber}`;
  return `Week ${day.weekNumber ?? '?'} · ${WEEKDAYS[day.weekday ?? 0]}`;
}

function dayOrder(day: MealPlanUsage['planDay']): number {
  return day.dayNumber ?? (day.weekNumber ?? 0) * 7 + (day.weekday ?? 0);
}

/** Why a meal can't be deleted: subscribers' plans still deliver it.
 * Null when no plan uses it. */
export function mealInPlansMessage(
  mealName: string,
  usages: MealPlanUsage[],
): string | null {
  if (usages.length === 0) return null;
  const byPlan = new Map<
    string,
    { name: string; days: MealPlanUsage['planDay'][] }
  >();
  for (const { planDay } of usages) {
    const entry = byPlan.get(planDay.plan.id) ?? {
      name: planDay.plan.name,
      days: [],
    };
    entry.days.push(planDay);
    byPlan.set(planDay.plan.id, entry);
  }
  const plans = [...byPlan.values()].map(({ name, days }) => {
    const labels = [
      ...new Set(days.sort((a, b) => dayOrder(a) - dayOrder(b)).map(dayLabel)),
    ];
    const shown = labels.slice(0, MAX_DAYS_LISTED).join(', ');
    const more = labels.length - MAX_DAYS_LISTED;
    return `${name} (${shown}${more > 0 ? ` +${more} more` : ''})`;
  });
  const list =
    plans.length === 1
      ? plans[0]
      : `${plans.slice(0, -1).join(', ')} and ${plans.at(-1)}`;
  const those = plans.length === 1 ? 'that plan' : 'those plans';
  return `"${mealName}" is used in ${list}. Swap it out in ${those} first, or mark the meal unavailable instead.`;
}
