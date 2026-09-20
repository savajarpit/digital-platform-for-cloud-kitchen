"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import {
  ApiError,
  listPlatformWhatsAppTemplates,
  updatePlatformWhatsAppTemplate,
  type PlatformWhatsAppTemplate,
} from "@/lib/api/platform-whatsapp-templates";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";

export function PlatformWhatsAppTemplateList() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const listKey = qk.admin("platform", "whatsapp-templates");
  const { data: templates, isError } = useQuery({
    queryKey: listKey,
    queryFn: listPlatformWhatsAppTemplates,
    staleTime: STALE.short,
  });
  const [saving, setSaving] = useState<string | null>(null);

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
      queryClient.setQueryData<PlatformWhatsAppTemplate[]>(listKey, (prev) =>
        prev ? prev.map((t) => (t.key === key ? updated : t)) : prev,
      );
      void queryClient.invalidateQueries({ queryKey: listKey });
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
    if (isError) {
      return <EmptyState compact icon={MessageSquare} title="Couldn't load WhatsApp templates." />;
    }
    return (
      <div className="card p-6" aria-busy="true">
        <div className="mb-2 flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-56" />
        </div>
        <div className="mb-4 flex flex-col gap-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 py-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-[42px] w-full max-w-xs rounded-xl" />
              <Skeleton className="h-8 w-16 rounded-xl" />
            </div>
          ))}
        </div>
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
