import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the login/signup/forgot/reset pages: a centered `card max-w-md
 * p-8` with a title, labelled inputs and a full-width button. */
export function AuthCardSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <main
      className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6"
      aria-busy="true"
    >
      <div className="card flex w-full max-w-md flex-col gap-4 p-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-64 max-w-full" />
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-[42px] w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="mt-2 h-11 w-full rounded-xl" />
        <Skeleton className="mx-auto h-5 w-48" />
      </div>
    </main>
  );
}
