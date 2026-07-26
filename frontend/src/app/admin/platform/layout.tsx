import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";

/**
 * The parent `/admin` layout already gates SUPER_ADMIN/OWNER/STAFF in — this
 * nested layout narrows further, since tenant provisioning and cross-tenant
 * credential/permission/feature management are SUPER_ADMIN-only (an OWNER
 * managing their own storefront settings should never reach this tree).
 */
export default async function PlatformLayout({ children }: LayoutProps<"/admin/platform">) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  return <>{children}</>;
}
