"use client";

import { useEffect, useState } from "react";
import { MessageSquareQuote, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  ApiError,
  createReview,
  deleteReview,
  listReviewsAdmin,
  updateReview,
  type Review,
  type ReviewInput,
} from "@/lib/api/admin-reviews";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";

const emptyForm: ReviewInput = { authorName: "", rating: 5, comment: "", isPublished: true };

export function ReviewsManager({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  useEffect(() => {
    listReviewsAdmin()
      .then(setReviews)
      .catch(() => showToast("Couldn't load reviews.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refetch() {
    listReviewsAdmin().then(setReviews).catch(() => {});
  }

  async function handleTogglePublished(review: Review) {
    try {
      await updateReview(review.id, { isPublished: !review.isPublished });
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update review.", "error");
    }
  }

  function handleDelete(review: Review) {
    confirm({
      message: `Delete the review from "${review.authorName}"?`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteReview(review.id);
          refetch();
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete review.", "error");
        }
      },
    });
  }

  if (!reviews) {
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
          <MessageSquareQuote className="h-4 w-4" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Reviews</h3>
        </div>
        {canEdit && editingId === null && (
          <button type="button" onClick={() => setEditingId("new")} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add Review
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Add testimonials manually (e.g. copied from Google or WhatsApp). Only published reviews show on
        the home page, and only if you&apos;ve turned the section on in Business Profile.
      </p>

      {editingId === "new" && (
        <ReviewForm
          initial={emptyForm}
          onCancel={() => setEditingId(null)}
          onSave={async (input) => {
            await createReview(input);
            setEditingId(null);
            refetch();
          }}
        />
      )}

      {reviews.length === 0 && editingId !== "new" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No reviews yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {reviews.map((review) =>
          editingId === review.id ? (
            <ReviewForm
              key={review.id}
              initial={{
                authorName: review.authorName,
                rating: review.rating,
                comment: review.comment ?? "",
                isPublished: review.isPublished,
              }}
              onCancel={() => setEditingId(null)}
              onSave={async (input) => {
                await updateReview(review.id, input);
                setEditingId(null);
                refetch();
              }}
            />
          ) : (
            <div
              key={review.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {review.authorName}
                  </span>
                  <span className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400" />
                    ))}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-0.5 min-w-0 wrap-break-word text-xs text-zinc-500 dark:text-zinc-400">
                    {review.comment}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Toggle checked={review.isPublished} onChange={() => handleTogglePublished(review)} disabled={!canEdit} />
                <button
                  type="button"
                  onClick={() => setEditingId(review.id)}
                  disabled={!canEdit}
                  className="cursor-pointer text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Edit review from ${review.authorName}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(review)}
                  disabled={!canEdit}
                  className="cursor-pointer text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete review from ${review.authorName}`}
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

function ReviewForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: ReviewInput;
  onCancel: () => void;
  onSave: (input: ReviewInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      showToast("Review saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save review.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/30 p-4 dark:border-primary-900 dark:bg-primary-950/20"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={form.authorName}
          onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
          placeholder="Reviewer name"
          required
          className="input w-full"
        />
        <select
          value={form.rating}
          onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
          className="input w-full"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={form.comment ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
        placeholder="What they said"
        rows={2}
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
