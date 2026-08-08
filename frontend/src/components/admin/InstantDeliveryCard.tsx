"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  getInstantDeliverySettings,
  updateInstantDeliverySettings,
  type InstantDeliverySettings,
} from "@/lib/api/admin-settings";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";

export function InstantDeliveryCard({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<InstantDeliverySettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getInstantDeliverySettings()
      .then(setSettings)
      .catch(() => setSettings({ isEnabled: false, etaMinMinutes: 30, etaMaxMinutes: 45 }));
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateInstantDeliverySettings(settings);
      setSettings(updated);
      showToast("Instant delivery settings saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save changes.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
      </div>
    );
  }

  return (
    <fieldset disabled={!canEdit} className="card flex flex-col gap-3 p-6 disabled:opacity-70">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Instant delivery</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Offer &quot;deliver ASAP&quot; at checkout, on top of picking a day/slot. Only available while
            the kitchen is within operating hours above.
          </p>
        </div>
        <Toggle
          checked={settings.isEnabled}
          onChange={(isEnabled) => setSettings({ ...settings, isEnabled })}
          disabled={!canEdit}
        />
      </div>
      {settings.isEnabled && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ready in</label>
          <input
            type="number"
            min={1}
            value={settings.etaMinMinutes}
            onChange={(e) =>
              setSettings({ ...settings, etaMinMinutes: Number(e.target.value) })
            }
            className="input w-24"
          />
          <span className="text-sm text-zinc-400">to</span>
          <input
            type="number"
            min={1}
            value={settings.etaMaxMinutes}
            onChange={(e) =>
              setSettings({ ...settings, etaMaxMinutes: Number(e.target.value) })
            }
            className="input w-24"
          />
          <span className="text-sm text-zinc-400">minutes</span>
        </div>
      )}
      <button type="button" onClick={handleSave} disabled={saving} className="btn-primary w-fit">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </fieldset>
  );
}
