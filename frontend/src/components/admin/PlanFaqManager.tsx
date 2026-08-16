"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createPlanFaq,
  deletePlanFaq,
  listPlanFaqsAdmin,
  updatePlanFaq,
  type PlanFaq,
  type PlanFaqInput,
} from "@/lib/api/admin-plan-content";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";

const emptyForm: PlanFaqInput = { question: "", answer: "", isPublished: true };

export function PlanFaqManager({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [faqs, setFaqs] = useState<PlanFaq[] | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  useEffect(() => {
    listPlanFaqsAdmin()
      .then(setFaqs)
      .catch(() => showToast("Couldn't load FAQs.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refetch() {
    listPlanFaqsAdmin().then(setFaqs).catch(() => {});
  }

  async function handleTogglePublished(faq: PlanFaq) {
    try {
      await updatePlanFaq(faq.id, { isPublished: !faq.isPublished });
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update FAQ.", "error");
    }
  }

  function handleDelete(faq: PlanFaq) {
    confirm({
      message: `Delete this FAQ?`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deletePlanFaq(faq.id);
          refetch();
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete FAQ.", "error");
        }
      },
    });
  }

  if (!faqs) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary-600">
          <HelpCircle className="h-4 w-4" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">FAQ</h3>
        </div>
        {canEdit && editingId === null && (
          <button type="button" onClick={() => setEditingId("new")} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add question
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Shown as an accordion on the /plans page. Hidden entirely if there are none.
      </p>

      {editingId === "new" && (
        <PlanFaqForm
          initial={emptyForm}
          onCancel={() => setEditingId(null)}
          onSave={async (input) => {
            await createPlanFaq(input);
            setEditingId(null);
            refetch();
          }}
        />
      )}

      {faqs.length === 0 && editingId !== "new" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No FAQs yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {faqs.map((faq) =>
          editingId === faq.id ? (
            <PlanFaqForm
              key={faq.id}
              initial={{ question: faq.question, answer: faq.answer, isPublished: faq.isPublished }}
              onCancel={() => setEditingId(null)}
              onSave={async (input) => {
                await updatePlanFaq(faq.id, input);
                setEditingId(null);
                refetch();
              }}
            />
          ) : (
            <div
              key={faq.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{faq.question}</p>
                <p className="mt-0.5 min-w-0 wrap-break-word text-xs text-zinc-500 dark:text-zinc-400">
                  {faq.answer}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Toggle checked={faq.isPublished} onChange={() => handleTogglePublished(faq)} disabled={!canEdit} />
                <button
                  type="button"
                  onClick={() => setEditingId(faq.id)}
                  disabled={!canEdit}
                  className="cursor-pointer text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Edit FAQ"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(faq)}
                  disabled={!canEdit}
                  className="cursor-pointer text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Delete FAQ"
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

function PlanFaqForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: PlanFaqInput;
  onCancel: () => void;
  onSave: (input: PlanFaqInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      showToast("FAQ saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save FAQ.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/30 p-4 dark:border-primary-900 dark:bg-primary-950/20"
    >
      <input
        value={form.question}
        onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
        placeholder="Question"
        required
        className="input w-full"
      />
      <textarea
        value={form.answer}
        onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
        placeholder="Answer"
        rows={3}
        required
        className="input w-full"
      />
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <Toggle
          checked={form.isPublished ?? true}
          onChange={(v) => setForm((f) => ({ ...f, isPublished: v }))}
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
