"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard } from "lucide-react";
import {
  ApiError,
  getPaymentSettings,
  updatePaymentSettings,
  type PaymentSettings,
} from "@/lib/api/admin-settings";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";

function ConfiguredBadge({ configured }: { configured: boolean }) {
  if (!configured) return null;
  return (
    <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
      <CheckCircle2 className="h-3 w-3" />
      Configured
    </span>
  );
}

export default function PaymentSettingsPage() {
  const { showToast } = useToast();
  const canEdit = usePermission(PERMISSIONS.PAYMENT_EDIT);

  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPaymentSettings()
      .then((s) => {
        setSettings(s ?? ({ razorpayKeyId: null, razorpayKeySecretConfigured: false, razorpayWebhookSecretConfigured: false }));
        setKeyId(s?.razorpayKeyId ?? "");
      })
      .catch(() => setError("Couldn't load payment settings."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await updatePaymentSettings({
        razorpayKeyId: keyId || undefined,
        razorpayKeySecret: keySecret || undefined,
        razorpayWebhookSecret: webhookSecret || undefined,
      });
      setSettings(updated);
      setKeySecret("");
      setWebhookSecret("");
      showToast("Payment settings saved", "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <CreditCard className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Payment (Razorpay)
        </h2>
      </div>

      {!canEdit && <ViewOnlyNotice />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <fieldset disabled={!canEdit} className="flex flex-col gap-4 disabled:opacity-70">
        <div className="card flex flex-col gap-4 p-6">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            These are your own Razorpay account credentials — used to charge your customers
            directly. This is separate from your platform subscription billing.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Razorpay Key ID
            </label>
            <input
              type="text"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_live_xxxxx"
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Key secret
              <ConfiguredBadge configured={settings.razorpayKeySecretConfigured} />
            </label>
            <input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder={settings.razorpayKeySecretConfigured ? "Leave blank to keep current" : ""}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Webhook secret
              <ConfiguredBadge configured={settings.razorpayWebhookSecretConfigured} />
            </label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={settings.razorpayWebhookSecretConfigured ? "Leave blank to keep current" : ""}
              className="input w-full"
            />
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-fit">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </fieldset>
    </form>
  );
}
