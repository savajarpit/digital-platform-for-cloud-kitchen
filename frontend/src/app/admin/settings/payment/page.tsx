"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettingsFormSkeleton } from "@/components/admin/skeletons/SettingsFormSkeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { PasswordInput } from "@/components/ui/PasswordInput";

function ConfiguredBadge({ configured }: { configured: boolean }) {
  if (!configured) return null;
  return (
    <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
      <CheckCircle2 className="h-3 w-3" />
      Configured
    </span>
  );
}

type FormState = { keyId: string; keySecret: string; webhookSecret: string };

const EMPTY_SETTINGS: PaymentSettings = {
  razorpayKeyId: null,
  razorpayKeySecretConfigured: false,
  razorpayWebhookSecretConfigured: false,
};

function toForm(s: PaymentSettings | null): FormState {
  return { keyId: s?.razorpayKeyId ?? "", keySecret: "", webhookSecret: "" };
}

export default function PaymentSettingsPage() {
  const { showToast } = useToast();
  const canEdit = usePermission(PERMISSIONS.PAYMENT_EDIT);

  const queryClient = useQueryClient();
  const queryKey = qk.admin("settings", "payment");
  // `data` is null when nothing is configured yet, so "loaded" means !== undefined.
  const { data, isError } = useQuery({
    queryKey,
    queryFn: getPaymentSettings,
    staleTime: STALE.list,
  });
  // Unsaved edits live in `draft`; a background refetch never overwrites them.
  // Secrets are never returned by the API, so they always start blank.
  const [draft, setDraft] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settings: PaymentSettings = data ?? EMPTY_SETTINGS;
  const form = draft ?? (data !== undefined ? toForm(data) : null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setDraft((prev) => ({ ...(prev ?? toForm(data ?? null)), [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { keyId, keySecret, webhookSecret } = form;
    setError(null);
    setSaving(true);
    try {
      const updated = await updatePaymentSettings({
        razorpayKeyId: keyId || undefined,
        razorpayKeySecret: keySecret || undefined,
        razorpayWebhookSecret: webhookSecret || undefined,
      });
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey });
      // Re-derives the form from the saved settings and blanks the secret inputs.
      setDraft(null);
      showToast("Payment settings saved", "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't save changes.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return isError ? (
      <EmptyState compact icon={CreditCard} title="Couldn't load payment settings." />
    ) : (
      <SettingsFormSkeleton cards={1} fields={3} columns={1} />
    );
  }
  const { keyId, keySecret, webhookSecret } = form;

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
              onChange={(e) => set("keyId", e.target.value)}
              placeholder="rzp_live_xxxxx"
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Key secret
              <ConfiguredBadge configured={settings.razorpayKeySecretConfigured} />
            </label>
            <PasswordInput
              value={keySecret}
              onChange={(e) => set("keySecret", e.target.value)}
              placeholder={settings.razorpayKeySecretConfigured ? "Leave blank to keep current" : ""}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Webhook secret
              <ConfiguredBadge configured={settings.razorpayWebhookSecretConfigured} />
            </label>
            <PasswordInput
              value={webhookSecret}
              onChange={(e) => set("webhookSecret", e.target.value)}
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
