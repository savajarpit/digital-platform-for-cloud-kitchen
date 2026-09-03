"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Shared subject/body editor for both the SUPER_ADMIN platform-template
 * editor and the tenant-facing notification-template editor — same shape,
 * different save/permission wiring around it. */
export function EmailTemplateEditorForm({
  subject: initialSubject,
  bodyHtml: initialBodyHtml,
  availableVars,
  disabled,
  saving,
  onSave,
  extraActions,
}: {
  subject: string;
  bodyHtml: string;
  availableVars: string[];
  disabled?: boolean;
  saving: boolean;
  onSave: (subject: string, bodyHtml: string) => void;
  extraActions?: React.ReactNode;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [showPreview, setShowPreview] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const dirty = subject !== initialSubject || bodyHtml !== initialBodyHtml;

  function insertVar(token: string) {
    const textarea = bodyRef.current;
    if (!textarea) {
      setBodyHtml((prev) => prev + `{{${token}}}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = bodyHtml.slice(0, start) + `{{${token}}}` + bodyHtml.slice(end);
    setBodyHtml(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + token.length + 4;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={disabled}
          className="input w-full font-mono text-sm"
        />
      </div>

      {availableVars.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Insert a placeholder — click to add it at your cursor
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableVars.map((v) => (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onClick={() => insertVar(v)}
                className="rounded-full bg-zinc-100 px-2.5 py-1 font-mono text-xs text-zinc-600 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-primary-950 dark:hover:text-primary-400"
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Body (HTML)
          </label>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
        </div>
        <textarea
          ref={bodyRef}
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          disabled={disabled}
          rows={10}
          className="input w-full font-mono text-xs leading-relaxed"
        />
      </div>

      {showPreview && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <iframe
            title="Email preview"
            srcDoc={`<div style="font-family:-apple-system,sans-serif;padding:16px;font-size:15px;color:#27272a;">${bodyHtml}</div>`}
            className="h-64 w-full bg-white"
          />
        </div>
      )}

      {!disabled && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => onSave(subject, bodyHtml)}
            className="btn-primary w-fit disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {extraActions}
        </div>
      )}
    </div>
  );
}
