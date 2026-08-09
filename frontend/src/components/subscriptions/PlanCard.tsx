import Link from "next/link";
import { ArrowRight, Check, Clock, Star } from "lucide-react";
import type { PublicPlan } from "@/lib/api/plans";
import {
  PLAN_ACCENT_BADGE,
  PLAN_ACCENT_GRADIENT,
  PLAN_ACCENT_ICON_BG,
  PLAN_ACCENT_ICON_TEXT,
} from "@/lib/theme/plan-accent";
import { formatPriceFromPaise } from "@/lib/format/currency";

export function PlanCard({ plan, index }: { plan: PublicPlan; index: number }) {
  return (
    <Link
      href={`/plans/${plan.id}`}
      className={`card card-hover relative flex flex-col p-6 opacity-0 animate-fade-up ${
        plan.isPopular ? "ring-2 ring-primary-500 shadow-soft" : ""
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {plan.badgeText && (
        <div
          className={`badge absolute -top-3 left-6 shadow-sm ${
            plan.isPopular ? "bg-primary-600 text-white" : PLAN_ACCENT_BADGE[plan.accentColor]
          }`}
        >
          {plan.isPopular && <Star className="h-3 w-3 fill-white" />}
          {plan.badgeText}
        </div>
      )}

      <div className={`mb-5 h-2 rounded-full bg-gradient-to-r ${PLAN_ACCENT_GRADIENT[plan.accentColor]}`} />

      <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">{plan.name}</h2>
      {plan.description && (
        <p className="mt-1 mb-4 text-sm text-zinc-500 dark:text-zinc-400">{plan.description}</p>
      )}

      <div className="mb-5">
        <span className="font-display text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          {formatPriceFromPaise(plan.priceInPaise)}
        </span>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <Clock className="h-3.5 w-3.5" />
          {plan.durationDays} days
        </p>
      </div>

      {plan.features.length > 0 && (
        <ul className="mb-6 flex-1 space-y-2.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm">
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${PLAN_ACCENT_ICON_BG[plan.accentColor]}`}
              >
                <Check className={`h-3 w-3 ${PLAN_ACCENT_ICON_TEXT[plan.accentColor]}`} />
              </div>
              <span className="text-zinc-700 dark:text-zinc-300">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <span className={`${plan.isPopular ? "btn-primary" : "btn-outline"} btn-lg mt-auto w-full justify-center`}>
        Choose Plan
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
