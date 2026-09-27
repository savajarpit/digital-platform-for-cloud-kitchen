"use client";

import { PlanDetailSkeleton } from "@/components/subscriptions/PlanDetailSkeleton";
import { usePlanLayoutHint } from "@/components/subscriptions/PlanLayoutHint";

export default function PlanDetailLoading() {
  return <PlanDetailSkeleton calendar={usePlanLayoutHint()} />;
}
