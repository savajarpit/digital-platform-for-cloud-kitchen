import { Skeleton } from "@/components/ui/Skeleton";

/** A labelled input: text-sm label (20px) + mb-1 + 42px input. */
function FieldSkeleton({ hint = false }: { hint?: boolean }) {
  return (
    <div>
      <Skeleton className="mb-1 h-5 w-24" />
      <Skeleton className="h-[42px] w-full rounded-xl" />
      {hint && <Skeleton className="mt-1 h-4 w-56 max-w-full" />}
    </div>
  );
}

/** Mirrors the body of app/account/profile/page.tsx (everything under the
 * PageHeader, which the page renders itself): personal-info card and
 * change-password card on the left (lg:col-span-2), two link cards on the
 * right, same `lg:grid-cols-3` split and gaps. */
export function ProfileSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="card flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-40" />
          </div>
          <FieldSkeleton hint />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <FieldSkeleton />
          <Skeleton className="mt-2 h-10 w-24 rounded-xl" />
        </div>

        <div className="card flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-40" />
          </div>
          <FieldSkeleton />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="mt-2 h-10 w-40 rounded-xl" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card flex items-center gap-3 p-5">
            <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-40 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
