import { PUBLIC_API_URL } from "@/lib/config/env";
import type { ApiResponse } from "@/lib/api/response";
import type { PublicPlan } from "@/lib/api/plans";

/** Client Component equivalent of `getPublishedPlans` — public endpoint, direct fetch.
 * A failure throws (rather than reading as "no plans") so callers can show a
 * real error state. */
export async function fetchPlansClient(search?: string): Promise<PublicPlan[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`${PUBLIC_API_URL}/subscriptions/plans${qs}`, {
    headers: { "X-Tenant-Domain": window.location.host },
  });
  if (!res.ok) throw new Error(`Plans request failed (${res.status})`);
  const body = (await res.json()) as ApiResponse<PublicPlan[]>;
  return body.data ?? [];
}
