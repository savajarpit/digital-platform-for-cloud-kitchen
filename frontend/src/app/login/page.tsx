"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, login } from "@/lib/api/auth";
import { OtpVerificationForm } from "@/components/auth/OtpVerificationForm";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [unverifiedUserId, setUnverifiedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      await login(String(form.get("email") ?? "").trim(), String(form.get("password") ?? ""));
      router.push("/");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "ACCOUNT_NOT_VERIFIED") {
        const userId = err.extra?.userId;
        if (typeof userId === "string") {
          setUnverifiedUserId(userId);
          return;
        }
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleVerified() {
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {unverifiedUserId ? (
          <OtpVerificationForm
            userId={unverifiedUserId}
            hasWhatsapp={false}
            onVerified={handleVerified}
          />
        ) : (
          <>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {t("loginSubtitle")}
            </h1>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t("email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("password")}
                  </label>
                  <Link href="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                    {t("forgotPassword")}
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? t("loggingIn") : t("login")}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
              {t("noAccount")}{" "}
              <Link href="/signup" className="font-medium text-primary-600 hover:text-primary-700">
                {t("signupLink")}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
