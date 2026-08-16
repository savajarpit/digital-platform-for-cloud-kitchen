"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, login } from "@/lib/api/auth";
import { OtpVerificationForm } from "@/components/auth/OtpVerificationForm";
import { FormField } from "@/components/auth/FormField";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/context/ToastContext";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { showToast } = useToast();

  const [unverifiedUserId, setUnverifiedUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      await login(String(form.get("email") ?? "").trim(), String(form.get("password") ?? ""));
      showToast("Welcome back!", "success");
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
      showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
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
      <div className="card w-full max-w-md p-8">
        {unverifiedUserId ? (
          <OtpVerificationForm
            userId={unverifiedUserId}
            hasWhatsapp={false}
            onVerified={handleVerified}
          />
        ) : (
          <>
            <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {t("loginSubtitle")}
            </h1>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <FormField id="email" name="email" type="email" label={t("email")} required autoComplete="email" />

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("password")}
                  </label>
                  <Link href="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                    {t("forgotPassword")}
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  className="input"
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary mt-2">
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
