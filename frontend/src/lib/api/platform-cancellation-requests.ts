import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export type PlatformCancellationRequestStatus = "PENDING" | "CONTACTED" | "RESOLVED";

export interface PlatformCancellationRequest {
  id: string;
  tenantId: string;
  tenant: { name: string };
  reason: string;
  status: PlatformCancellationRequestStatus;
  createdAt: string;
  updatedAt: string;
}

/** Tenant-authenticated — submits a "please contact me about cancelling"
 * request. Never cancels anything itself; only notifies Arpit to follow up. */
export function submitCancellationRequest(reason: string): Promise<{ received: true }> {
  return proxyFetch<{ received: true }>("/platform-cancellation-requests", {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function listCancellationRequests(): Promise<PlatformCancellationRequest[]> {
  return proxyFetch<PlatformCancellationRequest[]>("/platform-cancellation-requests");
}

export function updateCancellationRequestStatus(
  id: string,
  status: PlatformCancellationRequestStatus,
): Promise<PlatformCancellationRequest> {
  return proxyFetch<PlatformCancellationRequest>(`/platform-cancellation-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
