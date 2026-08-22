"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Building2, CreditCard, KeyRound, Puzzle, Receipt } from "lucide-react";
import {
  ApiError,
  cancelSubscriptionAtPeriodEnd,
  getRoleGrants,
  getTenant,
  getTenantFeatures,
  listTenantInvoices,
  manualActivateTenant,
  setFeatureGrant,
  setPermissionGrant,
  updateTenant,
  updateTenantNotifications,
  updateTenantPayment,
  type FeatureGrant,
  type PermissionGrant,
  type PlatformInvoice,
  type TenantDetail,
} from "@/lib/api/platform";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { PLATFORM_ROOT_DOMAIN } from "@/lib/config/env";
import { TenantLimitsCard } from "@/components/admin/TenantLimitsCard";
import { CreateInviteForm } from "@/components/admin/CreateInviteForm";

const ROLES = ["OWNER", "STAFF"] as const;

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTenant(id)
      .then(setTenant)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Couldn't load tenant."));
  }, [id]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/platform/tenants"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tenants
      </Link>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!tenant ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-32 w-full" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-primary-600">
            <Building2 className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {tenant.businessProfile?.displayName ?? tenant.name}
            </h2>
          </div>

          <BasicsCard tenant={tenant} onSaved={setTenant} />
          <BillingCard tenant={tenant} onSaved={setTenant} />
          <NotificationCredentialsCard tenant={tenant} onSaved={setTenant} />
          <PaymentCredentialsCard tenant={tenant} onSaved={setTenant} />
          <PermissionGridCard tenantId={id} />
          <FeatureGridCard tenantId={id} />
          <TenantLimitsCard tenantId={id} />
        </>
      )}
    </div>
  );
}

function BasicsCard({
  tenant,
  onSaved,
}: {
  tenant: TenantDetail;
  onSaved: (t: TenantDetail) => void;
}) {
  const { showToast } = useToast();
  const [businessName, setBusinessName] = useState(tenant.name);
  const [customDomain, setCustomDomain] = useState(tenant.customDomain ?? "");
  const [status, setStatus] = useState(tenant.status);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateTenant(tenant.id, {
        businessName,
        customDomain: customDomain || undefined,
        status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
      });
      onSaved({ ...tenant, ...updated });
      showToast("Tenant updated", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save changes.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Basics</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Business name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Custom domain
          </label>
          <input
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Status
          </label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        Owner login: <span className="font-mono">{tenant.users[0]?.email ?? "—"}</span>
      </div>
      <LiveAtLine tenant={tenant} />
      <button type="submit" disabled={saving} className="btn-primary w-fit">
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function LiveAtLine({ tenant }: { tenant: TenantDetail }) {
  if (tenant.customDomain) {
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        Live at:{" "}
        <a
          href={`https://${tenant.customDomain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-primary-600 hover:text-primary-700"
        >
          {tenant.customDomain}
        </a>
      </div>
    );
  }

  if (!PLATFORM_ROOT_DOMAIN) {
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        Live at: no custom domain set, and no platform subdomain configured yet.
      </div>
    );
  }

  const subdomain = `${tenant.slug}.${PLATFORM_ROOT_DOMAIN}`;
  return (
    <div className="text-xs text-zinc-500 dark:text-zinc-400">
      Live at:{" "}
      <a
        href={`https://${subdomain}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-primary-600 hover:text-primary-700"
      >
        {subdomain}
      </a>{" "}
      (no custom domain set)
    </div>
  );
}

const SUBSCRIPTION_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  PENDING_PAYMENT: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  PAST_DUE: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  CANCELLED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

function BillingCard({
  tenant,
  onSaved,
}: {
  tenant: TenantDetail;
  onSaved: (t: TenantDetail) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const subscription = tenant.platformSubscription;
  const [invoices, setInvoices] = useState<PlatformInvoice[] | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!subscription) return;
    listTenantInvoices(tenant.id)
      .then(setInvoices)
      .catch(() => showToast("Couldn't load invoices.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id, subscription?.status]);

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

          {subscription.status === "ACTIVE" &&
            !subscription.cancelAtPeriodEnd &&
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

          {subscription.status !== "ACTIVE" && (
            <button type="button" onClick={handleManualActivate} className="btn-outline btn-sm w-fit">
              Manual Activate
            </button>
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
            <Skeleton className="h-20 w-full" />
          ) : invoices.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No charges yet.</p>
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

function NotificationCredentialsCard({
  tenant,
  onSaved,
}: {
  tenant: TenantDetail;
  onSaved: (t: TenantDetail) => void;
}) {
  const { showToast } = useToast();
  const settings = tenant.notificationSettings;
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings?.whatsappEnabled ?? false);
  const [whatsappProvider, setWhatsappProvider] = useState(settings?.whatsappProvider ?? "");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [whatsappSenderNumber, setWhatsappSenderNumber] = useState(
    settings?.whatsappSenderNumber ?? "",
  );
  const [ownerWhatsappNumber, setOwnerWhatsappNumber] = useState(
    settings?.ownerWhatsappNumber ?? "",
  );
  const [emailEnabled, setEmailEnabled] = useState(settings?.emailEnabled ?? false);
  const [emailProvider, setEmailProvider] = useState(settings?.emailProvider ?? "");
  const [emailFromAddress, setEmailFromAddress] = useState(settings?.emailFromAddress ?? "");
  const [emailFromName, setEmailFromName] = useState(settings?.emailFromName ?? "");
  const [ownerNotificationEmail, setOwnerNotificationEmail] = useState(
    settings?.ownerNotificationEmail ?? "",
  );
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
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
      setWhatsappApiKey("");
      setSmtpHost("");
      setSmtpPort("");
      setSmtpUser("");
      setSmtpPassword("");
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
          <input
            type="tel"
            value={ownerWhatsappNumber}
            onChange={(e) => setOwnerWhatsappNumber(e.target.value)}
            placeholder="Owner alert number"
            className="input w-full"
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

function PaymentCredentialsCard({
  tenant,
  onSaved,
}: {
  tenant: TenantDetail;
  onSaved: (t: TenantDetail) => void;
}) {
  const { showToast } = useToast();
  const settings = tenant.paymentSettings;
  const [keyId, setKeyId] = useState(settings?.razorpayKeyId ?? "");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
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
      setKeySecret("");
      setWebhookSecret("");
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

function PermissionGridCard({ tenantId }: { tenantId: string }) {
  const [role, setRole] = useState<(typeof ROLES)[number]>("OWNER");

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Role Permissions
        </h3>
      </div>

      <div className="flex gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              role === r
                ? "bg-primary-600 text-white"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Keyed by role so switching tabs remounts fresh (grants starts at
          null again) instead of needing a synchronous setState-to-null
          inside the effect, which react-hooks/set-state-in-effect forbids. */}
      <RoleGrantsList key={role} tenantId={tenantId} role={role} />
    </div>
  );
}

function RoleGrantsList({
  tenantId,
  role,
}: {
  tenantId: string;
  role: (typeof ROLES)[number];
}) {
  const { showToast } = useToast();
  const [grants, setGrants] = useState<PermissionGrant[] | null>(null);

  useEffect(() => {
    getRoleGrants(tenantId, role)
      .then(setGrants)
      .catch(() => showToast("Couldn't load permissions.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, role]);

  async function toggle(grant: PermissionGrant) {
    const next = !grant.granted;
    setGrants((prev) =>
      prev ? prev.map((g) => (g.key === grant.key ? { ...g, granted: next } : g)) : prev,
    );
    try {
      await setPermissionGrant(tenantId, role, grant.key, next);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update permission.", "error");
      setGrants((prev) =>
        prev ? prev.map((g) => (g.key === grant.key ? { ...g, granted: !next } : g)) : prev,
      );
    }
  }

  if (!grants) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="flex flex-col gap-2">
      {grants.map((grant) => (
        <div
          key={grant.key}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
        >
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {grant.description}
            </p>
            <p className="font-mono text-xs text-zinc-400">{grant.key}</p>
          </div>
          <Toggle checked={grant.granted} onChange={() => toggle(grant)} />
        </div>
      ))}
    </div>
  );
}

function FeatureGridCard({ tenantId }: { tenantId: string }) {
  const { showToast } = useToast();
  const [features, setFeatures] = useState<FeatureGrant[] | null>(null);

  useEffect(() => {
    getTenantFeatures(tenantId)
      .then(setFeatures)
      .catch(() => showToast("Couldn't load features.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function toggle(feature: FeatureGrant) {
    const next = !feature.enabled;
    setFeatures((prev) =>
      prev ? prev.map((f) => (f.key === feature.key ? { ...f, enabled: next } : f)) : prev,
    );
    try {
      await setFeatureGrant(tenantId, feature.key, next);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update feature.", "error");
      setFeatures((prev) =>
        prev ? prev.map((f) => (f.key === feature.key ? { ...f, enabled: !next } : f)) : prev,
      );
    }
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Puzzle className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Feature Entitlement
        </h3>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Which whole features this tenant has access to at all — separate from role permissions
        above.
      </p>

      {!features ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="flex flex-col gap-2">
          {features.map((feature) => (
            <div
              key={feature.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {feature.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{feature.description}</p>
              </div>
              <Toggle checked={feature.enabled} onChange={() => toggle(feature)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

