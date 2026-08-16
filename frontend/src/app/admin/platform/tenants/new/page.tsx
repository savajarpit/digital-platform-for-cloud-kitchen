"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { ApiError, createTenant } from "@/lib/api/platform";
import { CreateInviteForm } from "@/components/admin/CreateInviteForm";
import { useToast } from "@/context/ToastContext";

export default function NewTenantPage() {
  const { showToast } = useToast();
  const [businessName, setBusinessName] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTenant, setCreatedTenant] = useState<{ id: string; name: string } | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { tenant } = await createTenant({
        businessName,
        customDomain: customDomain || undefined,
        ownerEmail,
        ownerPassword,
        ownerFirstName,
        ownerLastName: ownerLastName || undefined,
      });
      setCreatedTenant({ id: tenant.id, name: tenant.name });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create tenant.");
      setSaving(false);
    }
  }

  async function handleCopyLink() {
    if (!activationUrl) return;
    await navigator.clipboard.writeText(activationUrl);
    showToast("Link copied", "success");
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/platform/tenants"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tenants
      </Link>

      <div className="flex items-center gap-2 text-primary-600">
        <Building2 className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          New Tenant
        </h2>
      </div>

      {!createdTenant ? (
        <form onSubmit={handleSubmit} className="card flex max-w-xl flex-col gap-4 p-6">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Business name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              className="input w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Custom domain (optional)
            </label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="healthicious.in"
              className="input w-full"
            />
          </div>

          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Owner login
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Email
                </label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required
                  className="input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Temporary password
                </label>
                <input
                  type="text"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Share this with the owner directly"
                  className="input w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    First name
                  </label>
                  <input
                    type="text"
                    value={ownerFirstName}
                    onChange={(e) => setOwnerFirstName(e.target.value)}
                    required
                    minLength={2}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={ownerLastName}
                    onChange={(e) => setOwnerLastName(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            The owner won&apos;t get their own Razorpay/notification settings by default — you set
            those directly on the tenant&apos;s page after creating it.
          </p>

          <button type="submit" disabled={saving} className="btn-primary mt-2 w-fit">
            {saving ? "Creating…" : "Create Tenant"}
          </button>
        </form>
      ) : (
        <div className="card flex max-w-xl flex-col gap-4 p-6">
          <div className="flex items-center gap-2 text-primary-600">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {createdTenant.name} created
            </p>
          </div>

          {activationUrl ? (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Activation email sent — the owner can also use this link directly:
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50/50 px-3.5 py-2.5 text-xs dark:border-primary-900 dark:bg-primary-950/30">
                <span className="flex-1 truncate font-mono text-zinc-700 dark:text-zinc-300">
                  {activationUrl}
                </span>
                <button type="button" onClick={handleCopyLink} className="btn-ghost btn-sm shrink-0">
                  Copy
                </button>
              </div>
              <Link
                href={`/admin/platform/tenants/${createdTenant.id}`}
                className="btn-primary mt-2 w-fit"
              >
                Go to tenant
              </Link>
            </>
          ) : (
            <>
              <CreateInviteForm
                tenantId={createdTenant.id}
                onCreated={(url) => setActivationUrl(url)}
              />
              <Link
                href={`/admin/platform/tenants/${createdTenant.id}`}
                className="mt-1 w-fit text-xs text-zinc-500 hover:text-primary-600 dark:text-zinc-400"
              >
                Skip for now — go to tenant
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
