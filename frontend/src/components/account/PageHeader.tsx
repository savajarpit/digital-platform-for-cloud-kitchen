import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Consistent icon + title bar for every customer account page (Orders,
 * Profile, Addresses, My Subscriptions) so headers don't drift in style. */
export function PageHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-primary-600">
        <Icon className="h-5 w-5" />
        <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
