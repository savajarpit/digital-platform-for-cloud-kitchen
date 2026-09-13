"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { ApiError, getExpiringSoon, type ExpiringSoon } from "@/lib/api/admin-subscriptions";
import { Skeleton } from "@/components/ui/Skeleton";

/** "How many active subscriptions expire soon" tile with a custom day
 * window and a click-to-expand list — no Modal component in this codebase,
 * same inline-expand pattern used elsewhere in the admin subscriptions UI. */
export function ExpiringSoonCard() {
  const [withinDays, setWithinDays] = useState("7");
  const [data, setData] = useState<ExpiringSoon | null>(null);
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = Math.max(1, Math.round(Number(withinDays) || 7));

  useEffect(() => {
    getExpiringSoon(days)
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load expiring subscriptions."),
      );
  }, [days]);

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Expiring Soon</h3>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          Within
          <input
            type="number"
            min={1}
            max={90}
            value={withinDays}
            onChange={(e) => setWithinDays(e.target.value)}
            className="input w-16 px-2 py-1"
          />
          days
        </label>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!data ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <>
          <button
            type="button"
            onClick={() => setShowList((v) => !v)}
            disabled={data.count === 0}
            className="flex items-baseline gap-2 text-left disabled:cursor-default"
          >
            <span className="font-display text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {data.count}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              subscription{data.count === 1 ? "" : "s"} ending within {days} day{days === 1 ? "" : "s"}
              {data.count > 0 && (
                <span className="ml-1 font-medium text-primary-600 hover:underline dark:text-primary-400">
                  {showList ? "hide list" : "view list"}
                </span>
              )}
            </span>
          </button>

          {showList && data.count > 0 && (
            <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              {data.subscriptions.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/subscriptions/${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {s.user.firstName} {s.user.lastName ?? ""}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{s.planName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(s.cycleEnd).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
