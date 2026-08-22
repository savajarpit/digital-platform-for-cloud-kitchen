"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  getActivationInvite,
  verifyActivation,
  type ActivationInvite,
} from "@/lib/api/platform-activation";
import { loadRazorpayScript } from "@/lib/razorpay/load-checkout-script";
import { formatPriceFromPaise } from "@/lib/format/currency";

export default function ActivateTenantPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [invite, setInvite] = useState<ActivationInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    getActivationInvite(token)
      .then(setInvite)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "This activation link isn't valid."),
      );
  }, [token]);

  async function handlePay() {
    if (!invite) return;
    setPaying(true);
    setError(null);
    try {
      await loadRazorpayScript();
      const razorpay = new window.Razorpay({
        key: invite.razorpayKeyId,
        subscription_id: invite.razorpaySubscriptionId,
        name: invite.businessName,
        description: `${invite.planCode} plan — ${invite.billingCycle === "MONTHLY" ? "monthly" : "yearly"}`,
        handler: (response) => {
          verifyActivation(token, {
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySubscriptionId: response.razorpay_subscription_id ?? invite.razorpaySubscriptionId,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => setActivated(true))
            .catch((err: unknown) =>
              setError(err instanceof ApiError ? err.message : "Payment verification failed."),
            )
            .finally(() => setPaying(false));
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });
      razorpay.open();
    } catch {
      setError("Could not start payment — please try again in a moment.");
      setPaying(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="card w-full max-w-md p-8">
        {activated ? (
          <div className="text-center">
            <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
              You&rsquo;re activated 🎉
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Your business is now live on the platform.
            </p>
            <Link href="/login" className="btn-primary mt-6 w-full">
              Go to login
            </Link>
          </div>
        ) : error && !invite ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        ) : !invite ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Activate {invite.businessName}
            </h1>
            <div className="mt-6 flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Plan</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{invite.planCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Billing</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {invite.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Amount</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {formatPriceFromPaise(invite.amountInPaise)}
                </span>
              </div>
            </div>
            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handlePay}
              disabled={paying}
              className="btn-primary mt-6 w-full disabled:cursor-not-allowed"
            >
              {paying ? "Processing…" : "Pay & Activate"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
