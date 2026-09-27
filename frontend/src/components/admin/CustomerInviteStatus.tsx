"use client";

import { useQueryClient } from "@tanstack/react-query";
import { MailWarning, Send } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { resendCustomerInvite } from "@/lib/api/admin-customers";
import { qk } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";

/** Customer detail's contact-card footer: flags an unused set-password
 * invite and lets staff (re)send it. Sending a new link revokes the old
 * one, so only the latest email ever works. */
export function CustomerInviteStatus({
  customerId,
  email,
  invitePending,
}: {
  customerId: string;
  email: string;
  invitePending: boolean;
}) {
  const canManage = usePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const confirm = useConfirm();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  function handleSend() {
    confirm({
      message: invitePending
        ? `Resend the set-password invite to ${email}? The previous link will stop working.`
        : `Email ${email} a link to set a new password? Use this if they can't log in.`,
      confirmLabel: invitePending ? "Resend invite" : "Send link",
      processingLabel: "Sending…",
      onConfirm: async () => {
        try {
          await resendCustomerInvite(customerId);
          await queryClient.invalidateQueries({
            queryKey: qk.admin("customers", "detail", customerId),
          });
          showToast(`Invite sent to ${email}`, "success");
        } catch (err) {
          showToast(
            err instanceof ApiError ? err.message : "Couldn't send the invite.",
            "error",
          );
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      {invitePending && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <MailWarning className="h-3.5 w-3.5 shrink-0" />
          Invite sent — they haven&apos;t set a password yet.
        </p>
      )}
      {canManage && (
        <button
          type="button"
          onClick={handleSend}
          className="btn-ghost btn-sm w-fit cursor-pointer"
        >
          <Send className="h-4 w-4" />
          {invitePending ? "Resend invite" : "Send login link"}
        </button>
      )}
    </div>
  );
}
