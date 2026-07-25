import { Skeleton } from "@/components/ui/Skeleton";

export default function PlansLoading() {
  return (
    <main className="container-app flex-1 py-16 text-center">
      <Skeleton className="mx-auto h-6 w-28 rounded-full" />
      <Skeleton className="mx-auto mt-4 h-9 w-64 max-w-full" />
      <Skeleton className="mx-auto mt-4 h-5 w-full max-w-xl" />
      <Skeleton className="mx-auto mt-2 h-5 w-2/3 max-w-xl" />
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="mx-auto mt-10 h-12 w-48 rounded-xl" />
    </main>
  );
}
