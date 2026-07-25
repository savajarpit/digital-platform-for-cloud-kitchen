"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ApiError, forgotPassword } from "@/lib/api/auth";
import { FormField } from "@/components/auth/FormField";
import { useToast } from "@/context/ToastContext";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      await forgotPassword(String(form.get("email") ?? "").trim());
      showToast(t("resetLinkSent"), "success");
      setSent(true);
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
          {t("forgotPasswordTitle")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t("forgotPasswordSubtitle")}
        </p>

        {sent ? (
          <p className="mt-6 text-sm text-primary-700 dark:text-primary-400">
            {t("resetLinkSent")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <FormField id="email" name="email" type="email" label={t("email")} required autoComplete="email" />

            <button type="submit" disabled={isSubmitting} className="btn-primary mt-2">
              {isSubmitting ? t("sending") : t("sendResetLink")}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
