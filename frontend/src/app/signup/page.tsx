"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, register } from "@/lib/api/auth";
import { OtpVerificationForm } from "@/components/auth/OtpVerificationForm";
import { FormField } from "@/components/auth/FormField";
import { useToast } from "@/context/ToastContext";

export default function SignupPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      showToast(t("passwordMismatch"), "error");
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
        termsAccepted,
      });
      showToast("Verification code sent", "success");
      setPhone(phoneValue);
      setUserId(result.userId);
      setStep("otp");
    } catch (err) {
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
        {step === "form" ? (
          <>
            <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {t("signupSubtitle")}
            </h1>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField id="firstName" name="firstName" label={t("firstName")} required autoComplete="given-name" />
                <FormField id="lastName" name="lastName" label={t("lastName")} autoComplete="family-name" />
              </div>
              <FormField id="email" name="email" type="email" label={t("email")} required autoComplete="email" />
              <FormField id="phone" name="phone" type="tel" label={t("phone")} autoComplete="tel" />
              <FormField
                id="password"
                name="password"
                type="password"
                label={t("password")}
                required
                autoComplete="new-password"
                minLength={8}
              />
              <FormField
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label={t("confirmPassword")}
                required
                autoComplete="new-password"
                minLength={8}
              />

              <label className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary-600"
                  required
                />
                <span>
                  I agree to the{" "}
                  <Link href="/legal/terms-of-service" target="_blank" className="font-medium text-primary-600 hover:text-primary-700">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/legal/privacy-policy" target="_blank" className="font-medium text-primary-600 hover:text-primary-700">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting || !termsAccepted}
                className="btn-primary mt-2"
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
