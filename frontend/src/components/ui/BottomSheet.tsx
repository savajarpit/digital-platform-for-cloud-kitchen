"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SheetFooterContext } from "@/components/ui/SheetActions";

/**
 * Responsive modal: a sheet that rises from the bottom edge on phones, a
 * centered dialog from `sm` up (a bottom sheet stretched across a desktop
 * screen reads as a mobile leftover). The header and the action footer
 * (see SheetActions) stay put while the body scrolls, and the scrollbar is
 * hidden — the content still scrolls by wheel, touch and keyboard.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name; also shown as the sheet heading. */
  title: string;
  children: React.ReactNode;
}) {
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-soft sm:max-h-[min(85vh,760px)] sm:rounded-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5">
          {/* Drag handle — a phone-sheet affordance only. */}
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-200 sm:hidden dark:bg-zinc-700" aria-hidden />
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          <SheetFooterContext.Provider value={footer}>{children}</SheetFooterContext.Provider>
        </div>
        {/* Filled by <SheetActions> — hidden while nothing renders into it. */}
        <div
          ref={setFooter}
          className="shrink-0 border-t border-zinc-100 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] empty:hidden dark:border-zinc-800"
        />
      </div>
    </div>
  );
}
