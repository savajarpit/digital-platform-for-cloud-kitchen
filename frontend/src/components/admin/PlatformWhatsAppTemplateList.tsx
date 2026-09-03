"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import {
  ApiError,
  listPlatformWhatsAppTemplates,
  updatePlatformWhatsAppTemplate,
  type PlatformWhatsAppTemplate,
} from "@/lib/api/platform-whatsapp-templates";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";

export function PlatformWhatsAppTemplateList() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<PlatformWhatsAppTemplate[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    listPlatformWhatsAppTemplates()
      .then(setTemplates)
      .catch(() => showToast("Couldn't load WhatsApp templates.", "error"));
  }, [showToast]);

  async function handleSave(
    key: string,
    templateKey: string,
    placeholders: PlatformWhatsAppTemplate["placeholders"],
  ) {
    setSaving(key);
    try {
      const updated = await updatePlatformWhatsAppTemplate(key, {
        templateKey,
        placeholders,
      });
      setTemplates((prev) => (prev ? prev.map((t) => (t.key === key ? updated : t)) : prev));
      showToast("WhatsApp template saved", "success");
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Couldn't save WhatsApp template.",
        "error",
      );
    } finally {
      setSaving(null);
    }
  }

  if (!templates) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-2 flex items-center gap-2 text-primary-600">
        <MessageSquare className="h-4 w-4" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Approved WhatsApp Templates
        </h3>
      </div>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        The message wording itself lives outside this app — it must be approved by Meta through
        your WhatsApp Business Solution Provider (e.g. Interakt) first. This only records which
        approved template name to send for each notification, and what each of its placeholders
        means.
      </p>
      <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {templates.map((t) => (
          <WhatsAppTemplateRow
            key={t.key}
            template={t}
            saving={saving === t.key}
            onSave={(templateKey, placeholders) => handleSave(t.key, templateKey, placeholders)}
          />
        ))}
      </div>
    </div>
  );
}

function WhatsAppTemplateRow({
  template,
  saving,
  onSave,
}: {
  template: PlatformWhatsAppTemplate;
  saving: boolean;
  onSave: (templateKey: string, placeholders: PlatformWhatsAppTemplate["placeholders"]) => void;
}) {
  const [templateKey, setTemplateKey] = useState(template.templateKey);
  const [placeholders, setPlaceholders] = useState(template.placeholders);

  const dirty =
    templateKey !== template.templateKey ||
    JSON.stringify(placeholders) !== JSON.stringify(template.placeholders);

  function updateLabel(index: number, label: string) {
    setPlaceholders((prev) => prev.map((p, i) => (i === index ? { ...p, label } : p)));
  }

  return (
    <div className="py-4">
      <p className="mb-2 text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">
        {template.key.replace(/-/g, " ")}
      </p>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Approved template name
        </label>
        <input
          type="text"
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value)}
          className="input w-full max-w-xs font-mono text-sm"
        />
      </div>
      <div className="mb-3 space-y-2">
        {placeholders.map((p, i) => (
          <div key={p.paramKey} className="flex items-center gap-2 text-sm">
            <span className="w-32 shrink-0 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {`{{${i + 1}}}`} {p.paramKey}
            </span>
            <input
              type="text"
              value={p.label}
              onChange={(e) => updateLabel(i, e.target.value)}
              className="input w-full max-w-sm"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={!dirty || saving}
        onClick={() => onSave(templateKey, placeholders)}
        className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
