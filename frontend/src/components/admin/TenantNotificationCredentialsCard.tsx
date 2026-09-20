"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { ApiError, updateTenantNotifications, type TenantDetail } from "@/lib/api/platform";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PhoneInput } from "@/components/ui/PhoneInput";

function toForm(tenant: TenantDetail) {
  const settings = tenant.notificationSettings;
  return {
    whatsappEnabled: settings?.whatsappEnabled ?? false,
    whatsappProvider: settings?.whatsappProvider ?? "",
    whatsappApiKey: "",
    whatsappSenderNumber: settings?.whatsappSenderNumber ?? "",
    ownerWhatsappNumber: settings?.ownerWhatsappNumber ?? "",
    emailEnabled: settings?.emailEnabled ?? false,
    emailProvider: settings?.emailProvider ?? "",
    emailFromAddress: settings?.emailFromAddress ?? "",
    emailFromName: settings?.emailFromName ?? "",
    ownerNotificationEmail: settings?.ownerNotificationEmail ?? "",
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPassword: "",
  };
}
type NotificationForm = ReturnType<typeof toForm>;

export function TenantNotificationCredentialsCard({
  tenant,
  onSaved,
}: {
  tenant: TenantDetail;
  onSaved: (t: TenantDetail) => void;
}) {
  const { showToast } = useToast();
  const settings = tenant.notificationSettings;
  // Unsaved edits live in `draft`; a background refetch never overwrites them.
  const [draft, setDraft] = useState<NotificationForm | null>(null);
  const form = draft ?? toForm(tenant);
  const {
    whatsappEnabled,
    whatsappProvider,
    whatsappApiKey,
    whatsappSenderNumber,
    ownerWhatsappNumber,
    emailEnabled,
    emailProvider,
    emailFromAddress,
    emailFromName,
    ownerNotificationEmail,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPassword,
  } = form;
  const field =
    <K extends keyof NotificationForm>(key: K) =>
    (value: NotificationForm[K]) =>
      setDraft({ ...form, [key]: value });
  const setWhatsappEnabled = field("whatsappEnabled");
  const setWhatsappProvider = field("whatsappProvider");
  const setWhatsappApiKey = field("whatsappApiKey");
  const setWhatsappSenderNumber = field("whatsappSenderNumber");
  const setOwnerWhatsappNumber = field("ownerWhatsappNumber");
  const setEmailEnabled = field("emailEnabled");
  const setEmailProvider = field("emailProvider");
  const setEmailFromAddress = field("emailFromAddress");
  const setEmailFromName = field("emailFromName");
  const setOwnerNotificationEmail = field("ownerNotificationEmail");
  const setSmtpHost = field("smtpHost");
  const setSmtpPort = field("smtpPort");
  const setSmtpUser = field("smtpUser");
  const setSmtpPassword = field("smtpPassword");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const hasSmtpInput = smtpHost || smtpPort || smtpUser || smtpPassword;
      const updated = await updateTenantNotifications(tenant.id, {
        whatsappEnabled,
        whatsappProvider: whatsappProvider || undefined,
        whatsappApiKey: whatsappApiKey || undefined,
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
                secure: false,
                user: smtpUser || undefined,
                password: smtpPassword || undefined,
              },
            }
          : {}),
      });
      onSaved({ ...tenant, notificationSettings: updated ?? tenant.notificationSettings });
      setDraft(null);
      showToast("Notification credentials saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save changes.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Notification Credentials
        </h3>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        You set these directly — the tenant owner doesn&apos;t have edit access to this section
        by default.
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">WhatsApp</span>
        <Toggle checked={whatsappEnabled} onChange={setWhatsappEnabled} />
      </div>
      {whatsappEnabled && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select value={whatsappProvider} onValueChange={(v) => setWhatsappProvider(v as typeof whatsappProvider)}>
            <SelectTrigger>
              <SelectValue placeholder="Provider…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Provider…</SelectItem>
              <SelectItem value="INTERAKT">INTERAKT</SelectItem>
              <SelectItem value="AISENSY">AISENSY</SelectItem>
              <SelectItem value="GUPSHUP">GUPSHUP</SelectItem>
              <SelectItem value="TWILIO">TWILIO</SelectItem>
            </SelectContent>
          </Select>
          <PasswordInput
            value={whatsappApiKey}
            onChange={(e) => setWhatsappApiKey(e.target.value)}
            placeholder={settings?.whatsappApiKeyConfigured ? "API key (configured)" : "API key"}
            className="input w-full"
          />
          <input
            type="tel"
            value={whatsappSenderNumber}
            onChange={(e) => setWhatsappSenderNumber(e.target.value)}
            placeholder="Sender number"
            className="input w-full"
          />
          <PhoneInput
            value={ownerWhatsappNumber}
            onChange={setOwnerWhatsappNumber}
            placeholder="Owner alert no."
          />
        </div>
      )}

      <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</span>
        <Toggle checked={emailEnabled} onChange={setEmailEnabled} />
      </div>
      {emailEnabled && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select value={emailProvider} onValueChange={(v) => setEmailProvider(v as typeof emailProvider)}>
            <SelectTrigger>
              <SelectValue placeholder="Provider…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Provider…</SelectItem>
              <SelectItem value="SMTP">SMTP</SelectItem>
              <SelectItem value="RESEND">RESEND</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="email"
            value={emailFromAddress}
            onChange={(e) => setEmailFromAddress(e.target.value)}
            placeholder="From address"
            className="input w-full"
          />
          <input
            type="text"
            value={emailFromName}
            onChange={(e) => setEmailFromName(e.target.value)}
            placeholder="From name"
            className="input w-full"
          />
          <input
            type="email"
            value={ownerNotificationEmail}
            onChange={(e) => setOwnerNotificationEmail(e.target.value)}
            placeholder="Owner alert email"
            className="input w-full"
          />
          {emailProvider === "SMTP" && (
            <>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder={settings?.emailConfigConfigured ? "SMTP host (configured)" : "SMTP host"}
                className="input w-full"
              />
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="Port"
                className="input w-full"
              />
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="SMTP username"
                className="input w-full"
              />
              <PasswordInput
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="SMTP password"
                className="input w-full"
              />
            </>
          )}
        </div>
      )}

      <button type="submit" disabled={saving} className="btn-primary w-fit">
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
