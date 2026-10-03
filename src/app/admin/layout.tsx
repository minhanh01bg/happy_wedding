import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/wedding/shell";
import { Logout } from "@/components/wedding/actions";
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
  return (
    <>
      <header className="workspace-header">
        <Brand />
        <span className="eyebrow">QUẢN TRỊ DỊCH VỤ</span>
        <div>
          <Link className="text-link" href="/">
            Xem website ↗
          </Link>
          <Logout admin />
        </div>
      </header>
      <main className="workspace">
        <nav className="admin-navigation" aria-label="Quản trị">
          {[
            ["/admin", "Tổng quan"],
            ["/admin/orders", "Đơn dịch vụ"],
            ["/admin/templates", "Mẫu thiệp"],
            ["/admin/plans", "Gói dịch vụ"],
            ["/admin/invitations", "Thiệp khách hàng"],
            ["/admin/customers", "Khách hàng"],
            ["/admin/settings", "Cấu hình"],
            ["/admin/audit", "Nhật ký"],
          ].map(([href, label]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </main>
    </>
  );
}
