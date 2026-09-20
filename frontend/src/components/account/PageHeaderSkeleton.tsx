import { Skeleton } from "@/components/ui/Skeleton";

/** Placeholder for components/account/PageHeader.tsx: `mb-6` row with the
 * 20px icon and the `text-xl` (28px line) title. */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex items-center gap-2">
      <Skeleton className="h-5 w-5 rounded-full" />
      <Skeleton className="h-7 w-44" />
    </div>
  );
}
