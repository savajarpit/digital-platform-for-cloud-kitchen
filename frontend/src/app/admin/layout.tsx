import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPlatformTermsStatus } from "@/lib/auth/get-platform-terms-status";
import { AdminShell } from "@/components/admin/AdminShell";

const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "STAFF"];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/admin");
  }
  if (!ADMIN_ROLES.includes(session.role)) {
    redirect("/");
  }

  // Only OWNER signs the platform terms — a stale acceptance after Arpit
  // publishes a new version blocks the dashboard until they re-accept.
  // Backend PlatformTermsGuard is the real enforcement; this is just the
  // graceful redirect instead of every admin API call 403ing individually.
  if (session.role === "OWNER") {
    const status = await getPlatformTermsStatus();
    if (status && status.hasTerms && !status.accepted) {
      redirect("/platform-terms");
    }
  }

  return <AdminShell>{children}</AdminShell>;
}
