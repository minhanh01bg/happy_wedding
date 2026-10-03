import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/server/auth/require-admin-session";
import {
  weddingReport,
  reportPeriod,
  REPORT_PERIODS,
} from "@/server/wedding/reporting";
import { RevenueChart } from "@/components/wedding/revenue-chart";
import { money, dateLabel } from "@/lib/wedding";
import { STATUS_LABELS } from "@/components/wedding/status";
export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await requireAdminSession({ redirectToLogin: true });
  if (
    !session.identity ||
    !["owner", "manager"].includes(session.identity.role)
  )
    redirect("/login");
  const period = reportPeriod((await searchParams).period);
  const report = await weddingReport(period);
  const { recentOrders: orders } = report;
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">HỶ STUDIO / VẬN HÀNH</p>
          <h1>Tổng quan dịch vụ thiệp cưới</h1>
          <p>
            {report.activeTemplates} mẫu đang bán · Dữ liệu thực, không gồm
            thiệp minh họa.
          </p>
        </div>
        <Link href="/admin/orders?status=pending" className="button small">
          Kiểm tra thanh toán
        </Link>
      </div>
      <form className="panel report-filter">
        <label>
          Khoảng thời gian
          <select name="period" defaultValue={period}>
            {REPORT_PERIODS.map((days) => (
              <option key={days} value={days}>
                {days} ngày gần nhất
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Xem thống kê</button>
        <p className="fine">
          Từ {dateLabel(report.from)} đến{" "}
          {dateLabel(new Date(report.to.getTime() - 1))} · Giờ Việt Nam
        </p>
      </form>
      <div className="stats-grid">
        {[
          {
            label: "Tiền dịch vụ đã nhận trong kỳ",
            value: money(report.revenue),
            detail: `${report.paidOrders} đơn có giao dịch`,
            href: "/admin/orders?status=paid",
          },
          {
            label: "Tổng tiền dịch vụ đã nhận",
            value: money(report.allRevenue),
            detail: "Toàn bộ thời gian · không gồm tiền mừng",
            href: "/admin/orders?status=paid",
          },
          {
            label: "Khách hàng",
            value: report.customers,
            detail: `${report.activeCustomers} hoạt động · ${report.disabledCustomers} bị khóa`,
            href: "/admin/customers",
          },
          {
            label: "Khách đăng ký trong kỳ",
            value: report.newCustomers,
            detail: `Trong ${period} ngày gần nhất`,
            href: "/admin/customers",
          },
          {
            label: "Thiệp đang công khai",
            value: report.published,
            detail: `${report.invitations} thiệp đã tạo · ${report.suspended} tạm khóa`,
            href: "/admin/invitations",
          },
          {
            label: "Đơn chờ thanh toán",
            value: report.pending,
            detail: `${report.awaitingReview} đơn đã gửi ghi chú`,
            href: "/admin/orders?status=pending",
          },
          {
            label: "Mẫu đang cung cấp",
            value: report.activeTemplates,
            detail: `${report.templates} tổng · ${report.premiumTemplates} cao cấp đang bán`,
            href: "/admin/templates",
          },
          {
            label: "Gói đang cung cấp",
            value: report.activePlans,
            detail: `${report.plans} gói trong catalog`,
            href: "/admin/plans",
          },
        ].map((stat) => (
          <Link className="stat-card" href={stat.href} key={stat.label}>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
            <span className="fine">{stat.detail}</span>
          </Link>
        ))}
      </div>
      <section className="panel">
        <h2>Tiền dịch vụ theo thời gian</h2>
        <p className="report-comparison">
          Kỳ này: <strong>{money(report.revenue)}</strong> · {period} ngày liền
          trước: <strong>{money(report.previousRevenue)}</strong>
        </p>
        <p className="fine">
          Kỳ này có ngày hôm nay đang diễn ra; kỳ trước gồm đủ ngày. Đây là tiền
          đã nhận, chưa trừ chi phí.
        </p>
        <RevenueChart key={period} points={report.daily} />
      </section>
      <div className="admin-report-grid">
        <section className="panel">
          <h2>Gói được thanh toán trong kỳ</h2>
          {report.sales.length ? (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Gói trên đơn</th>
                    <th scope="col">Số đơn</th>
                    <th scope="col">Đã nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sales.map((sale) => (
                    <tr key={sale.name}>
                      <th scope="row">{sale.name}</th>
                      <td>{sale.orders}</td>
                      <td>{money(sale.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Chưa có giao dịch dịch vụ trong kỳ.</p>
          )}
        </section>
        <section className="panel">
          <h2>Việc cần xử lý</h2>
          <div className="admin-tasks">
            <Link href="/admin/orders?status=pending">
              {report.awaitingReview} đơn khách đã báo chuyển khoản →
            </Link>
            <Link href="/admin/invitations">
              {report.expired} thiệp đã xuất bản nhưng hết quyền hiển thị →
            </Link>
            <Link href="/admin/settings">
              Kiểm tra tài khoản nhận tiền & hỗ trợ →
            </Link>
            <Link href="/admin/templates">Xem và quản lý kho mẫu →</Link>
          </div>
        </section>
      </div>
      <section className="panel">
        <h2>Đơn dịch vụ gần đây</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Đơn</th>
                <th>Khách</th>
                <th>Thiệp</th>
                <th>Gói</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link className="muted-link" href={`/admin/orders/${o.id}`}>
                      {o.code}
                    </Link>
                    <p>{dateLabel(o.createdAt, true)}</p>
                  </td>
                  <td>{o.account.displayName}</td>
                  <td>
                    {o.invitation.groom} & {o.invitation.bride}
                  </td>
                  <td>{o.planName}</td>
                  <td>{money(o.total)}</td>
                  <td>
                    <span className={`badge ${o.status}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && (
            <p className="fine" style={{ padding: 25 }}>
              Chưa có đơn. Khách hàng tạo thiệp và chọn gói sẽ xuất hiện tại
              đây.
            </p>
          )}
        </div>
      </section>
      <div className="notice">
        Trước khi mở bán: cấu hình tài khoản nhận tiền và kênh hỗ trợ, xác nhận
        bảng giá và điều khoản dịch vụ. SePay là tích hợp tùy chọn được bật qua
        cấu hình máy chủ.
      </div>
    </>
  );
}
