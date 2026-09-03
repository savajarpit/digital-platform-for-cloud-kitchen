"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Mail, RotateCcw } from "lucide-react";
import {
  ApiError,
  getTenantEmailTemplates,
  resetTenantEmailTemplate,
  updateTenantEmailTemplate,
  type TenantEmailTemplate,
} from "@/lib/api/notification-templates";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { EmailTemplateEditorForm } from "@/components/admin/EmailTemplateEditorForm";

const KEY_LABEL: Record<string, string> = {
  "order-confirmation-customer": "Order Confirmation",
  welcome: "Welcome Email",
  "reset-password": "Reset Password",
};

export function EmailTemplatesCard() {
  const { showToast } = useToast();
  const canEdit = usePermission(PERMISSIONS.NOTIFICATION_TEMPLATES_EMAIL_EDIT);
  const [templates, setTemplates] = useState<TenantEmailTemplate[] | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTenantEmailTemplates()
      .then(setTemplates)
      .catch(() => showToast("Couldn't load email templates.", "error"));
  }, [showToast]);

  async function handleSave(key: string, subject: string, bodyHtml: string) {
    setSaving(true);
    try {
      await updateTenantEmailTemplate(key, { subject, bodyHtml });
      setTemplates((prev) =>
        prev
          ? prev.map((t) => (t.key === key ? { ...t, subject, bodyHtml, isCustomized: true } : t))
          : prev,
      );
      showToast("Email wording saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save changes.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(key: string) {
    setSaving(true);
    try {
      await resetTenantEmailTemplate(key);
      const fresh = await getTenantEmailTemplates();
      setTemplates(fresh);
      showToast("Reverted to the platform default", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't reset template.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary-600">
        <Mail className="h-4 w-4" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Email Templates
        </h3>
      </div>
      {!canEdit && <ViewOnlyNotice />}
      {!templates ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {templates.map((t) => {
            const isOpen = openKey === t.key;
            return (
              <div key={t.key} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : t.key)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {KEY_LABEL[t.key] ?? t.key}
                    {t.isCustomized && (
                      <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
                        Customized
                      </span>
                    )}
                  </span>
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
                      disabled={!canEdit}
                      saving={saving}
                      onSave={(subject, bodyHtml) => handleSave(t.key, subject, bodyHtml)}
                      extraActions={
                        t.isCustomized ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleReset(t.key)}
                            className="btn-outline inline-flex items-center gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset to default
                          </button>
                        ) : undefined
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
