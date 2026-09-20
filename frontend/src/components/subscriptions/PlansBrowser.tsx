"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, SearchX, TriangleAlert } from "lucide-react";
import type { PublicPlan } from "@/lib/api/plans";
import { fetchPlansClient } from "@/lib/api/plans-client";
import { STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlanCard } from "./PlanCard";

export function PlansBrowser({ initialPlans }: { initialPlans: PublicPlan[] }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Server-rendered plans seed the unfiltered view (no request on mount);
  // searches are cached per term and keep the previous cards on screen while
  // loading, so the grid never blanks or dims.
  const { data, isError, refetch } = useQuery({
    queryKey: ["plans", "list", debouncedSearch],
    queryFn: () => fetchPlansClient(debouncedSearch || undefined),
    initialData: debouncedSearch === "" ? initialPlans : undefined,
    staleTime: STALE.list,
    placeholderData: keepPreviousData,
  });
  const plans = data ?? [];

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

      <div className="mt-10">
        {isError ? (
          <EmptyState
            compact
            icon={TriangleAlert}
            title="Couldn't load plans"
            description="Please check your connection and try again."
            action={
              <button type="button" onClick={() => refetch()} className="btn-outline btn-sm">
                Try again
              </button>
            }
          />
        ) : plans.length === 0 ? (
          <EmptyState compact icon={SearchX} title="No plans match your search." />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
