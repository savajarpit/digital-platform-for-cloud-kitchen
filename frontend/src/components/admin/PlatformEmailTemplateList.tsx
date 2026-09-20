"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Mail, Send } from "lucide-react";
import {
  ApiError,
  listPlatformEmailTemplates,
  sendPlatformEmailTemplateTest,
  updatePlatformEmailTemplate,
  type PlatformEmailTemplate,
} from "@/lib/api/platform-email-templates";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmailTemplateEditorForm } from "@/components/admin/EmailTemplateEditorForm";

const SCOPE_LABEL: Record<PlatformEmailTemplate["scope"], string> = {
  PLATFORM_OPS: "Platform Notifications — sent to you, always OkaySync-branded",
  CUSTOMER_DEFAULT:
    "Customer Defaults — sent to tenants’ customers, tenant-branded",
};

export function PlatformEmailTemplateList() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const listKey = qk.admin("platform", "email-templates");
  const { data: templates, isError } = useQuery({
    queryKey: listKey,
    queryFn: listPlatformEmailTemplates,
    staleTime: STALE.short,
  });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  async function handleSave(key: string, subject: string, bodyHtml: string) {
    setSaving(true);
    try {
      const updated = await updatePlatformEmailTemplate(key, { subject, bodyHtml });
      queryClient.setQueryData<PlatformEmailTemplate[]>(listKey, (prev) =>
        prev ? prev.map((t) => (t.key === key ? updated : t)) : prev,
      );
      void queryClient.invalidateQueries({ queryKey: listKey });
      showToast("Template saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save template.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest(key: string) {
    setSendingTest(true);
    try {
      const { sentTo } = await sendPlatformEmailTemplateTest(key);
      showToast(`Test email sent to ${sentTo}`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't send test email.", "error");
    } finally {
      setSendingTest(false);
    }
  }

  if (!templates) {
    if (isError) return <EmptyState compact icon={Mail} title="Couldn't load email templates." />;
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        {[4, 3].map((rows, i) => (
          <div key={i} className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-72 max-w-full" />
            </div>
            <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
              {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64 max-w-full" />
                  </div>
                  <Skeleton className="h-4 w-4 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const scopes: PlatformEmailTemplate["scope"][] = ["CUSTOMER_DEFAULT", "PLATFORM_OPS"];

  return (
    <div className="flex flex-col gap-6">
      {scopes.map((scope) => {
        const rows = templates.filter((t) => t.scope === scope);
        if (rows.length === 0) return null;
        return (
          <div key={scope} className="card p-6">
            <div className="mb-4 flex items-center gap-2 text-primary-600">
              <Mail className="h-4 w-4" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {SCOPE_LABEL[scope]}
              </h3>
            </div>
            <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((t) => {
                const isOpen = openKey === t.key;
                return (
                  <div key={t.key} className="py-3">
                    <button
                      type="button"
                      onClick={() => setOpenKey(isOpen ? null : t.key)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {t.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {t.description}
                        </p>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="mt-4">
                        <EmailTemplateEditorForm
                          key={t.key}
                          subject={t.subject}
                          bodyHtml={t.bodyHtml}
                          availableVars={t.availableVars}
                          saving={saving}
                          onSave={(subject, bodyHtml) => handleSave(t.key, subject, bodyHtml)}
                          extraActions={
                            <button
                              type="button"
                              disabled={sendingTest}
                              onClick={() => handleSendTest(t.key)}
                              className="btn-outline inline-flex items-center gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Send className="h-3.5 w-3.5" />
                              {sendingTest ? "Sending…" : "Send test to myself"}
                            </button>
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
