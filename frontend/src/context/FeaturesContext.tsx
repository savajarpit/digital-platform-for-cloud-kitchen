"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMyFeatures } from "@/lib/api/features";

interface FeaturesContextValue {
  features: string[];
  loading: boolean;
  has: (featureKey: string) => boolean;
}

const FeaturesContext = createContext<FeaturesContextValue | undefined>(undefined);

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<string[] | null>(null);

  useEffect(() => {
    getMyFeatures()
      .then((res) => setFeatures(res.features))
      .catch(() => setFeatures([]));
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
