import { Skeleton } from "@/components/ui/Skeleton";

function Field({ label = "w-24" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className={`h-5 ${label}`} />
      <Skeleton className="h-[42px] w-full rounded-xl" />
    </div>
  );
}

function ImageField() {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-5 w-16" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-16 w-16 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

function ToggleRow() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
      <Skeleton className="h-6 w-11 rounded-full" />
    </div>
  );
}

/**
 * Mirrors the business-profile form: the same eight `card p-6` sections in
 * the same order with the same grids, so the form drops in without shifting.
 */
export function BusinessProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-7 w-44" />
      </div>

      {/* Basics */}
      <div className="card flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-16" />
        <Field label="w-28" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-[86px] w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ImageField />
          <ImageField />
          <ImageField />
        </div>
      </div>

      {/* Branding display */}
      <div className="card flex flex-col gap-6 p-6">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-[42px] w-full rounded-xl" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field />
                <Field />
              </div>
              <Field />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field />
          <Field />
        </div>
      </div>

      {/* Contact */}
      <div className="card flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-20" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field />
          <Field />
          <Field label="w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field />
          <Field />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="w-12" />
          <Field label="w-12" />
          <Field label="w-16" />
          <Field label="w-16" />
        </div>
      </div>

      {/* Locale & tax */}
      <div className="card flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field />
          <Field />
          <Field />
          <Field />
        </div>
        <div className="grid grid-cols-1 items-end gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-4 dark:border-zinc-800">
          <div className="sm:col-span-2">
            <Field label="w-36" />
          </div>
          <div className="sm:col-span-2">
            <ToggleRow />
          </div>
        </div>
      </div>

      {/* Pickup orders */}
      <div className="card flex flex-col gap-3 p-6">
        <Skeleton className="h-5 w-28" />
        <ToggleRow />
      </div>

      {/* Theme colors */}
      <div className="card flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="h-5 w-20" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-12 shrink-0" />
                <Skeleton className="h-[42px] w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Field key={i} />
          ))}
        </div>
      </div>

      {/* Home page */}
      <div className="card flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-24" />
        <ToggleRow />
      </div>

      {/* SEO */}
      <div className="card flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-12" />
        <Field label="w-56" />
      </div>

      <Skeleton className="h-10 w-36 rounded-xl" />
    </div>
  );
}
