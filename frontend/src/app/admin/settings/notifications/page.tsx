"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2 } from "lucide-react";
import {
  ApiError,
  getNotificationSettings,
  updateNotificationSettings,
  type EmailProvider,
  type NotificationSettings,
  type WhatsappProvider,
} from "@/lib/api/admin-settings";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Toggle } from "@/components/ui/Toggle";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettingsFormSkeleton } from "@/components/admin/skeletons/SettingsFormSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { PasswordInput } from "@/components/ui/PasswordInput";

const WHATSAPP_PROVIDERS: WhatsappProvider[] = ["INTERAKT", "AISENSY", "GUPSHUP", "TWILIO"];
const EMAIL_PROVIDERS: EmailProvider[] = ["SMTP", "RESEND"];

function ConfiguredBadge({ configured }: { configured: boolean }) {
  if (!configured) return null;
  return (
    <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
      <CheckCircle2 className="h-3 w-3" />
      Configured
    </span>
  );
}

// Secrets (API key, SMTP password...) are never returned by the API, so they
// always start blank; "configured" badges come from the settings flags.
type FormState = {
  whatsappEnabled: boolean;
  whatsappProvider: WhatsappProvider | "";
  whatsappApiKey: string;
  whatsappAccountSid: string;
  whatsappSenderNumber: string;
  ownerWhatsappNumber: string;
  emailEnabled: boolean;
  emailProvider: EmailProvider | "";
  emailFromAddress: string;
  emailFromName: string;
  ownerNotificationEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
};

function toForm(s: NotificationSettings | null): FormState {
  return {
    whatsappEnabled: s?.whatsappEnabled ?? false,
    whatsappProvider: s?.whatsappProvider ?? "",
    whatsappApiKey: "",
    whatsappAccountSid: "",
    whatsappSenderNumber: s?.whatsappSenderNumber ?? "",
    ownerWhatsappNumber: s?.ownerWhatsappNumber ?? "",
    emailEnabled: s?.emailEnabled ?? false,
    emailProvider: s?.emailProvider ?? "",
    emailFromAddress: s?.emailFromAddress ?? "",
    emailFromName: s?.emailFromName ?? "",
    ownerNotificationEmail: s?.ownerNotificationEmail ?? "",
    smtpHost: "",
    smtpPort: "",
    smtpSecure: false,
    smtpUser: "",
    smtpPassword: "",
  };
}

export default function NotificationsPage() {
  const { showToast } = useToast();
  const canEdit = usePermission(PERMISSIONS.NOTIFICATIONS_EDIT);

  const queryClient = useQueryClient();
  const queryKey = qk.admin("settings", "notifications");
  // `data` is null when nothing has been configured yet, so "loaded" means !== undefined.
  const { data, isError } = useQuery({
    queryKey,
    queryFn: getNotificationSettings,
    staleTime: STALE.list,
  });
  // Unsaved edits live in `draft`; a background refetch never overwrites them.
  const [draft, setDraft] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settings = data ?? ({} as NotificationSettings);
  const form = draft ?? (data !== undefined ? toForm(data) : null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setDraft((prev) => ({ ...(prev ?? toForm(data ?? null)), [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const {
      whatsappEnabled, whatsappProvider, whatsappApiKey, whatsappAccountSid, whatsappSenderNumber,
      ownerWhatsappNumber, emailEnabled, emailProvider, emailFromAddress, emailFromName,
      ownerNotificationEmail, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword,
    } = form;
    setError(null);
    setSaving(true);
    try {
      const hasSmtpInput = smtpHost || smtpPort || smtpUser || smtpPassword;
      const updated = await updateNotificationSettings({
        whatsappEnabled,
        whatsappProvider: whatsappProvider || undefined,
        whatsappApiKey: whatsappApiKey || undefined,
        ...(whatsappProvider === "TWILIO" && whatsappAccountSid
          ? { whatsappConfig: { accountSid: whatsappAccountSid } }
          : {}),
        whatsappSenderNumber: whatsappSenderNumber || undefined,
        ownerWhatsappNumber: ownerWhatsappNumber || undefined,
        emailEnabled,
        emailProvider: emailProvider || undefined,
        emailFromAddress: emailFromAddress || undefined,
        emailFromName: emailFromName || undefined,
        ownerNotificationEmail: ownerNotificationEmail || undefined,
        ...(hasSmtpInput
          ? {
              emailConfig: {
                host: smtpHost,
                port: Number(smtpPort) || 587,
                secure: smtpSecure,
                user: smtpUser || undefined,
                password: smtpPassword || undefined,
              },
            }
          : {}),
      });
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey });
      // Re-derives the form from the saved settings and blanks the secret inputs.
      setDraft(null);
      showToast("Notification settings saved", "success");
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
      <EmptyState compact icon={Bell} title="Couldn't load notification settings." />
    ) : (
      <SettingsFormSkeleton cards={2} fields={4} columns={2} />
    );
  }

  const {
    whatsappEnabled, whatsappProvider, whatsappApiKey, whatsappAccountSid, whatsappSenderNumber,
    ownerWhatsappNumber, emailEnabled, emailProvider, emailFromAddress, emailFromName,
    ownerNotificationEmail, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword,
  } = form;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <Bell className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Notifications
        </h2>
      </div>

      {!canEdit && <ViewOnlyNotice />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <fieldset disabled={!canEdit} className="flex flex-col gap-6 disabled:opacity-70">
        <div className="card flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">WhatsApp</h3>
            <Toggle checked={whatsappEnabled} onChange={(v) => set("whatsappEnabled", v)} disabled={!canEdit} />
          </div>
          {whatsappEnabled && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Provider
                </label>
                <Select
                  value={whatsappProvider}
                  onValueChange={(v) => set("whatsappProvider", v as WhatsappProvider)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Select provider…</SelectItem>
                    {WHATSAPP_PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {whatsappProvider === "TWILIO" ? "Auth Token" : "API key"}
                  <ConfiguredBadge configured={settings.whatsappApiKeyConfigured} />
                </label>
                <PasswordInput
                  value={whatsappApiKey}
                  onChange={(e) => set("whatsappApiKey", e.target.value)}
                  placeholder={settings.whatsappApiKeyConfigured ? "Leave blank to keep current" : ""}
                  className="input w-full"
                />
              </div>
              {whatsappProvider === "TWILIO" && (
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Account SID
                    <ConfiguredBadge configured={settings.whatsappConfigConfigured} />
                  </label>
                  <input
                    type="text"
                    value={whatsappAccountSid}
                    onChange={(e) => set("whatsappAccountSid", e.target.value)}
                    placeholder={
                      settings.whatsappConfigConfigured ? "Leave blank to keep current" : "ACxxxxxxxxxxxxxxxx"
                    }
                    className="input w-full font-mono"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Sender number
                </label>
                <input
                  type="tel"
                  value={whatsappSenderNumber}
                  onChange={(e) => set("whatsappSenderNumber", e.target.value)}
                  placeholder="e.g. +14155238886 for Twilio sandbox, or your WhatsApp Business number"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Owner alert number
                </label>
                <PhoneInput value={ownerWhatsappNumber} onChange={(v) => set("ownerWhatsappNumber", v)} />
              </div>
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Email</h3>
            <Toggle checked={emailEnabled} onChange={(v) => set("emailEnabled", v)} disabled={!canEdit} />
          </div>
          {emailEnabled && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Provider
                  </label>
                  <Select value={emailProvider} onValueChange={(v) => set("emailProvider", v as EmailProvider)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Select provider…</SelectItem>
                      {EMAIL_PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    From address
                  </label>
                  <input
                    type="email"
                    value={emailFromAddress}
                    onChange={(e) => set("emailFromAddress", e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    From name
                  </label>
                  <input
                    type="text"
                    value={emailFromName}
                    onChange={(e) => set("emailFromName", e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Owner alert email
                  </label>
                  <input
                    type="email"
                    value={ownerNotificationEmail}
                    onChange={(e) => set("ownerNotificationEmail", e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              {emailProvider === "SMTP" && (
                <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                      SMTP connection
                    </h4>
                    <ConfiguredBadge configured={settings.emailConfigConfigured} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Host
                      </label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => set("smtpHost", e.target.value)}
                        placeholder={settings.emailConfigConfigured ? "Leave blank to keep current" : "smtp.gmail.com"}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Port
                      </label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => set("smtpPort", e.target.value)}
                        placeholder="587"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Username
                      </label>
                      <input
                        type="text"
                        value={smtpUser}
                        onChange={(e) => set("smtpUser", e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Password
                      </label>
                      <PasswordInput
                        value={smtpPassword}
                        onChange={(e) => set("smtpPassword", e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle checked={smtpSecure} onChange={(v) => set("smtpSecure", v)} disabled={!canEdit} />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Use TLS (secure)</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-fit">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </fieldset>
    </form>
  );
}
