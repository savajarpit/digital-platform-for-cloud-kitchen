import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors PlanCard.tsx: `card p-6` flex column, accent bar, title, price
 * block, feature rows, and a full-width `btn-lg` (52px) at the bottom. */
export function PlanCardSkeleton() {
  return (
    <div className="card relative flex flex-col p-6" aria-busy="true">
      <Skeleton className="mb-5 h-2 w-full rounded-full" />
      <Skeleton className="h-7 w-2/3" />
      <div className="mt-1 mb-4 space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <div className="mb-5">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="mt-1 h-5 w-24" />
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-full" />
          </li>
        ))}
      </ul>

      <Skeleton className="mt-auto h-13 w-full rounded-xl" />
    </div>
  );
}
