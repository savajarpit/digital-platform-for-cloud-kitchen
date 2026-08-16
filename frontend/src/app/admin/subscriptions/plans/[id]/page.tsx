"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock, Star } from "lucide-react";
import { getPlanAdmin, type Plan } from "@/lib/api/admin-subscriptions";
import {
  PLAN_ACCENT_BADGE,
  PLAN_ACCENT_GRADIENT,
  PLAN_ACCENT_ICON_BG,
  PLAN_ACCENT_ICON_TEXT,
} from "@/lib/theme/plan-accent";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlanDayBreakdown } from "@/components/admin/PlanDayBreakdown";
import { formatPriceFromPaise } from "@/lib/format/currency";

export default function AdminPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getPlanAdmin(id)
      .then(setPlan)
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Plan not found.</p>
        <Link href="/admin/subscriptions" className="btn-primary">
          Back to plans
        </Link>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/subscriptions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to plans
        </Link>
        <span
          className={`badge ${
            plan.isPublished
              ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {plan.isPublished ? "Published" : "Draft"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card relative flex flex-col p-6 lg:col-span-1">
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
            <ul className="flex-1 space-y-2.5">
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
        </div>

        <div className="card flex flex-col gap-3 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Day-by-day plan</h3>
          <PlanDayBreakdown days={plan.days ?? []} />
        </div>
      </div>
    </div>
  );
}
