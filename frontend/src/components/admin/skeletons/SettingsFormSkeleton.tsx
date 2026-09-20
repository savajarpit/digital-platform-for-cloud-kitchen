import { Skeleton } from "@/components/ui/Skeleton";
import { FormSkeleton } from "@/components/ui/skeletons/FormSkeleton";

/**
 * Whole-page skeleton for the simple settings forms: the page title row
 * (icon + `text-lg` heading), the shared `FormSkeleton` cards, then the
 * Save button — same `flex flex-col gap-6` rhythm as the real pages.
 */
export function SettingsFormSkeleton({
  cards = 1,
  fields = 4,
  columns = 2,
  button = true,
}: {
  cards?: number;
  fields?: number;
  columns?: 1 | 2 | 3;
  button?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-7 w-40" />
      </div>
      <FormSkeleton cards={cards} fields={fields} columns={columns} />
      {button && <Skeleton className="h-10 w-36 rounded-xl" />}
    </div>
  );
}
