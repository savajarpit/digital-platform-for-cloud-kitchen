import { Lock } from "lucide-react";

export function ViewOnlyNotice() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-400">
      <Lock className="h-4 w-4 shrink-0" />
      You don&apos;t have permission to edit this section — contact your admin.
    </div>
  );
}
