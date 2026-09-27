import { RotateCcw } from "lucide-react";

function formatShort(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "5 of 7 days selected · 28 Sep – 5 Oct", with Auto-fill while short. */
export function SelectionStatusBar({
  sortedDates,
  requiredCount,
  canAutoFill,
  onAutoFill,
}: {
  sortedDates: string[];
  requiredCount: number;
  canAutoFill: boolean;
  onAutoFill: () => void;
}) {
  const complete = sortedDates.length === requiredCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
      <p
        className={`text-sm font-semibold ${
          complete
            ? "text-primary-700 dark:text-primary-400"
            : "text-amber-700 dark:text-amber-400"
        }`}
      >
        {sortedDates.length} of {requiredCount} days selected
        {sortedDates.length > 0 && (
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            {` · ${formatShort(sortedDates[0])} – ${formatShort(sortedDates.at(-1) ?? sortedDates[0])}`}
          </span>
        )}
      </p>
      {!complete && canAutoFill && (
        <button
          type="button"
          onClick={onAutoFill}
          className="btn-outline btn-sm cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Auto-fill next available dates
        </button>
      )}
    </div>
  );
}
