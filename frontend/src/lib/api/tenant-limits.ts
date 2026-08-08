import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface UsageStat {
  used: number;
  max: number | null;
  nearLimit: boolean;
  hitLimit: boolean;
  blockedAttempts: number;
}

export interface UsageSummary {
  orders: UsageStat;
  subscribers: UsageStat;
}

/** Tenant-facing (OWNER/STAFF/SUPER_ADMIN) — this tenant's own usage vs. its plan limits, for the near-limit/hit-limit banner. */
export function getMyUsage(): Promise<UsageSummary> {
  return proxyFetch<UsageSummary>("/tenant-limits/me");
}
