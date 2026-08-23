"use client";

import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/Skeleton";
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

export default function NotificationsPage() {
  const { showToast } = useToast();
  const canEdit = usePermission(PERMISSIONS.NOTIFICATIONS_EDIT);

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappProvider, setWhatsappProvider] = useState<WhatsappProvider | "">("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [whatsappSenderNumber, setWhatsappSenderNumber] = useState("");
  const [ownerWhatsappNumber, setOwnerWhatsappNumber] = useState("");

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailProvider, setEmailProvider] = useState<EmailProvider | "">("");
  const [emailFromAddress, setEmailFromAddress] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [ownerNotificationEmail, setOwnerNotificationEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getNotificationSettings()
      .then((s) => {
        setSettings(s ?? ({} as NotificationSettings));
        if (!s) return;
        setWhatsappEnabled(s.whatsappEnabled);
        setWhatsappProvider(s.whatsappProvider ?? "");
        setWhatsappSenderNumber(s.whatsappSenderNumber ?? "");
        setOwnerWhatsappNumber(s.ownerWhatsappNumber ?? "");
        setEmailEnabled(s.emailEnabled);
        setEmailProvider(s.emailProvider ?? "");
        setEmailFromAddress(s.emailFromAddress ?? "");
        setEmailFromName(s.emailFromName ?? "");
        setOwnerNotificationEmail(s.ownerNotificationEmail ?? "");
      })
      .catch(() => setError("Couldn't load notification settings."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const hasSmtpInput = smtpHost || smtpPort || smtpUser || smtpPassword;
      const updated = await updateNotificationSettings({
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
                secure: smtpSecure,
                user: smtpUser || undefined,
                password: smtpPassword || undefined,
              },
            }
          : {}),
      });
      setSettings(updated);
      setWhatsappApiKey("");
      setSmtpHost("");
      setSmtpPort("");
      setSmtpUser("");
      setSmtpPassword("");
      showToast("Notification settings saved", "success");
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
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

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
            <Toggle checked={whatsappEnabled} onChange={setWhatsappEnabled} disabled={!canEdit} />
          </div>
          {whatsappEnabled && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Provider
                </label>
                <Select
                  value={whatsappProvider}
                  onValueChange={(v) => setWhatsappProvider(v as WhatsappProvider)}
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
                  API key
                  <ConfiguredBadge configured={settings.whatsappApiKeyConfigured} />
                </label>
                <PasswordInput
                  value={whatsappApiKey}
                  onChange={(e) => setWhatsappApiKey(e.target.value)}
                  placeholder={settings.whatsappApiKeyConfigured ? "Leave blank to keep current" : ""}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Sender number
                </label>
                <input
                  type="tel"
                  value={whatsappSenderNumber}
                  onChange={(e) => setWhatsappSenderNumber(e.target.value)}
                  placeholder="e.g. +14155238886 for Twilio sandbox, or your WhatsApp Business number"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Owner alert number
                </label>
                <PhoneInput value={ownerWhatsappNumber} onChange={setOwnerWhatsappNumber} />
              </div>
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Email</h3>
            <Toggle checked={emailEnabled} onChange={setEmailEnabled} disabled={!canEdit} />
          </div>
          {emailEnabled && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Provider
                  </label>
                  <Select value={emailProvider} onValueChange={(v) => setEmailProvider(v as EmailProvider)}>
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
                    onChange={(e) => setEmailFromAddress(e.target.value)}
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
                    onChange={(e) => setEmailFromName(e.target.value)}
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
                    onChange={(e) => setOwnerNotificationEmail(e.target.value)}
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
                        onChange={(e) => setSmtpHost(e.target.value)}
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
                        onChange={(e) => setSmtpPort(e.target.value)}
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
                        onChange={(e) => setSmtpUser(e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Password
                      </label>
                      <PasswordInput
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle checked={smtpSecure} onChange={setSmtpSecure} disabled={!canEdit} />
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
