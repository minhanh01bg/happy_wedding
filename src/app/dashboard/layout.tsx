import Link from "next/link";
import { Brand } from "@/components/wedding/shell";
import { Logout } from "@/components/wedding/actions";
import { getOptionalCustomerSession } from "@/server/customer-auth/session";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOptionalCustomerSession();
  if (!session) return children;
  return (
    <>
      <header className="workspace-header">
        <Brand />
        <nav className="workspace-nav" aria-label="Không gian khách hàng">
          <Link href="/dashboard">Thiệp của tôi</Link>
          <Link href="/dashboard/orders">Đơn dịch vụ</Link>
          <Link href="/templates">Bộ sưu tập</Link>
          <Link href="/support">Hướng dẫn & hỗ trợ</Link>
        </nav>
        <div>
          <span className="fine">{session.account.displayName}</span>
          <Logout />
        </div>
      </header>
      <main className="workspace">{children}</main>
    </>
  );
}
