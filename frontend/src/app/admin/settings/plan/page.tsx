"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import {
  ApiError,
  getMyEligiblePlans,
  switchPlatformPlan,
  verifySwitchPlan,
  type EligiblePlansResponse,
} from "@/lib/api/admin-platform-plans";
import { getMyUsage, type UsageSummary } from "@/lib/api/tenant-limits";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { EligiblePlanCard } from "@/components/admin/EligiblePlanCard";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { loadRazorpayScript } from "@/lib/razorpay/load-checkout-script";
import { submitCancellationRequest } from "@/lib/api/platform-cancellation-requests";

// The backend + admin review flow for this are fully built and working —
// flip this to true to show the trigger below once you're ready to offer
// self-serve cancellation requests to tenants. No other change needed.
const CANCELLATION_REQUEST_ENABLED = false;

export default function MyPlanPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [eligible, setEligible] = useState<EligiblePlansResponse | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancelRequest, setSubmittingCancelRequest] = useState(false);

  function reload() {
    getMyEligiblePlans()
      .then(setEligible)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load plans."),
      );
    getMyUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
  }

  useEffect(reload, []);

  function handleSwitch(planId: string, planName: string, isUpgrade: boolean) {
    confirm({
      message: isUpgrade
        ? `Switch to ${planName}? You'll complete a quick payment and it takes effect right away. This cannot be undone once confirmed.`
        : `Switch to ${planName}? You'll authorize the new plan now, but it only takes effect at the end of your current billing cycle. This cannot be undone once confirmed — Razorpay does not support cancelling a scheduled switch.`,
      confirmLabel: isUpgrade ? "Upgrade" : "Switch",
      processingLabel: "Opening payment…",
      onConfirm: async () => {
        setSwitchingId(planId);
        try {
          const checkout = await switchPlatformPlan(planId);
          await loadRazorpayScript();
          const razorpay = new window.Razorpay({
            key: checkout.razorpayKeyId,
            subscription_id: checkout.razorpaySubscriptionId,
            name: planName,
            description: `Switch to ${checkout.planCode}`,
            handler: (response) => {
              verifySwitchPlan({
                planId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySubscriptionId:
                  response.razorpay_subscription_id ?? checkout.razorpaySubscriptionId,
                razorpaySignature: response.razorpay_signature,
              })
                .then((result) => {
                  showToast(
                    result.scheduled
                      ? "Switch scheduled for the end of your current cycle."
                      : "Plan switched — the new limits are active now.",
                    "success",
                  );
                  reload();
                })
                .catch((err: unknown) =>
                  showToast(
                    err instanceof ApiError ? err.message : "Payment verification failed.",
                    "error",
                  ),
                )
                .finally(() => setSwitchingId(null));
            },
            modal: {
              ondismiss: () => setSwitchingId(null),
            },
          });
          razorpay.open();
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't start the switch.", "error");
          setSwitchingId(null);
        }
      },
    });
  }

  async function handleSubmitCancellationRequest() {
    if (!cancelReason.trim()) return;
    setSubmittingCancelRequest(true);
    try {
      await submitCancellationRequest(cancelReason.trim());
      showToast("Request sent — our team will reach out to you shortly.", "success");
      setShowCancelForm(false);
      setCancelReason("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't send your request.", "error");
    } finally {
      setSubmittingCancelRequest(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <Gauge className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">My Plan</h2>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!eligible ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-32 w-full" />
        </div>
      ) : (
        <>
          <div className="card flex flex-col gap-2 p-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Current plan</h3>
            <p className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatPriceFromPaise(eligible.currentAmountInPaise)}
            </p>
            {usage && (
              <div className="mt-2 grid grid-cols-1 gap-3 text-xs text-zinc-500 sm:grid-cols-2 dark:text-zinc-400">
                <p>
                  Orders this month: {usage.orders.used}
                  {usage.orders.max !== null ? ` / ${usage.orders.max}` : " (unlimited)"}
                </p>
                <p>
                  Active subscribers: {usage.subscribers.used}
                  {usage.subscribers.max !== null ? ` / ${usage.subscribers.max}` : " (unlimited)"}
                </p>
              </div>
            )}
          </div>

          {eligible.cancelAtPeriodEnd ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3.5 py-2.5 text-sm dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-amber-700 dark:text-amber-400">
                Your plan is cancelling
                {eligible.cancelsOn && ` on ${new Date(eligible.cancelsOn).toLocaleDateString()}`}.
                Plan switching is disabled until then.
              </p>
            </div>
          ) : (
            <>
              {eligible.pendingSwitch && (
                <div className="rounded-lg border border-sky-200 bg-sky-50/50 px-3.5 py-2.5 text-sm dark:border-sky-900 dark:bg-sky-950/30">
                  <p className="text-sky-700 dark:text-sky-400">
                    Switching to <strong>{eligible.pendingSwitch.planName}</strong>
                    {eligible.pendingSwitch.changeAt &&
                      ` on ${new Date(eligible.pendingSwitch.changeAt).toLocaleDateString()}`}
                    . This can&apos;t be cancelled — Razorpay doesn&apos;t support undoing a
                    scheduled switch. Picking a different plan below replaces it.
                  </p>
                </div>
              )}

              {eligible.plans.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No other plans available to switch to right now.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {eligible.plans.map((plan) => (
                    <EligiblePlanCard
                      key={plan.id}
                      plan={plan}
                      busy={switchingId === plan.id}
                      onSwitch={() => handleSwitch(plan.id, plan.name, plan.isUpgrade)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {CANCELLATION_REQUEST_ENABLED && !eligible.cancelAtPeriodEnd && (
            <div className="card flex flex-col gap-3 p-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Want to cancel?
              </h3>
              {showCancelForm ? (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Tell us why — we'll reach out before anything is cancelled.
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="input w-full resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSubmitCancellationRequest}
                      disabled={submittingCancelRequest || !cancelReason.trim()}
                      className="btn-primary btn-sm self-start"
                    >
                      {submittingCancelRequest ? "Sending…" : "Send request"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelForm(false)}
                      className="btn-ghost btn-sm self-start"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCancelForm(true)}
                  className="btn-outline btn-sm w-fit text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Request cancellation
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
