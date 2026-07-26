import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
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

  return <AdminShell>{children}</AdminShell>;
}
