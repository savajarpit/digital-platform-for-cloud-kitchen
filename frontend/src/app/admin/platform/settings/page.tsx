import { PlatformSettingsCard } from "@/components/admin/PlatformSettingsCard";

export default function PlatformSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Platform Settings
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Technical toggles that apply across every tenant at once.
        </p>
      </div>
      <PlatformSettingsCard />
    </div>
  );
}
