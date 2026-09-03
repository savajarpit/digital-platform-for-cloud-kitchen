import { PlatformEmailTemplateList } from "@/components/admin/PlatformEmailTemplateList";

export default function PlatformEmailTemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Email Templates
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every email OkaySync sends — platform notifications and the default wording tenants
          inherit until they customize their own.
        </p>
      </div>
      <PlatformEmailTemplateList />
    </div>
  );
}
