"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, register } from "@/lib/api/auth";
import { OtpVerificationForm } from "@/components/auth/OtpVerificationForm";

export default function SignupPage() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    const phoneValue = String(form.get("phone") ?? "").trim();
    setIsSubmitting(true);
    try {
      const result = await register({
        email: String(form.get("email") ?? "").trim(),
        password,
        firstName: String(form.get("firstName") ?? "").trim(),
        lastName: String(form.get("lastName") ?? "").trim() || undefined,
        phone: phoneValue || undefined,
      });
      setPhone(phoneValue);
      setUserId(result.userId);
      setStep("otp");
    } catch (err) {
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
        {step === "form" ? (
          <>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {t("signupSubtitle")}
            </h1>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Field id="firstName" name="firstName" label={t("firstName")} required autoComplete="given-name" />
                <Field id="lastName" name="lastName" label={t("lastName")} autoComplete="family-name" />
              </div>
              <Field id="email" name="email" type="email" label={t("email")} required autoComplete="email" />
              <Field
                id="phone"
                name="phone"
                type="tel"
                label={t("phone")}
                autoComplete="tel"
                placeholder="+919876543210"
                hint={t("phoneHint")}
              />
              <Field
                id="password"
                name="password"
                type="password"
                label={t("password")}
                required
                autoComplete="new-password"
                minLength={8}
              />
              <Field
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label={t("confirmPassword")}
                required
                autoComplete="new-password"
                minLength={8}
              />

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
                {isSubmitting ? t("creatingAccount") : t("signup")}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
              {t("haveAccount")}{" "}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
                {t("loginLink")}
              </Link>
            </p>
          </>
        ) : (
          userId && (
            <OtpVerificationForm
              userId={userId}
              hasWhatsapp={Boolean(phone)}
              onVerified={handleVerified}
            />
          )
        )}
      </div>
    </main>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  required,
  autoComplete,
  minLength,
  placeholder,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {hint && <p className="text-xs text-zinc-500 dark:text-zinc-500">{hint}</p>}
    </div>
  );
}
