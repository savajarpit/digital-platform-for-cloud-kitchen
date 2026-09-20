import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the legal/platform text pages: `max-w-3xl` column, title, then
 * paragraphs of body copy. */
export function LegalPageSkeleton() {
  return (
    <main className="flex-1 px-4 py-12 sm:px-6" aria-busy="true">
      <div className="container-app max-w-3xl">
        <Skeleton className="h-8 w-72 max-w-full" />
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, block) => (
            <div key={block} className="flex flex-col gap-2 pb-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
