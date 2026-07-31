import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPlatformTermsStatus } from "@/lib/auth/get-platform-terms-status";
import { AcceptPlatformTermsForm } from "@/components/admin/AcceptPlatformTermsForm";

export default async function PlatformTermsAcceptancePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/platform-terms");
  if (session.role !== "OWNER") redirect("/admin");

  const status = await getPlatformTermsStatus();
  if (!status || !status.hasTerms || status.accepted) {
    redirect("/admin");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="card w-full max-w-2xl p-8">
        <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Updated Platform Terms
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Please review and accept the latest terms to continue using your admin dashboard.
        </p>
        <div className="mt-6 max-h-96 overflow-y-auto rounded-lg border border-zinc-200 p-4 text-sm whitespace-pre-wrap text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
          {status.content}
        </div>
        <div className="mt-6">
          <AcceptPlatformTermsForm version={status.latestVersion ?? 0} />
        </div>
      </div>
    </main>
  );
}
