import { PlatformWhatsAppTemplateList } from "@/components/admin/PlatformWhatsAppTemplateList";

export default function PlatformWhatsAppTemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          WhatsApp Templates
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Which Meta-approved WhatsApp template each notification sends, and what data fills each
          placeholder.
        </p>
      </div>
      <PlatformWhatsAppTemplateList />
    </div>
  );
}
