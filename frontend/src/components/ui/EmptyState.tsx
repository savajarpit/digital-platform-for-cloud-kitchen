import type { LucideIcon } from "lucide-react";

/**
 * Empty / no-results / error placeholder. Always render it INSIDE the same
 * page container as the content it replaces (never as an early-return with
 * its own <main>), and let `compact` cover in-card / in-table use — so an
 * empty result never changes the page's width, and the tall variant keeps
 * roughly the height the results would have had.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-3 text-center ${
        compact ? "py-10" : "min-h-[45vh] py-12"
      }`}
    >
      {Icon && <Icon className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />}
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action}
    </div>
  );
}
