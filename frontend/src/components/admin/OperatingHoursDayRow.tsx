"use client";

import type { DayHours } from "@/lib/api/admin-settings";
import { Toggle } from "@/components/ui/Toggle";
import { TimeInput12h } from "@/components/ui/TimeInput12h";

/** Hours a day gets when it's switched back on with no times of its own. */
const DEFAULT_DAY_HOURS: DayHours = { open: "09:00", close: "21:00" };

/** True when the day has both times and closing isn't after opening —
 * the same rule the API rejects (hours can't run past midnight). */
export function isInvalidDayHours(day: DayHours | undefined): boolean {
  return Boolean(day?.open && day?.close && day.close <= day.open);
}

/**
 * One weekday on the Order Hours page: an Open/Closed switch, then the
 * opening and closing times while open. Switching a day off is how a
 * weekly off is set — customers can't order for that weekday.
 */
export function OperatingHoursDayRow({
  label,
  hours,
  onChange,
  disabled,
}: {
  label: string;
  hours: DayHours | undefined;
  onChange: (hours: DayHours) => void;
  disabled?: boolean;
}) {
  const isOpen = Boolean(hours?.open || hours?.close);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-28 shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
        <Toggle
          checked={isOpen}
          onChange={(open) => onChange(open ? DEFAULT_DAY_HOURS : {})}
          disabled={disabled}
          label={`${label} open`}
        />
        {isOpen ? (
          <>
            <TimeInput12h
              value={hours?.open ?? ""}
              onChange={(v) => onChange({ ...hours, open: v })}
              disabled={disabled}
            />
            <span className="text-sm text-zinc-400">to</span>
            <TimeInput12h
              value={hours?.close ?? ""}
              onChange={(v) => onChange({ ...hours, close: v })}
              disabled={disabled}
            />
          </>
        ) : (
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            Closed
          </span>
        )}
      </div>
      {isInvalidDayHours(hours) && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Closing time must be later than opening time.
        </p>
      )}
    </div>
  );
}
