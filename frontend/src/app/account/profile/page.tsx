"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MapPin, Package, User as UserIcon } from "lucide-react";
import { ApiError, getMyProfile, updateMyProfile, type Profile } from "@/lib/api/users";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/account/PageHeader";
import { ChangePasswordCard } from "@/components/account/ChangePasswordCard";
import { PhoneInput } from "@/components/ui/PhoneInput";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const router = useRouter();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setFirstName(p.firstName);
        setLastName(p.lastName ?? "");
        setPhone(p.phone ?? "");
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?redirect=/account/profile");
        }
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setProfile(updated);
      showToast(t("saved"), "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <main className="container-app flex-1 py-10">
        <Skeleton className="h-7 w-40" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card flex flex-col gap-4 p-6 lg:col-span-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-[70px] w-full" />
            <Skeleton className="h-[70px] w-full" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container-app flex-1 py-10">
      <PageHeader icon={UserIcon} title={t("title")} />

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
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
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
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={50}
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("phone")}
              </label>
              <PhoneInput value={phone} onChange={setPhone} autoComplete="tel" />
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
    </main>
  );
}
