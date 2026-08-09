"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { PublicPlan } from "@/lib/api/plans";
import { fetchPlansClient } from "@/lib/api/plans-client";
import { PlanCard } from "./PlanCard";

export function PlansBrowser({ initialPlans }: { initialPlans: PublicPlan[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      fetchPlansClient(search || undefined)
        .then(setPlans)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  return (
    <div>
      {initialPlans.length > 3 && (
        <div className="relative mx-auto mt-8 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans…"
            className="input w-full pl-9"
          />
        </div>
      )}

      {plans.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {loading ? "Searching…" : "No plans match."}
        </p>
      ) : (
        <div className={`mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
          {plans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
