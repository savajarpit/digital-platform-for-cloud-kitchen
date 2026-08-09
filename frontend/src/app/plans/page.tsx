import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getPublicConfig } from "@/lib/api/settings";
import { getPublishedPlans } from "@/lib/api/plans";
import { PlansBrowser } from "@/components/subscriptions/PlansBrowser";

export default async function PlansPage() {
  const [config, plans] = await Promise.all([getPublicConfig(), getPublishedPlans()]);

  if (plans.length === 0) {
    return (
      <main className="container-app flex-1 py-16 text-center">
        <span className="badge mx-auto bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
          <CalendarClock className="h-3.5 w-3.5" />
          Coming soon
        </span>
        <h1 className="section-title mt-4 text-zinc-900 dark:text-zinc-100">Meal Plans</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
          Weekly meal plans from {config.displayName} are on the way.
        </p>
        <Link href="/menu" className="btn-primary mt-10">
          Browse the full menu
        </Link>
      </main>
    );
  }

  return (
    <main className="container-app flex-1 py-12">
      <div className="text-center">
        <h1 className="section-title text-zinc-900 dark:text-zinc-100">Meal Plans</h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
          Curated multi-day meal plans from {config.displayName} — pick one and get it delivered
          on schedule.
        </p>
      </div>

      <PlansBrowser initialPlans={plans} />
    </main>
  );
}
