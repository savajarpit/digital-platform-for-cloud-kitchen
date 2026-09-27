import { CalendarDays, List } from "lucide-react";

export type PlanViewTab = "calendar" | "list";

const TAB_BASE =
  "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors";

const TABS = [
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "list", label: "List", Icon: List },
] as const;

/** Calendar / List switch above a plan's menu. */
export function PlanViewTabs({
  tab,
  onChange,
}: {
  tab: PlanViewTab;
  onChange: (tab: PlanViewTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Menu view"
      className="mb-4 inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
    >
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => onChange(id)}
          className={`${TAB_BASE} ${
            tab === id
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
