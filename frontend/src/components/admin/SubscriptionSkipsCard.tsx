import type {
  SubscriptionDayOverride,
  SubscriptionSkip,
} from "@/lib/api/admin-subscriptions";
import { formatDateStrShort } from "@/lib/format/date";
import { formatTime12h } from "@/lib/format/time";

function skipLabel(skip: SubscriptionSkip): string {
  const range =
    skip.dateFrom === skip.dateTo
      ? formatDateStrShort(skip.dateFrom)
      : `${formatDateStrShort(skip.dateFrom)} – ${formatDateStrShort(skip.dateTo)}`;
  return skip.reason ? `${range} — ${skip.reason}` : range;
}

/** Skips/pauses and per-day changes on a subscriber's plan — each change
 * shows what the kitchen must do differently that day (address, time,
 * note), not just which day changed. */
export function SubscriptionSkipsCard({
  skips,
  dayOverrides,
}: {
  skips: SubscriptionSkip[];
  dayOverrides: SubscriptionDayOverride[];
}) {
  if (skips.length === 0 && dayOverrides.length === 0) return null;

  return (
    <div className="card flex flex-col gap-3 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Skips &amp; changes
      </h3>
      {skips.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Skipped / paused
          </p>
          <div className="flex flex-wrap gap-1.5">
            {skips.map((skip) => (
              <span
                key={skip.id}
                title={skip.reason ?? undefined}
                className={`badge ${
                  skip.reason
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {skipLabel(skip)}
              </span>
            ))}
          </div>
        </div>
      )}
      {dayOverrides.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Per-day changes
          </p>
          <ul className="flex flex-col divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {dayOverrides.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-3"
              >
                <span className="w-20 shrink-0 font-medium text-zinc-900 dark:text-zinc-100">
                  {formatDateStrShort(o.date)}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5 text-zinc-600 dark:text-zinc-400">
                  {o.address && (
                    <span className="wrap-break-word">
                      Deliver to:{" "}
                      {o.address.label ? `${o.address.label} — ` : ""}
                      {o.address.line1}, {o.address.city}
                    </span>
                  )}
                  {o.deliverySlot && (
                    <span>
                      Time: {o.deliverySlot.name} (
                      {formatTime12h(o.deliverySlot.startTime)}–
                      {formatTime12h(o.deliverySlot.endTime)})
                    </span>
                  )}
                  {o.note && (
                    <span className="wrap-break-word">Note: {o.note}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
