export type DateSelectionRailTab = "day" | "days";

const RAIL_TAB =
  "flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors";

/** Desktop rail card of the delivery-date picker: "Day details" and
 * "Your days (n/N)" tabs over whichever content the picker passes in. */
export function DateSelectionRailCard({
  tab,
  onTabChange,
  selectedCount,
  requiredCount,
  children,
}: {
  tab: DateSelectionRailTab;
  onTabChange: (tab: DateSelectionRailTab) => void;
  selectedCount: number;
  requiredCount: number;
  children: React.ReactNode;
}) {
  const tabs = [
    { id: "day", label: "Day details" },
    { id: "days", label: `Your days (${selectedCount}/${requiredCount})` },
  ] as const;

  return (
    <aside className="card hidden flex-col gap-4 p-5 lg:flex">
      <div
        role="tablist"
        className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
      >
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTabChange(id)}
            className={`${RAIL_TAB} ${
              tab === id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {children}
    </aside>
  );
}
