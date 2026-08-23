"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { ApiError, changeMyPassword } from "@/lib/api/users";
import { useToast } from "@/context/ToastContext";
import { PasswordInput } from "@/components/ui/PasswordInput";

// Mirrors the backend's @IsStrongPassword rule (min 8 chars, 1 uppercase, 1
// number, 1 symbol) so a weak new password is caught before it's submitted.
const STRONG_PASSWORD_PATTERN = "(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}";

export function ChangePasswordCard() {
  const t = useTranslations("profile");
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const canSubmit = useMemo(
    () => currentPassword && newPassword && confirmPassword && !mismatch,
    [currentPassword, newPassword, confirmPassword, mismatch],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setSaving(true);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast(t("passwordChanged"), "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("passwordChangeError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2 text-primary-600">
        <Lock className="h-5 w-5" />
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("changePassword")}</h2>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("currentPassword")}
        </label>
        <PasswordInput
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="input w-full"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("newPassword")}
          </label>
          <PasswordInput
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            pattern={STRONG_PASSWORD_PATTERN}
            required
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("confirmPassword")}
          </label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className={`input w-full ${mismatch ? "border-red-400 dark:border-red-700" : ""}`}
          />
          {mismatch && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t("passwordMismatch")}</p>}
        </div>
      </div>
      <p className="text-xs text-zinc-400">{t("passwordHint")}</p>

      <button type="submit" disabled={saving || !canSubmit} className="btn-primary mt-2 w-fit">
        {saving ? t("changingPassword") : t("changePassword")}
      </button>
    </form>
  );
}
