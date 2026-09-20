"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Package, User as UserIcon } from "lucide-react";
import { ApiError, getMyProfile, updateMyProfile, type Profile } from "@/lib/api/users";
import { qk, STALE } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/account/PageHeader";
import { ProfileSkeleton } from "@/components/account/ProfileSkeleton";
import { ChangePasswordCard } from "@/components/account/ChangePasswordCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PhoneInput } from "@/components/ui/PhoneInput";

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
}

function toForm(profile: Profile): ProfileForm {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName ?? "",
    phone: profile.phone ?? "",
  };
}

export default function ProfilePage() {
  const t = useTranslations("profile");
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Only changes when this customer saves it (which updates the cache), so
  // it stays fresh for a long time and revisits render instantly.
  const {
    data: profile,
    isPending,
    error: loadError,
  } = useQuery({
    queryKey: qk.profile.all,
    queryFn: getMyProfile,
    staleTime: STALE.long,
  });
  const unauthorized = loadError instanceof ApiError && loadError.status === 401;

  // Draft pattern: `draft` holds the user's unsaved edits (null = untouched),
  // so a background refetch can never overwrite what they're typing.
  const [draft, setDraft] = useState<ProfileForm | null>(null);
  const form = draft ?? (profile ? toForm(profile) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unauthorized) router.push("/login?redirect=/account/profile");
  }, [unauthorized, router]);

  function update(patch: Partial<ProfileForm>) {
    if (form) setDraft({ ...form, ...patch });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      queryClient.setQueryData(qk.profile.all, updated);
      void queryClient.invalidateQueries({ queryKey: qk.profile.all });
      setDraft(null);
      showToast(t("saved"), "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  function renderBody() {
    // A failed background refetch keeps showing the cached profile; the error
    // state is only for "nothing to show at all".
    if (!profile || !form) {
      if (isPending || unauthorized) return <ProfileSkeleton />;
      return (
        <EmptyState
          icon={UserIcon}
          title="Couldn't load your profile"
          description="Please try again in a moment."
        />
      );
    }
    return (
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
            <div className="flex items-center gap-2 text-primary-600">
              <UserIcon className="h-5 w-5" />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("personalInfo")}</h2>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("email")}
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="input w-full cursor-not-allowed opacity-60"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t("emailLockedHint")}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t("firstName")}
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => update({ firstName: e.target.value })}
                  required
                  minLength={2}
                  maxLength={50}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t("lastName")}
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => update({ lastName: e.target.value })}
                  maxLength={50}
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("phone")}
              </label>
              <PhoneInput
                value={form.phone}
                onChange={(phone) => update({ phone })}
                autoComplete="tel"
              />
            </div>

            <button type="submit" disabled={saving} className="btn-primary mt-2 w-fit">
              {saving ? t("saving") : t("save")}
            </button>
          </form>

          <ChangePasswordCard />
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/orders"
            className="card flex items-center gap-3 p-5 transition-colors hover:border-primary-300"
          >
            <Package className="h-5 w-5 text-primary-600" />
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t("myOrders")}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("myOrdersHint")}</p>
            </div>
          </Link>
          <Link
            href="/account/addresses"
            className="card flex items-center gap-3 p-5 transition-colors hover:border-primary-300"
          >
            <MapPin className="h-5 w-5 text-primary-600" />
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t("myAddresses")}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("myAddressesHint")}</p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="container-app flex-1 py-10">
      <PageHeader icon={UserIcon} title={t("title")} />
      {renderBody()}
    </main>
  );
}
