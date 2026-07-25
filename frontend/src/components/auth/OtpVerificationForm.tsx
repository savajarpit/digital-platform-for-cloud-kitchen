"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError, resendOtp, verifyOtp } from "@/lib/api/auth";
import { useToast } from "@/context/ToastContext";

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
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await verifyOtp(userId, code);
      showToast("Account verified — welcome!", "success");
      onVerified();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("accountNotVerified"), "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    try {
      await resendOtp(userId);
      showToast(t("resendSuccess"), "success");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("accountNotVerified"), "error");
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
            className="input text-center text-2xl tracking-[0.5em]"
            placeholder="••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || code.length !== 6}
          className="btn-primary"
        >
          {isSubmitting ? t("verifying") : t("verify")}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="btn-ghost text-sm"
        >
          {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resendCode")}
        </button>
      </form>
    </div>
  );
}
