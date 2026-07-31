"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import {
  ApiError,
  listPlatformTermsHistory,
  publishPlatformTerms,
  type PlatformTerms,
} from "@/lib/api/platform-terms";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";

export default function PlatformTermsAdminPage() {
  const { showToast } = useToast();
  const [history, setHistory] = useState<PlatformTerms[] | null>(null);
  const [draft, setDraft] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlatformTermsHistory()
      .then((rows) => {
        setHistory(rows);
        setDraft(rows[0]?.content ?? "");
      })
      .catch(() => setError("Couldn't load platform terms."));
  }, []);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);
    try {
      const created = await publishPlatformTerms(draft);
      setHistory((prev) => [created, ...(prev ?? [])]);
      showToast(`Published version ${created.version}`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't publish terms.", "error");
    } finally {
      setPublishing(false);
    }
  }

  const latest = history?.[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <FileText className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Platform Terms
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Tenant OWNERs must accept the latest version before their admin dashboard is usable.
        Publishing a new version re-opens the acceptance gate for every OWNER.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!history ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : (
        <>
          <form onSubmit={handlePublish} className="card flex flex-col gap-3 p-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {latest ? `Publish new version (currently v${latest.version})` : "Publish first version"}
            </h3>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={12}
              required
              placeholder="## Platform Terms & Conditions..."
              className="input font-mono text-xs"
            />
            <div>
              <button type="submit" disabled={publishing} className="btn-primary btn-sm">
                {publishing ? "Publishing…" : "Publish New Version"}
              </button>
            </div>
          </form>

          <div className="card flex flex-col gap-3 p-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing published yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((terms) => (
                  <div
                    key={terms.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
                  >
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Version {terms.version}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(terms.publishedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
