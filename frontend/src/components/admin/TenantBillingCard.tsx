"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import {
  ApiError,
  cancelSubscriptionAtPeriodEnd,
  getTenant,
  listTenantInvoices,
  manualActivateTenant,
  type TenantDetail,
} from "@/lib/api/platform";
import { qk, STALE } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { CreateInviteForm } from "@/components/admin/CreateInviteForm";

const SUBSCRIPTION_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  PENDING_PAYMENT: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  PAST_DUE: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  CANCELLED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export function TenantBillingCard({
  tenant,
  onSaved,
}: {
  tenant: TenantDetail;
  onSaved: (t: TenantDetail) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const subscription = tenant.platformSubscription;
  const [activationUrl, setActivationUrl] = useState<string | null>(null);

  // Cached per tenant; onSaved / CreateInviteForm invalidate the whole tenant
  // subtree, so a status change refetches the charges too.
  const invoicesQuery = useQuery({
    queryKey: qk.admin("platform", "tenants", tenant.id, "invoices"),
    queryFn: () => listTenantInvoices(tenant.id),
    enabled: Boolean(subscription),
    staleTime: STALE.short,
  });
  const invoices = invoicesQuery.data;

  function handleManualActivate() {
    confirm({
      message: "Manually activate this tenant? This skips the invite/payment flow entirely — use for comped or offline-paid accounts.",
      confirmLabel: "Activate",
      processingLabel: "Activating…",
      onConfirm: async () => {
        try {
          await manualActivateTenant(tenant.id);
          const refreshed = await getTenant(tenant.id);
          onSaved(refreshed);
          showToast("Tenant activated", "success");
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't activate tenant.", "error");
        }
      },
    });
  }

  async function handleCopyLink() {
    if (!activationUrl) return;
    await navigator.clipboard.writeText(activationUrl);
    showToast("Link copied", "success");
  }

  function handleCancel() {
    confirm({
      message:
        "Schedule cancellation for this subscription? It stays active and keeps billing until the end of the current period, then cancels automatically — it won't cut the tenant off immediately. This cannot be undone once confirmed — Razorpay does not support reversing a scheduled cancellation.",
      confirmLabel: "Schedule Cancellation",
      processingLabel: "Scheduling…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await cancelSubscriptionAtPeriodEnd(tenant.id);
          const refreshed = await getTenant(tenant.id);
          onSaved(refreshed);
          showToast("Cancellation scheduled for end of period", "success");
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't schedule cancellation.", "error");
        }
      },
    });
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Platform Billing
        </h3>
      </div>

      {subscription ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`badge ${SUBSCRIPTION_STATUS_STYLES[subscription.status] ?? ""}`}
            >
              {subscription.status.replace(/_/g, " ")}
            </span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {subscription.planCode} — {formatPriceFromPaise(subscription.amountInPaise)}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {subscription.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}
            </span>
          </div>

          {subscription.trialEndsAt && new Date(subscription.trialEndsAt) > new Date() && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3.5 py-2.5 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
              <span className="text-emerald-700 dark:text-emerald-400">
                On trial — first charge on{" "}
                {new Date(subscription.trialEndsAt).toLocaleDateString()}.
              </span>
            </div>
          )}

          {subscription.status === "ACTIVE" &&
            !subscription.cancelAtPeriodEnd &&
            !(subscription.trialEndsAt && new Date(subscription.trialEndsAt) > new Date()) &&
            subscription.currentPeriodEnd && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Upcoming invoice: {formatPriceFromPaise(subscription.amountInPaise)} on{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                {subscription.scheduledPlan && " (before the scheduled plan change below)"}
              </p>
            )}

          {subscription.scheduledPlan && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/50 px-3.5 py-2.5 text-sm dark:border-sky-900 dark:bg-sky-950/30">
              <span className="text-sky-700 dark:text-sky-400">
                Switching to <strong>{subscription.scheduledPlan.name}</strong>
                {subscription.scheduledPlanChangeAt &&
                  ` on ${new Date(subscription.scheduledPlanChangeAt).toLocaleDateString()}`}
              </span>
            </div>
          )}

          {subscription.status === "PENDING_PAYMENT" && (
            <button type="button" onClick={handleManualActivate} className="btn-outline btn-sm w-fit">
              Manual Activate
            </button>
          )}

          {subscription.status !== "ACTIVE" && subscription.status !== "PENDING_PAYMENT" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                This subscription is {subscription.status.toLowerCase().replace(/_/g, " ")} — send a
                new activation link to properly resubscribe this tenant.
              </p>
              <CreateInviteForm tenantId={tenant.id} onCreated={(url) => setActivationUrl(url)} />
            </div>
          )}

          {subscription.status === "ACTIVE" && subscription.cancelAtPeriodEnd && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3.5 py-2.5 text-sm dark:border-amber-900 dark:bg-amber-950/30">
              <span className="text-amber-700 dark:text-amber-400">
                Cancels on{" "}
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : "the end of the current period"}
                . This can&apos;t be undone — Razorpay doesn&apos;t support reversing a scheduled
                cancellation.
              </span>
            </div>
          )}

          {subscription.status === "ACTIVE" && !subscription.cancelAtPeriodEnd && (
            <button type="button" onClick={handleCancel} className="btn-outline btn-sm w-fit text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950">
              Cancel Subscription
            </button>
          )}

          {!invoices ? (
            invoicesQuery.isError ? (
              <EmptyState compact title="Couldn't load invoices." />
            ) : (
              <div className="flex flex-col gap-2" aria-busy="true">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
                  >
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            )
          ) : invoices.length === 0 ? (
            <EmptyState compact title="No charges yet." />
          ) : (
            <div className="flex flex-col gap-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 text-sm dark:border-zinc-800"
                >
                  <div>
                    <span
                      className={
                        invoice.status === "PAID"
                          ? "font-medium text-primary-700 dark:text-primary-400"
                          : "font-medium text-red-700 dark:text-red-400"
                      }
                    >
                      {formatPriceFromPaise(invoice.amountInPaise)}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(invoice.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {invoice.invoiceUrl && (
                    <a
                      href={invoice.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      View invoice
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <CreateInviteForm
          tenantId={tenant.id}
          onCreated={(url) => setActivationUrl(url)}
        />
      )}

      {activationUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50/50 px-3.5 py-2.5 text-xs dark:border-primary-900 dark:bg-primary-950/30">
          <span className="flex-1 truncate font-mono text-zinc-700 dark:text-zinc-300">
            {activationUrl}
          </span>
          <button type="button" onClick={handleCopyLink} className="btn-ghost btn-sm shrink-0">
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
