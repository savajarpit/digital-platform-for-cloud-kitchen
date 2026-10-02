"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOrderCancellationStatus,
  requestOrderCancellation,
} from "@/lib/api/cancellation-requests";
import { qk } from "@/lib/query/keys";
import { CancellationRequestSheet } from "@/components/cancellations/CancellationRequestSheet";
import { CancellationRequestStatusNote } from "@/components/cancellations/CancellationRequestStatusNote";

/**
 * "Request cancellation" for a one-time order — only rendered when the
 * business offers it (SUPER_ADMIN feature + the tenant's own switch), and
 * only while the kitchen hasn't started (the server decides; this just
 * shows its answer). Once a request exists its status replaces the button.
 */
export function OrderCancellationSection({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: qk.orders.cancellation(orderId),
    queryFn: () => getOrderCancellationStatus(orderId),
    staleTime: 0,
  });

  if (!data) return null;
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: qk.orders.all });
  const hasNote =
    data.request?.status === "PENDING" || data.request?.status === "REJECTED";

  if (!hasNote && !data.canRequest) return null;

  return (
    <div className="mx-auto mt-4 flex max-w-xl flex-col gap-3">
      <CancellationRequestStatusNote
        request={data.request}
        onChanged={refresh}
      />
      {data.canRequest && (
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Need to cancel? You can ask until the kitchen starts preparing your
            order.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-outline btn-sm shrink-0 cursor-pointer self-start whitespace-nowrap text-red-600 sm:self-center"
          >
            Request cancellation
          </button>
        </div>
      )}
      <CancellationRequestSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Request cancellation"
        explainer="The kitchen will review your request before they start cooking. If they approve it, they'll refund your payment."
        onSubmit={(input) => requestOrderCancellation(orderId, input)}
        onSubmitted={() => {
          setOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
