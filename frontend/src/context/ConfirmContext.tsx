"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shown on the confirm button while `onConfirm` is running. Defaults to "Please wait…". */
  processingLabel?: string;
  /** "danger" renders the confirm button in red — use for destructive actions like delete. */
  variant?: "danger" | "default";
  /** Runs when the user clicks confirm. The dialog stays open (and can't be
   * dismissed) until this settles, showing `processingLabel` in the meantime. */
  onConfirm: () => Promise<void> | void;
}

type ConfirmFn = (options: ConfirmOptions) => void;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const confirm = useCallback<ConfirmFn>((options) => {
    setPending(options);
  }, []);

  // Ignored while an onConfirm action is in flight — the dialog must not be
  // dismissible (backdrop click, Escape, Cancel) until it settles.
  const dismiss = useCallback(() => {
    if (isProcessing) return;
    setPending(null);
  }, [isProcessing]);

  async function handleConfirmClick() {
    if (!pending || isProcessing) return;
    setIsProcessing(true);
    try {
      await pending.onConfirm();
    } finally {
      setIsProcessing(false);
      setPending(null);
    }
  }

  useEffect(() => {
    if (!pending) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, dismiss]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          onClick={dismiss}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-message"
            className="card w-full max-w-sm animate-fade-up p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              {pending.variant === "danger" && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </span>
              )}
              <div>
                {pending.title && (
                  <h2 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {pending.title}
                  </h2>
                )}
                <p id="confirm-dialog-message" className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {pending.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={dismiss}
                disabled={isProcessing}
                className="btn-ghost btn-sm"
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleConfirmClick}
                disabled={isProcessing}
                className={`btn-sm ${pending.variant === "danger" ? "btn-danger" : "btn-primary"}`}
              >
                {isProcessing
                  ? (pending.processingLabel ?? "Please wait…")
                  : (pending.confirmLabel ?? "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * App-styled replacement for `window.confirm` that runs the destructive
 * action itself: `confirm({ message, variant: "danger", onConfirm: async () => { ... } })`.
 * The dialog stays open and locked (no outside-click/Escape/Cancel) while
 * `onConfirm` is in flight, showing `processingLabel` on the confirm button.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
