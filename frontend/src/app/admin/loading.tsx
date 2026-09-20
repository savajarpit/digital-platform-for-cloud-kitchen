import { TableSkeleton } from "@/components/ui/skeletons/TableSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** Admin pages differ a lot, so this is a neutral page-title + table block
 * inside the admin shell (the sidebar/header are the layout and stay put). */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-7 w-44" />
      </div>
      <TableSkeleton cols={5} rows={5} />
    </div>
  );
}
