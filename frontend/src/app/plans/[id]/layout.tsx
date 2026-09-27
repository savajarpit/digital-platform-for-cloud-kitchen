import { getPlansHomeSettings } from "@/lib/api/plans";
import { PlanLayoutHintProvider } from "@/components/subscriptions/PlanLayoutHint";

/** Reads the tenant's plan layout on the server so the very first loading
 * skeleton already matches the page (calendar vs list) instead of flipping
 * once a client-side settings fetch lands. */
export default async function PlanDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getPlansHomeSettings();
  const usesCalendar =
    Boolean(settings.dateSelectionEnabled) ||
    (settings.planViewMode ?? "ACCORDION") !== "ACCORDION";
  return (
    <PlanLayoutHintProvider usesCalendar={usesCalendar}>
      {children}
    </PlanLayoutHintProvider>
  );
}
