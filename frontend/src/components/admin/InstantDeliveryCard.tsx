"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  getInstantDeliverySettings,
  updateInstantDeliverySettings,
  type InstantDeliverySettings,
} from "@/lib/api/admin-settings";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { qk, STALE } from "@/lib/query/keys";

/** Same limit the API enforces — beyond 4 hours it isn't "ASAP". */
const MAX_ETA_MINUTES = 240;

/** Why the ready-in range can't be saved, or null. An emptied box is NaN. */
function etaRangeError(min: number, max: number): string | null {
  const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_ETA_MINUTES;
  if (!valid(min) || !valid(max)) return `Enter whole minutes between 1 and ${MAX_ETA_MINUTES}.`;
  if (min > max) return "The first time can't be later than the second.";
  return null;
}

/** Number input value → number, keeping an emptied box empty (NaN) instead of 0. */
const toMinutes = (value: string) => (value === "" ? Number.NaN : Number(value));

export function InstantDeliveryCard({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = qk.admin("settings", "instant-delivery");
  const { data, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: getInstantDeliverySettings,
    staleTime: STALE.list,
  });
  // Unsaved edits live in `draft`; a background refetch never overwrites them.
  const [draft, setDraft] = useState<InstantDeliverySettings | null>(null);
  // Never fall back to defaults on a load error — an editable "off" form
  // would let one Save overwrite the real settings.
  const settings = draft ?? data ?? null;
  const setSettings = setDraft;
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      // Send only the editable fields — never spread `settings` straight in,
      // the backend rejects any stray `id`/`tenantId`/timestamps.
      const updated = await updateInstantDeliverySettings({
        isEnabled: settings.isEnabled,
        etaMinMinutes: settings.etaMinMinutes,
        etaMaxMinutes: settings.etaMaxMinutes,
      });
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey });
      setDraft(null);
      showToast("Instant delivery settings saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save changes.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings && isError) {
    return (
      <div className="card flex flex-col gap-3 p-6">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Instant delivery</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Couldn&apos;t load your instant delivery settings, so they can&apos;t be edited right now.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="btn-outline btn-sm w-fit cursor-pointer"
        >
          {isFetching ? "Retrying…" : "Try again"}
        </button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="card flex flex-col gap-3 p-6" aria-busy="true">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    );
  }

  // Only matters while instant is on — the range is hidden otherwise.
  const rangeError = settings.isEnabled ? etaRangeError(settings.etaMinMinutes, settings.etaMaxMinutes) : null;

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
            max={MAX_ETA_MINUTES}
            value={Number.isNaN(settings.etaMinMinutes) ? "" : settings.etaMinMinutes}
            onChange={(e) =>
              setSettings({ ...settings, etaMinMinutes: toMinutes(e.target.value) })
            }
            aria-invalid={Boolean(rangeError)}
            className="input w-24"
          />
          <span className="text-sm text-zinc-400">to</span>
          <input
            type="number"
            min={1}
            max={MAX_ETA_MINUTES}
            value={Number.isNaN(settings.etaMaxMinutes) ? "" : settings.etaMaxMinutes}
            onChange={(e) =>
              setSettings({ ...settings, etaMaxMinutes: toMinutes(e.target.value) })
            }
            aria-invalid={Boolean(rangeError)}
            className="input w-24"
          />
          <span className="text-sm text-zinc-400">minutes</span>
        </div>
      )}
      {rangeError && <p className="text-xs text-red-600 dark:text-red-400">{rangeError}</p>}
      <button type="button" onClick={handleSave} disabled={saving || Boolean(rangeError)} className="btn-primary w-fit">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </fieldset>
  );
}
