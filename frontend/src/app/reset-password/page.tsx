"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, resetPassword } from "@/lib/api/auth";
import { FormField } from "@/components/auth/FormField";
import { useToast } from "@/context/ToastContext";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { showToast } = useToast();
  const token = useSearchParams().get("token");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      showToast(t("passwordMismatch"), "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      showToast(t("resetSuccess"), "success");
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="card w-full max-w-md p-8">
        <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("resetPasswordTitle")}
        </h1>

        {!token ? (
          <p className="mt-6 text-sm text-red-600 dark:text-red-400">{t("invalidResetLink")}</p>
        ) : success ? (
          <p className="mt-6 text-sm text-primary-700 dark:text-primary-400">{t("resetSuccess")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <FormField
              id="newPassword"
              name="newPassword"
              type="password"
              label={t("newPassword")}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <FormField
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label={t("confirmPassword")}
              required
              minLength={8}
              autoComplete="new-password"
            />

            <button type="submit" disabled={isSubmitting} className="btn-primary mt-2">
              {isSubmitting ? t("resetting") : t("resetPassword")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
