"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getMyFeatures } from "@/lib/api/features";

interface FeaturesContextValue {
  features: string[];
  loading: boolean;
  has: (featureKey: string) => boolean;
}

const FeaturesContext = createContext<FeaturesContextValue | undefined>(undefined);

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<string[] | null>(null);
  const pathname = usePathname();

  // Same staleness gap as PermissionsProvider (see its comment) — this also
  // mounts once for the whole admin session, so re-check on navigation and
  // tab focus rather than only once at first load.
  useEffect(() => {
    getMyFeatures()
      .then((res) => setFeatures(res.features))
      .catch(() => setFeatures([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function refetch() {
      getMyFeatures()
        .then((res) => setFeatures(res.features))
        .catch(() => undefined);
    }
    window.addEventListener("focus", refetch);
    return () => window.removeEventListener("focus", refetch);
  }, []);

  const value: FeaturesContextValue = {
    features: features ?? [],
    loading: features === null,
    has: (featureKey: string) => (features ?? []).includes(featureKey),
  };

  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): FeaturesContextValue {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error("useFeatures must be used within FeaturesProvider");
  return ctx;
}

/** Convenience for a single feature check — returns false while still loading. */
export function useFeature(featureKey: string): boolean {
  return useFeatures().has(featureKey);
}
