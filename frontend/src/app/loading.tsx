import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Neutral fallback for any route that has no loading.tsx of its own. It is
 * deliberately NOT the home page's skeleton (that lives in the `(home)`
 * route group) - showing the hero skeleton while opening some other page was
 * the bug this replaces. Routes with a distinctive layout get their own
 * loading.tsx next to their page.
 */
export default function RootLoading() {
  return (
    <main className="container-app flex-1 py-10" aria-busy="true">
      <Skeleton className="h-8 w-48 sm:h-9" />
      <div className="mt-6 flex flex-col gap-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </main>
  );
}
