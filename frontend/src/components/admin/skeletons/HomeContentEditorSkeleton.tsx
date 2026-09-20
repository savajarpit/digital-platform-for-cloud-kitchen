import { Skeleton } from "@/components/ui/Skeleton";

function Input() {
  return <Skeleton className="h-[42px] w-full rounded-xl" />;
}

/** Mirrors HomePageContentEditor: hero / reviews / CTA blocks inside one card. */
export function HomeContentEditorSkeleton() {
  return (
    <div className="card flex flex-col gap-4 p-6" aria-busy="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-5 w-40" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <Skeleton className="h-4 w-12" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input />
            <Input />
          </div>
          <Skeleton className="h-[74px] w-full rounded-xl" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Skeleton className="h-5 w-24" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <Skeleton className="h-9 w-24 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <Skeleton className="h-4 w-28" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input />
            <Input />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <Input />
          <Skeleton className="h-[74px] w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input />
            <Input />
            <Input />
            <Input />
          </div>
        </div>

        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}
