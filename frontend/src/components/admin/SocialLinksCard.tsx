"use client";

import { useEffect, useState } from "react";
import { Plus, Share2, Trash2 } from "lucide-react";
import {
  ApiError,
  createSocialLink,
  deleteSocialLink,
  listSocialLinksAdmin,
  updateSocialLink,
  type SocialLink,
  type SocialPlatform,
} from "@/lib/api/admin-social-links";
import { SocialIcon } from "@/components/icons/SocialIcon";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";

const ALL_PLATFORMS: SocialPlatform[] = [
  "INSTAGRAM",
  "FACEBOOK",
  "YOUTUBE",
  "LINKEDIN",
  "TWITTER",
  "WHATSAPP",
  "PINTEREST",
];

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
  TWITTER: "Twitter / X",
  WHATSAPP: "WhatsApp",
  PINTEREST: "Pinterest",
};

export function SocialLinksCard({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [links, setLinks] = useState<SocialLink[] | null>(null);
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>("INSTAGRAM");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listSocialLinksAdmin()
      .then(setLinks)
      .catch(() => showToast("Couldn't load social links.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refetch() {
    listSocialLinksAdmin().then(setLinks).catch(() => {});
  }

  const availablePlatforms = ALL_PLATFORMS.filter(
    (p) => !links?.some((link) => link.platform === p),
  );
  // `newPlatform` only ever changes via the <select>'s own onChange, so once
  // its platform gets added and disappears from the options list, the state
  // itself goes stale — the browser then shows the first remaining option
  // while React still thinks the removed one is selected. Deriving the
  // actual submitted value here (instead of trusting the stale state
  // directly) keeps "what's visibly selected" and "what gets submitted" from
  // ever disagreeing, with no effect/extra render needed.
  const effectivePlatform = availablePlatforms.includes(newPlatform)
    ? newPlatform
    : availablePlatforms[0];

  async function handleAdd() {
    if (!newUrl.trim() || !effectivePlatform) return;
    setSaving(true);
    try {
      await createSocialLink({ platform: effectivePlatform, url: newUrl.trim() });
      setNewUrl("");
      refetch();
      showToast("Social link added", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't add social link.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(link: SocialLink) {
    try {
      await updateSocialLink(link.id, { isEnabled: !link.isEnabled });
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update social link.", "error");
    }
  }

  function handleDelete(link: SocialLink) {
    confirm({
      message: `Remove ${PLATFORM_LABELS[link.platform]} from the footer?`,
      confirmLabel: "Remove",
      processingLabel: "Removing…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteSocialLink(link.id);
          refetch();
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't remove social link.", "error");
        }
      },
    });
  }

  if (!links) {
    return (
      <div className="card flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        <Share2 className="h-4 w-4" />
        Social links
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Shown as icons in the storefront footer. Only enabled links appear.
      </p>

      {links.length > 0 && (
        <div className="flex flex-col gap-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <SocialIcon platform={link.platform} className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {PLATFORM_LABELS[link.platform]}
                </p>
                <p className="truncate text-xs text-zinc-400">{link.url}</p>
              </div>
              <Toggle checked={link.isEnabled} onChange={() => handleToggle(link)} disabled={!canEdit} />
              <button
                type="button"
                onClick={() => handleDelete(link)}
                disabled={!canEdit}
                className="cursor-pointer text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Remove ${PLATFORM_LABELS[link.platform]}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {canEdit && availablePlatforms.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Platform</label>
            <select
              value={effectivePlatform}
              onChange={(e) => setNewPlatform(e.target.value as SocialPlatform)}
              className="input w-40"
            >
              {availablePlatforms.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Profile / page URL
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://instagram.com/yourbusiness"
              className="input w-full"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newUrl.trim()}
            className="btn-outline btn-sm"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      )}
    </div>
  );
}
