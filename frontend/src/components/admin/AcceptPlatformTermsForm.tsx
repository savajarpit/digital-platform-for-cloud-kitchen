"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, acceptPlatformTerms } from "@/lib/api/platform-terms";
import { useToast } from "@/context/ToastContext";

export function AcceptPlatformTermsForm({ version }: { version: number }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleAccept() {
    setSubmitting(true);
    try {
      await acceptPlatformTerms();
      showToast("Terms accepted", "success");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't record your acceptance.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary-600"
        />
        I have read and agree to Platform Terms version {version}.
      </label>
      <button
        type="button"
        disabled={!checked || submitting}
        onClick={handleAccept}
        className="btn-primary cursor-pointer disabled:cursor-not-allowed"
      >
        {submitting ? "Saving…" : "Accept & Continue"}
      </button>
    </div>
  );
}
