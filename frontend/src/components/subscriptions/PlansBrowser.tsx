"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SearchX, TriangleAlert } from "lucide-react";
import type { PublicPlan } from "@/lib/api/plans";
import { fetchPlansClient } from "@/lib/api/plans-client";
import { STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { PlanCard } from "./PlanCard";
import { PlanCardSkeleton } from "./PlanCardSkeleton";

export function PlansBrowser({ initialPlans }: { initialPlans: PublicPlan[] }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Server-rendered plans seed the unfiltered view (no request on mount);
  // searches are cached per term; while a NEW term is loading the old cards
  // are only a placeholder, so skeleton cards fill the same grid instead.
  const { data, isError, isPlaceholderData, refetch } = useQuery({
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
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            if (v === "") setDebouncedSearch("");
          }}
          placeholder="Search plans…"
          className="mx-auto mt-8 max-w-sm"
        />
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
        ) : isPlaceholderData ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <PlanCardSkeleton key={i} />
            ))}
          </div>
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
