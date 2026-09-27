"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createHomeSection,
  deleteHomeSection,
  listHomeSectionsAdmin,
  updateHomeSection,
  type HomeSection,
} from "@/lib/api/admin-home-sections";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowListCardSkeleton } from "@/components/admin/skeletons/RowListCardSkeleton";
import { HomeSectionEditor } from "@/components/admin/HomeSectionEditor";

export function HomeSectionsManager({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { data: sections, isError } = useQuery({
    queryKey: qk.admin("home", "sections"),
    queryFn: listHomeSectionsAdmin,
    staleTime: STALE.list,
  });
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Every write refreshes the cached section list.
  function refetch() {
    return queryClient.invalidateQueries({ queryKey: qk.admin("home", "sections") });
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    try {
      await createHomeSection({ title: newTitle });
      setNewTitle("");
      setCreating(false);
      refetch();
      showToast("Section created", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't create section.", "error");
    }
  }

  async function handleToggleEnabled(section: HomeSection) {
    try {
      await updateHomeSection(section.id, { isEnabled: !section.isEnabled });
      await refetch();
      showToast(`Section ${!section.isEnabled ? "enabled" : "disabled"}`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update section.", "error");
    }
  }

  function handleDelete(section: HomeSection) {
    confirm({
      message: `Delete "${section.title}"? This removes it from the home page.`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteHomeSection(section.id);
          refetch();
          showToast("Section deleted", "success");
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete section.", "error");
        }
      },
    });
  }

  if (!sections) {
    return isError ? (
      <div className="card p-6">
        <EmptyState compact title="Couldn't load home sections." />
      </div>
    ) : (
      <RowListCardSkeleton rows={2} description headerAction />
    );
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary-600">
          <LayoutGrid className="h-4 w-4" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Home Page Sections</h3>
        </div>
        {canEdit && !creating && (
          <button type="button" onClick={() => setCreating(true)} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            New Section
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Create custom sections like &ldquo;Today&rsquo;s Special&rdquo; or &ldquo;Best Sellers&rdquo; and
        pick which products show in each. A product can appear in more than one section.
      </p>

      {creating && (
        <div className="flex gap-2 rounded-lg border border-primary-200 bg-primary-50/30 p-3 dark:border-primary-900 dark:bg-primary-950/20">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Section name"
            className="input flex-1"
            autoFocus
          />
          <button type="button" onClick={handleCreate} disabled={!newTitle.trim()} className="btn-primary btn-sm">
            Create
          </button>
          <button type="button" onClick={() => setCreating(false)} className="btn-ghost btn-sm">
            Cancel
          </button>
        </div>
      )}

      {sections.length === 0 && !creating && (
        <EmptyState compact title="No home page sections yet." />
      )}

      <div className="flex flex-col gap-3">
        {sections.map((section) =>
          editingId === section.id ? (
            <HomeSectionEditor
              key={section.id}
              section={section}
              onClose={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                refetch();
              }}
            />
          ) : (
            <div
              key={section.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{section.title}</span>
                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {section.items.length} product{section.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={section.isEnabled} onChange={() => handleToggleEnabled(section)} disabled={!canEdit} />
                <button
                  type="button"
                  onClick={() => setEditingId(section.id)}
                  disabled={!canEdit}
                  className="cursor-pointer text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Edit ${section.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(section)}
                  disabled={!canEdit}
                  className="cursor-pointer text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete ${section.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
