"use client";

import { useEffect, useState } from "react";
import { ApiError, createSubscriptionInvite, type BillingCycle } from "@/lib/api/platform";
import { listPlatformPlansAdmin, type PlatformPlan } from "@/lib/api/admin-platform-plans";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { useToast } from "@/context/ToastContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

export function CreateInviteForm({
  tenantId,
  onCreated,
}: {
  tenantId: string;
  onCreated: (activationUrl: string) => void;
}) {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<PlatformPlan[] | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [manualEntry, setManualEntry] = useState(false);
  const [planCode, setPlanCode] = useState("STANDARD");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [amountRupees, setAmountRupees] = useState("999");
  const [trialDays, setTrialDays] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listPlatformPlansAdmin()
      .then((list) => {
        setPlans(list);
        if (list.length > 0) setSelectedPlanId(list[0].id);
        else setManualEntry(true);
      })
      .catch(() => setManualEntry(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { activationUrl } = await createSubscriptionInvite(tenantId, {
        ...(manualEntry
          ? {
              planCode,
              billingCycle,
              amountInPaise: Math.round(Number(amountRupees) * 100),
            }
          : { planId: selectedPlanId }),
        trialDays: trialDays ? Math.round(Number(trialDays)) : undefined,
      });
      onCreated(activationUrl);
      showToast("Activation invite created and emailed to the owner", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't create invite.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Pick a plan to email this tenant&apos;s owner an activation payment link.
      </p>

      {!manualEntry && plans && plans.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
            <SelectTrigger className="w-full sm:max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} — {formatPriceFromPaise(plan.priceInPaise)}/
                  {plan.billingCycle === "MONTHLY" ? "mo" : "yr"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setManualEntry(true)}
            className="btn-ghost btn-sm w-fit text-xs"
          >
            Enter a custom deal instead
          </button>
        </div>
      ) : plans === null ? (
        <div className="h-10 w-full max-w-xs animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
              placeholder="Plan code"
              required
              className="input w-full"
            />
            <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="number"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="₹ per cycle"
              min={1}
              required
              className="input w-full"
            />
          </div>
          {plans && plans.length > 0 && (
            <button
              type="button"
              onClick={() => setManualEntry(false)}
              className="btn-ghost btn-sm w-fit text-xs"
            >
              Pick from the plan catalog instead
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Free trial (days, optional)
        </label>
        <input
          type="number"
          value={trialDays}
          onChange={(e) => setTrialDays(e.target.value)}
          placeholder="e.g. 14 — leave blank for no trial"
          min={1}
          max={365}
          className="input w-full max-w-xs"
        />
        <p className="text-xs text-zinc-400">
          Tenant authorizes payment now but isn&apos;t charged until this many days out.
        </p>
      </div>

      <button
        type="submit"
        disabled={saving || (!manualEntry && !selectedPlanId)}
        className="btn-primary w-fit btn-sm"
      >
        {saving ? "Sending…" : "Send Activation Email"}
      </button>
    </form>
  );
}
