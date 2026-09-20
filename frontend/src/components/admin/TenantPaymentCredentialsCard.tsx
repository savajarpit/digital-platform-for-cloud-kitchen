"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { ApiError, updateTenantPayment, type TenantDetail } from "@/lib/api/platform";
import { useToast } from "@/context/ToastContext";
import { PasswordInput } from "@/components/ui/PasswordInput";

function toForm(tenant: TenantDetail) {
  return {
    keyId: tenant.paymentSettings?.razorpayKeyId ?? "",
    keySecret: "",
    webhookSecret: "",
  };
}
type PaymentForm = ReturnType<typeof toForm>;

export function TenantPaymentCredentialsCard({
  tenant,
  onSaved,
}: {
  tenant: TenantDetail;
  onSaved: (t: TenantDetail) => void;
}) {
  const { showToast } = useToast();
  const settings = tenant.paymentSettings;
  const [draft, setDraft] = useState<PaymentForm | null>(null);
  const form = draft ?? toForm(tenant);
  const { keyId, keySecret, webhookSecret } = form;
  const field =
    <K extends keyof PaymentForm>(key: K) =>
    (value: PaymentForm[K]) =>
      setDraft({ ...form, [key]: value });
  const setKeyId = field("keyId");
  const setKeySecret = field("keySecret");
  const setWebhookSecret = field("webhookSecret");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateTenantPayment(tenant.id, {
        razorpayKeyId: keyId || undefined,
        razorpayKeySecret: keySecret || undefined,
        razorpayWebhookSecret: webhookSecret || undefined,
      });
      onSaved({ ...tenant, paymentSettings: updated ?? tenant.paymentSettings });
      setDraft(null);
      showToast("Payment credentials saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save changes.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Payment Credentials (Razorpay)
        </h3>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        This tenant&apos;s own Razorpay account — used to charge their customers directly.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={keyId}
          onChange={(e) => setKeyId(e.target.value)}
          placeholder="Key ID"
          className="input w-full"
        />
        <PasswordInput
          value={keySecret}
          onChange={(e) => setKeySecret(e.target.value)}
          placeholder={settings?.razorpayKeySecretConfigured ? "Key secret (configured)" : "Key secret"}
          className="input w-full"
        />
        <PasswordInput
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          placeholder={
            settings?.razorpayWebhookSecretConfigured ? "Webhook secret (configured)" : "Webhook secret"
          }
          className="input w-full"
        />
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-fit">
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
