import {
  HATCH_STYLE,
  SLOT_DOT,
  SLOT_LABELS,
  SLOT_ORDER,
} from "./plan-calendar-styles";

const ITEM = "flex items-center gap-1.5";

/** Key for the plan calendar's boxes; `picker` adds the in-plan/available pair. */
export function PlanCalendarLegend({ picker = false }: { picker?: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      {picker ? (
        <>
          <span className={ITEM}>
            <span className="h-3 w-3 rounded border border-primary-600 bg-primary-50 dark:bg-primary-950/40" />
            In your plan
          </span>
          <span className={ITEM}>
            <span className="h-3 w-3 rounded border border-dashed border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900" />
            Available
          </span>
        </>
      ) : (
        <span className={ITEM}>
          <span className="h-3 w-3 rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900" />
          Delivery day
        </span>
      )}
      <span className={ITEM}>
        <span
          className="h-3 w-3 rounded border border-zinc-200 dark:border-zinc-700"
          style={HATCH_STYLE}
        />
        Holiday
      </span>
      <span className={ITEM}>
        <span className="h-3 w-3 rounded bg-zinc-100 dark:bg-zinc-800" />
        No delivery
      </span>
      {SLOT_ORDER.map((slot) => (
        <span key={slot} className={ITEM}>
          <span className={`h-2 w-2 rounded-full ${SLOT_DOT[slot]}`} />
          {SLOT_LABELS[slot]}
        </span>
      ))}
    </div>
  );
}
