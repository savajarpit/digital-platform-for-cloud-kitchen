"use client";

import { useState } from "react";

/**
 * When `onChange` returns a promise, the switch flips immediately and stays
 * locked until it settles, then falls back to the `checked` prop — so the
 * handler must resolve only once the parent's data reflects the save (await
 * the refetch/invalidation), and a failed save reverts on its own.
 */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void | Promise<unknown>;
  disabled?: boolean;
  label?: string;
}) {
  const [pending, setPending] = useState<boolean | null>(null);
  const shown = pending ?? checked;

  function handleClick() {
    const next = !shown;
    const result = onChange(next);
    if (!(result instanceof Promise)) return;
    setPending(next);
    result.finally(() => setPending(null)).catch(() => {});
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={shown}
      aria-busy={pending !== null}
      aria-label={label}
      disabled={disabled || pending !== null}
      onClick={handleClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        shown ? "bg-primary-600" : "bg-zinc-200 dark:bg-zinc-700"
      } ${pending !== null ? "disabled:cursor-wait disabled:opacity-70" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          shown ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
