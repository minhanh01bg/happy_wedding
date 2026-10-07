import { redirect } from "next/navigation";
import { AdminShell } from "@/components/wedding/admin-shell";
import { requireAdminSession } from "@/server/auth/require-admin-session";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession({ redirectToLogin: true });
  if (
    !session.identity ||
    !["owner", "manager"].includes(session.identity.role)
  )
    redirect("/login");
  return <AdminShell>{children}</AdminShell>;
}
