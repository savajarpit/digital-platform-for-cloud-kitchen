import { ApiError, parseOrThrow, proxyFetch } from "@/lib/api/client";
import { PUBLIC_API_URL } from "@/lib/config/env";

export { ApiError };

export type PlatformLeadStatus = "NEW" | "CONTACTED" | "CONVERTED" | "DISMISSED";

export interface PlatformLead {
  id: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string | null;
  planId: string | null;
  plan: { name: string } | null;
  message: string | null;
  tenantId: string | null;
  status: PlatformLeadStatus;
  createdAt: string;
}

export interface CreateLeadInput {
  businessName: string;
  contactEmail: string;
  contactPhone?: string;
  planId?: string;
  message?: string;
}

/** Public, client-side — for the (separate, not-yet-built) marketing site's "contact us" form. */
export async function submitPlatformLead(input: CreateLeadInput): Promise<{ received: true }> {
  const res = await fetch(`${PUBLIC_API_URL}/platform-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<{ received: true }>(res);
}

export function listPlatformLeads(): Promise<PlatformLead[]> {
  return proxyFetch<PlatformLead[]>("/platform-leads");
}

export function updatePlatformLeadStatus(
  id: string,
  status: PlatformLeadStatus,
): Promise<PlatformLead> {
  return proxyFetch<PlatformLead>(`/platform-leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
