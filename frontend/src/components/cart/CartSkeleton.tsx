import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors cart/page.tsx: title, then `lg:grid-cols-3` with the line-item
 * cards (`card p-4`, 64px thumbnail) in the wide column and the summary card
 * beside it. */
export function CartSkeleton() {
  return (
    <main className="container-app flex-1 py-10" aria-busy="true">
      <Skeleton className="h-8 w-40 sm:h-9" />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card flex items-center gap-4 p-4">
              <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-9 w-28 shrink-0 rounded-xl" />
            </div>
          ))}
        </div>

        <div className="card flex h-fit flex-col gap-3 p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mt-2 h-12 w-full rounded-xl" />
        </div>
      </div>
    </main>
  );
}
