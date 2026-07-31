"use client";

import { useEffect, useState } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  listPagesAdmin,
  createPage,
  updatePage,
  deletePage,
  type StaticPage,
  type StaticPageInput,
} from "@/lib/api/admin-content";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";

const emptyForm: StaticPageInput = { slug: "", title: "", content: "", isPublished: false };

export default function ContentPagesPage() {
  const canEdit = usePermission(PERMISSIONS.CONTENT_EDIT);
  const [pages, setPages] = useState<StaticPage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    listPagesAdmin()
      .then(setPages)
      .catch(() => setError("Couldn't load pages."));
  }, []);

  function handleDelete(page: StaticPage) {
    confirm({
      message: `Delete "${page.title}"? This removes it from the storefront footer and any signup links pointing to it.`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deletePage(page.id);
          setPages((prev) => prev?.filter((p) => p.id !== page.id) ?? null);
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete page.", "error");
        }
      },
    });
  }

  async function handleTogglePublished(page: StaticPage) {
    try {
      const updated = await updatePage(page.id, { isPublished: !page.isPublished });
      setPages((prev) => prev?.map((p) => (p.id === page.id ? updated : p)) ?? null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update page.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary-600">
          <FileText className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Legal Pages
          </h2>
        </div>
        {canEdit && editingId === null && (
          <button type="button" onClick={() => setEditingId("new")} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add Page
          </button>
        )}
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Published pages appear in the storefront footer. <code>terms-of-service</code> and{" "}
        <code>privacy-policy</code> must stay published — new customer signups require both.
      </p>
      {!canEdit && <ViewOnlyNotice />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!pages ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : (
        <div className="card flex flex-col gap-4 p-6">
          {editingId === "new" && (
            <PageForm
              initial={emptyForm}
              onCancel={() => setEditingId(null)}
              onSave={async (input) => {
                const created = await createPage(input);
                setPages((prev) => [created, ...(prev ?? [])]);
                setEditingId(null);
              }}
            />
          )}

          {pages.length === 0 && editingId !== "new" && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No pages yet.</p>
          )}

          <div className="flex flex-col gap-2">
            {pages.map((page) =>
              editingId === page.id ? (
                <PageForm
                  key={page.id}
                  initial={{
                    slug: page.slug,
                    title: page.title,
                    content: page.content,
                    isPublished: page.isPublished,
                  }}
                  onCancel={() => setEditingId(null)}
                  onSave={async (input) => {
                    const updated = await updatePage(page.id, input);
                    setPages((prev) => prev?.map((p) => (p.id === page.id ? updated : p)) ?? null);
                    setEditingId(null);
                  }}
                />
              ) : (
                <div
                  key={page.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
                >
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {page.title}
                    </span>
                    <span className="ml-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      /{page.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={page.isPublished}
                      onChange={() => handleTogglePublished(page)}
                      disabled={!canEdit}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingId(page.id)}
                      disabled={!canEdit}
                      className="cursor-pointer text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Edit ${page.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(page)}
                      disabled={!canEdit}
                      className="cursor-pointer text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Delete ${page.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PageForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: StaticPageInput;
  onCancel: () => void;
  onSave: (input: StaticPageInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      showToast("Page saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save page.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900 dark:bg-primary-950/30"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Privacy Policy"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            placeholder="privacy-policy"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
            className="input font-mono"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Content (markdown)
        </label>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={10}
          required
          className="input font-mono text-xs"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={form.isPublished ?? false}
          onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
          className="h-4 w-4 accent-primary-600"
        />
        Published
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
