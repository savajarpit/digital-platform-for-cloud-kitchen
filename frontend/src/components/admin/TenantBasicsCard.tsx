"use client";

import { useState } from "react";
import { ApiError, updateTenant, type TenantDetail } from "@/lib/api/platform";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PLATFORM_ROOT_DOMAIN } from "@/lib/config/env";

function toForm(tenant: TenantDetail) {
  return {
    businessName: tenant.name,
    customDomain: tenant.customDomain ?? "",
    status: tenant.status,
    poweredByBrandingEnabled: tenant.poweredByBrandingEnabled,
  };
}
type BasicsForm = ReturnType<typeof toForm>;

export function TenantBasicsCard({
  tenant,
  onSaved,
}: {
  tenant: TenantDetail;
  onSaved: (t: TenantDetail) => void;
}) {
  const { showToast } = useToast();
  // Unsaved edits live in `draft`; a background refetch of the tenant never
  // overwrites them.
  const [draft, setDraft] = useState<BasicsForm | null>(null);
  const form = draft ?? toForm(tenant);
  const { businessName, customDomain, status, poweredByBrandingEnabled } = form;
  const field =
    <K extends keyof BasicsForm>(key: K) =>
    (value: BasicsForm[K]) =>
      setDraft({ ...form, [key]: value });
  const setBusinessName = field("businessName");
  const setCustomDomain = field("customDomain");
  const setStatus = field("status");
  const setPoweredByBrandingEnabled = field("poweredByBrandingEnabled");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateTenant(tenant.id, {
        businessName,
        customDomain: customDomain || undefined,
        status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
        poweredByBrandingEnabled,
      });
      onSaved({ ...tenant, ...updated });
      setDraft(null);
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
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3.5 py-2.5 dark:border-zinc-800">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            &ldquo;Powered by OkaySync&rdquo; branding
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Shown on this tenant&apos;s storefront footer and customer emails. Never editable by the
            tenant.
          </p>
        </div>
        <Toggle checked={poweredByBrandingEnabled} onChange={setPoweredByBrandingEnabled} />
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
