"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError, resendOtp, verifyOtp } from "@/lib/api/auth";

const RESEND_COOLDOWN_SECONDS = 30;

export function OtpVerificationForm({
  userId,
  hasWhatsapp,
  onVerified,
}: {
  userId: string;
  hasWhatsapp: boolean;
  onVerified: () => void;
}) {
  const t = useTranslations("auth");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyOtp(userId, code);
      onVerified();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("accountNotVerified"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResendMessage(null);
    try {
      await resendOtp(userId);
      setResendMessage(t("resendSuccess"));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("accountNotVerified"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {t("otpTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {hasWhatsapp ? t("otpSubtitleEmailWhatsapp") : t("otpSubtitleEmail")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="otp-code" className="sr-only">
            {t("otpCode")}
          </label>
          <input
            id="otp-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="••••••"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {resendMessage && (
          <p className="text-sm text-primary-700 dark:text-primary-400">{resendMessage}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || code.length !== 6}
          className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? t("verifying") : t("verify")}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-sm font-medium text-zinc-600 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400"
        >
          {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resendCode")}
        </button>
      </form>
    </div>
  );
}
