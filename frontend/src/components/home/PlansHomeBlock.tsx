import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicPlan } from "@/lib/api/plans";
import { PlanCard } from "@/components/subscriptions/PlanCard";

const HOME_PLAN_LIMIT = 3;

export function PlansHomeBlock({
  plans,
  title,
  description,
}: {
  plans: PublicPlan[];
  title: string;
  description?: string;
}) {
  const featured = plans.slice(0, HOME_PLAN_LIMIT);

  return (
    <section className="container-app py-16 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title text-zinc-900 dark:text-zinc-100">{title}</h2>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
        </div>
        <Link href="/plans" className="btn-outline btn-sm">
          View all plans
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((plan, i) => (
          <PlanCard key={plan.id} plan={plan} index={i} />
        ))}
      </div>
    </section>
  );
}
