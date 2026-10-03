import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { money, dateLabel } from "@/lib/wedding";
import { ConfirmPaymentForm } from "@/components/wedding/admin-form";
import { MutationButton } from "@/components/wedding/actions";
import { STATUS_LABELS } from "@/components/wedding/status";
export default async function AdminOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: (await params).id },
    include: {
      account: { select: { displayName: true, phoneNormalized: true } },
      invitation: { select: { groom: true, bride: true } },
      payments: true,
    },
  });
  if (!order) notFound();
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">KIỂM TRA THANH TOÁN</p>
          <h1>{order.code}</h1>
          <p>
            <span className={`badge ${order.status}`}>
              {STATUS_LABELS[order.status]}
            </span>{" "}
            · {dateLabel(order.createdAt, true)}
          </p>
        </div>
        <Link href="/admin/orders" className="button secondary small">
          ← Danh sách đơn
        </Link>
      </div>
      <div className="checkout-grid">
        <section className="panel">
          <h2>Xác nhận tiền thực nhận</h2>
          {order.paymentNote && (
            <p className="notice" style={{ marginBottom: 25 }}>
              Khách báo: {order.paymentNote}
            </p>
          )}
          {order.status === "pending" ? (
            <>
              <ConfirmPaymentForm id={order.id} total={order.total} />
              <div style={{ marginTop: 25 }}>
                <MutationButton
                  endpoint="admin/cancel-order"
                  data={{ id: order.id }}
                >
                  Hủy đơn chưa thanh toán
                </MutationButton>
              </div>
            </>
          ) : (
            <p className="notice success">
              {order.status === "paid"
                ? `Đã kích hoạt đến ${dateLabel(order.expiresAt!)}`
                : "Đơn đã hủy, không thể kích hoạt."}
            </p>
          )}
          {order.payments.map((p) => (
            <div className="bank-details" key={p.id}>
              <div>
                <span>Giao dịch</span>
                <strong>{p.transactionId}</strong>
              </div>
              <div>
                <span>Thực nhận</span>
                <strong>{money(p.amount)}</strong>
              </div>
              <div>
                <span>Xác nhận lúc</span>
                <strong>{dateLabel(p.receivedAt, true)}</strong>
              </div>
            </div>
          ))}
        </section>
        <aside className="panel">
          <h2>Chi tiết đơn</h2>
          <div className="bank-details">
            <div>
              <span>Khách hàng</span>
              <strong>{order.account.displayName}</strong>
            </div>
            <div>
              <span>Số điện thoại</span>
              <strong>{order.account.phoneNormalized}</strong>
            </div>
            <div>
              <span>Thiệp</span>
              <strong>
                {order.invitation.groom} & {order.invitation.bride}
              </strong>
            </div>
            <div>
              <span>Gói</span>
              <strong>{order.planName}</strong>
            </div>
            <div>
              <span>Thời hạn</span>
              <strong>{order.months} tháng</strong>
            </div>
            <div>
              <span>Album</span>
              <strong>{order.maxPhotos} ảnh</strong>
            </div>
            <div>
              <span>Thành tiền</span>
              <strong>{money(order.total)}</strong>
            </div>
          </div>
          <p className="fine">
            Chỉ xác nhận sau khi kiểm tra tiền đã vào tài khoản. Mã giao dịch
            không được dùng lại cho đơn khác.
          </p>
        </aside>
      </div>
    </>
  );
}
