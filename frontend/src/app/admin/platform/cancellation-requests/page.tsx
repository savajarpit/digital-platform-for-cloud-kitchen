"use client";

import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";
import {
  ApiError,
  listCancellationRequests,
  updateCancellationRequestStatus,
  type PlatformCancellationRequest,
  type PlatformCancellationRequestStatus,
} from "@/lib/api/platform-cancellation-requests";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlatformCancellationRequestRow } from "@/components/admin/PlatformCancellationRequestRow";

export default function PlatformCancellationRequestsAdminPage() {
  const [requests, setRequests] = useState<PlatformCancellationRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    listCancellationRequests()
      .then(setRequests)
      .catch(() => setError("Couldn't load cancellation requests."));
  }, []);

  async function handleUpdateStatus(id: string, status: PlatformCancellationRequestStatus) {
    try {
      const updated = await updateCancellationRequestStatus(id, status);
      setRequests((prev) => prev?.map((r) => (r.id === id ? updated : r)) ?? null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update request.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <XCircle className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Cancellation Requests
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        A tenant asking to cancel — this never cancels anything by itself. Contact them, then
        actually schedule the cancellation (if it comes to that) from their own tenant page.
      </p>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!requests ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No cancellation requests yet.</p>
      ) : (
        <div className="card flex flex-col gap-2 p-6">
          {requests.map((request) => (
            <PlatformCancellationRequestRow
              key={request.id}
              request={request}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
