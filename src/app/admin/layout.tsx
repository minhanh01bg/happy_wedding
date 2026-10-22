import { AdminShell } from "@/components/wedding/admin-shell";
import { requireAdminPage } from "@/server/auth/require-admin-session";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  return <AdminShell>{children}</AdminShell>;
}
