"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  ApiError,
  getPlatformSettings,
  updatePlatformSettings,
  type PlatformSettings,
} from "@/lib/api/platform-settings";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";

export function PlatformSettingsCard() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPlatformSettings()
      .then(setSettings)
      .catch(() => showToast("Couldn't load platform settings.", "error"));
  }, [showToast]);

  async function toggleWhatsappOtp(next: boolean) {
    if (!settings) return;
    setSaving(true);
    setSettings({ ...settings, whatsappOtpEnabled: next });
    try {
      const updated = await updatePlatformSettings({ whatsappOtpEnabled: next });
      setSettings(updated);
      showToast(next ? "WhatsApp OTP enabled platform-wide" : "WhatsApp OTP disabled platform-wide", "success");
    } catch (err) {
      setSettings((prev) => (prev ? { ...prev, whatsappOtpEnabled: !next } : prev));
      showToast(err instanceof ApiError ? err.message : "Couldn't update setting.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-4 h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary-600">
        <SlidersHorizontal className="h-4 w-4" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Platform-Wide Toggles
        </h3>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            WhatsApp OTP delivery
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Off by default — signup/login verification codes go out over email only, for every
            tenant, regardless of their own WhatsApp setup. Turn this on once you trust a real
            approved OTP template on your BSP. Doesn&apos;t affect order-confirmation WhatsApp
            sends, which stay controlled per tenant.
          </p>
        </div>
        <Toggle
          checked={settings.whatsappOtpEnabled}
          onChange={toggleWhatsappOtp}
          disabled={saving}
        />
      </div>
    </div>
  );
}
