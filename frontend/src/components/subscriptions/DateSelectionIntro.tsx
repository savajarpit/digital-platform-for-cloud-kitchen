/** Heading of the delivery-date picker, plus the long-plan "Change specific
 * dates" switch (short plans are always editable, so they don't get one). */
export function DateSelectionIntro({
  requiredCount,
  manualSelection,
  editing,
  onEditingChange,
}: {
  requiredCount: number;
  manualSelection: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  return (
    <>
      <div>
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Your delivery dates
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {manualSelection
            ? `Your next ${requiredCount} delivery days are selected. Remove any with ✕ and tap another date to add it.`
            : `Your ${requiredCount}-day plan starts on the first available date. Tap a date to see its menu.`}
        </p>
      </div>

      {!manualSelection && (
        <label className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Change specific dates
            <span className="block text-xs font-normal text-zinc-400">
              {editing
                ? "Remove a day with ✕, then tap another date to add it."
                : "All days are pre-selected. Turn this on to adjust individual dates."}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={editing}
            onClick={() => onEditingChange(!editing)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              editing ? "bg-primary-600" : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                editing ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      )}
    </>
  );
}
