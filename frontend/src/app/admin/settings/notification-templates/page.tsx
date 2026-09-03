import { EmailTemplatesCard } from "@/components/admin/EmailTemplatesCard";
import { WhatsAppTemplatesCard } from "@/components/admin/WhatsAppTemplatesCard";

export default function NotificationTemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Message Templates
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Customize the wording of your order confirmation, welcome, and reset-password emails —
          still branded with your own logo and name. Email and WhatsApp are managed by separate
          permissions.
        </p>
      </div>
      <EmailTemplatesCard />
      <WhatsAppTemplatesCard />
    </div>
  );
}
