"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, MapPin } from "lucide-react";
import {
  ApiError,
  getPlatformSettings,
  updatePlatformSettings,
  type PlatformSettings,
} from "@/lib/api/platform-settings";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Skeleton } from "@/components/ui/Skeleton";

export function PlatformSettingsCard() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);

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

  async function toggleMapsProvider(useGoogle: boolean) {
    if (!settings) return;
    const next = useGoogle ? "GOOGLE" : "OSM";
    const prev = settings.mapsProvider;
    setSaving(true);
    setSettings({ ...settings, mapsProvider: next });
    try {
      const updated = await updatePlatformSettings({ mapsProvider: next });
      setSettings(updated);
      showToast(
        useGoogle ? "Switched every storefront to Google Maps" : "Switched every storefront to the free OpenStreetMap",
        "success",
      );
    } catch (err) {
      setSettings((prevSettings) => (prevSettings ? { ...prevSettings, mapsProvider: prev } : prevSettings));
      showToast(err instanceof ApiError ? err.message : "Couldn't switch map provider.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveApiKey() {
    const key = apiKeyInput.trim();
    if (!key) return;
    setSavingKey(true);
    try {
      const updated = await updatePlatformSettings({ googleMapsApiKey: key });
      setSettings(updated);
      setApiKeyInput("");
      showToast("Google Maps API key saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save the API key.", "error");
    } finally {
      setSavingKey(false);
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

  const usingGoogle = settings.mapsProvider === "GOOGLE";

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary-600">
        <SlidersHorizontal className="h-4 w-4" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Platform-Wide Toggles
        </h3>
      </div>
      <div className="flex flex-col gap-4">
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

        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                <MapPin className="h-3.5 w-3.5 text-primary-600" />
                Use Google Maps
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Off uses the free OpenStreetMap/Leaflet picker (no key, no billing) for every
                tenant&apos;s address and kitchen-zone location pickers. Turn on once you&apos;ve
                added an API key below — needs the Maps JavaScript + Places APIs enabled (and
                billing set up) on that Google Cloud project. Takes effect immediately, no
                redeploy needed.
              </p>
            </div>
            <Toggle checked={usingGoogle} onChange={toggleMapsProvider} disabled={saving} />
          </div>

          {usingGoogle && (
            <div className="flex flex-col gap-1.5 border-t border-zinc-200 pt-3.5 dark:border-zinc-800">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Google Maps API key
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <PasswordInput
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    settings.googleMapsApiKeyConfigured
                      ? "Configured — leave blank to keep, or paste a new key to replace it"
                      : "Paste your Google Maps API key"
                  }
                  className="input min-w-64 flex-1"
                />
                <button
                  type="button"
                  onClick={saveApiKey}
                  disabled={savingKey || !apiKeyInput.trim()}
                  className="btn-outline btn-sm shrink-0 cursor-pointer"
                >
                  {savingKey ? "Saving…" : "Save key"}
                </button>
              </div>
              {!settings.googleMapsApiKeyConfigured && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No key saved yet — the map picker will show a fallback notice on every
                  storefront until one is added.
                </p>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                This key is sent to every visitor&apos;s browser to call Google&apos;s Maps/Places
                APIs directly — that&apos;s normal for a browser Maps key. Restrict it by HTTP
                referrer in the Google Cloud Console rather than relying on secrecy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
