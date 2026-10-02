import { proxyFetch, proxyFetchPaginated } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/response";

export type CancellationRequestStatus =
  "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export interface CancellationRequest {
  id: string;
  subscriptionId: string | null;
  orderId: string | null;
  reason: string;
  note: string | null;
  status: CancellationRequestStatus;
  /** YYYY-MM-DD (tenant-local) the subscription's deliveries are held from. */
  heldFromDate: string | null;
  resolvedAt: string | null;
  /** The kitchen's note on a rejection — shown to the customer. */
  resolutionNote: string | null;
  bankedDays: number;
  createdAt: string;
}

/** Same codes/labels as the backend's CANCELLATION_REASONS. */
export const CANCELLATION_REASONS = [
  { code: "MOVING", label: "Moving / relocating" },
  { code: "PRICE", label: "Too expensive" },
  { code: "FOOD", label: "Food taste or quality" },
  { code: "SCHEDULE", label: "Schedule or timing doesn’t suit me" },
  { code: "DELIVERY", label: "Delivery problems" },
  { code: "ORDERED_BY_MISTAKE", label: "Ordered by mistake" },
  { code: "OTHER", label: "Something else" },
] as const;

export function cancellationReasonLabel(code: string): string {
  return CANCELLATION_REASONS.find((r) => r.code === code)?.label ?? code;
}

export interface CancellationRequestInput {
  reason: string;
  note?: string;
}

// ── Customer ────────────────────────────────────────────────

export function requestSubscriptionCancellation(
  subscriptionId: string,
  input: CancellationRequestInput,
): Promise<CancellationRequest> {
  return proxyFetch(`/cancellation-requests/subscriptions/${subscriptionId}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function requestOrderCancellation(
  orderId: string,
  input: CancellationRequestInput,
): Promise<CancellationRequest> {
  return proxyFetch(`/cancellation-requests/orders/${orderId}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface OrderCancellationStatus {
  request: CancellationRequest | null;
  canRequest: boolean;
  /** Why a request can't be raised right now (kitchen already started, …). */
  blockedReason: string | null;
}

export function getOrderCancellationStatus(
  orderId: string,
): Promise<OrderCancellationStatus> {
  return proxyFetch(`/cancellation-requests/orders/${orderId}/status`);
}

export function withdrawCancellationRequest(
  id: string,
): Promise<CancellationRequest> {
  return proxyFetch(`/cancellation-requests/${id}/withdraw`, {
    method: "POST",
  });
}

// ── Admin ───────────────────────────────────────────────────

export type CancellationKind = "SUBSCRIPTION" | "ORDER";

export interface AdminCancellationRequest extends CancellationRequest {
  reasonLabel: string;
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
  subscription: {
    id: string;
    planNameSnapshot: string;
    status: string;
    startDate: string | null;
    cycleEnd: string | null;
  } | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    totalInPaise: number;
    deliveryDate: string;
    deliverySlotName: string;
    isInstant: boolean;
  } | null;
}

export interface AdminCancellationList {
  data: AdminCancellationRequest[];
  meta?: PaginationMeta;
}

const KIND_PATH: Record<CancellationKind, string> = {
  SUBSCRIPTION: "subscriptions",
  ORDER: "orders",
};

export function listCancellationRequests(
  kind: CancellationKind,
  params: { status?: CancellationRequestStatus; page?: number; limit?: number },
): Promise<AdminCancellationList> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  return proxyFetchPaginated<AdminCancellationRequest[]>(
    `/cancellation-requests/admin/${KIND_PATH[kind]}?${query.toString()}`,
  );
}

export function getPendingCancellationCount(): Promise<{
  subscriptions: number;
  orders: number;
}> {
  return proxyFetch("/cancellation-requests/admin/pending-count");
}

export function getPendingCancellationFor(
  kind: CancellationKind,
  targetId: string,
): Promise<AdminCancellationRequest | null> {
  return proxyFetch(
    `/cancellation-requests/admin/${KIND_PATH[kind]}/${targetId}/pending`,
  );
}

export function rejectCancellationRequest(
  kind: CancellationKind,
  id: string,
  note: string,
): Promise<AdminCancellationRequest> {
  return proxyFetch(
    `/cancellation-requests/admin/${KIND_PATH[kind]}/requests/${id}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ note }),
    },
  );
}
