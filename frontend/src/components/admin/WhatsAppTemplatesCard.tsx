"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import {
  ApiError,
  getWhatsAppTemplatePreviews,
  type WhatsAppTemplatePreview,
} from "@/lib/api/notification-templates";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";

const KEY_LABEL: Record<string, string> = {
  "order-confirmation-customer": "Order Confirmation (Customer)",
  "order-confirmation-owner": "Order Confirmation (Owner copy)",
  "subscription-disruption": "Subscription Disruption Notice",
  "signup-otp": "OTP Verification",
};

/** Honest by design: WhatsApp message wording is a Meta-approved template
 * that lives outside this app — this only previews which approved
 * template fires and which data fills each of its placeholders, it
 * doesn't let anyone rewrite the wording itself (see the backend's own
 * comment on PlatformWhatsAppTemplate for why). */
export function WhatsAppTemplatesCard() {
  const { showToast } = useToast();
  const canView = usePermission(PERMISSIONS.NOTIFICATION_TEMPLATES_WHATSAPP_EDIT);
  const [previews, setPreviews] = useState<WhatsAppTemplatePreview[] | null>(null);

  useEffect(() => {
    if (!canView) return;
    getWhatsAppTemplatePreviews()
      .then(setPreviews)
      .catch((err: unknown) =>
        showToast(err instanceof ApiError ? err.message : "Couldn't load WhatsApp preview.", "error"),
      );
  }, [canView, showToast]);

  return (
    <div className="card p-6">
      <div className="mb-2 flex items-center gap-2 text-primary-600">
        <MessageSquare className="h-4 w-4" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          WhatsApp Message Format
        </h3>
      </div>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        WhatsApp requires every message to use a template pre-approved by Meta — the wording
        itself can&apos;t be edited here. This shows exactly what will send and which of your
        order&apos;s details fill each part of it.
      </p>
      {!canView ? (
        <ViewOnlyNotice />
      ) : !previews ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {previews.map((p) => (
            <div key={p.key} className="py-3">
              <p className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {KEY_LABEL[p.key] ?? p.key}
              </p>
              <p className="mb-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                Template: {p.templateKey}
              </p>
              <div className="space-y-1">
                {p.placeholders.map((ph) => (
                  <div key={ph.paramKey} className="flex gap-2 text-xs">
                    <span className="w-40 shrink-0 text-zinc-500 dark:text-zinc-400">
                      {ph.label}
                    </span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {ph.sampleValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
