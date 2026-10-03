import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireCustomerSession } from "@/server/customer-auth/session";
import { merchantSettings } from "@/server/wedding/settings";
import { money, dateLabel } from "@/lib/wedding";
import { PaymentNote } from "@/components/wedding/checkout";
import { RefreshButton, CopyButton } from "@/components/wedding/actions";
import { STATUS_LABELS } from "@/components/wedding/status";
export default async function Order({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerSession();
  const order = await prisma.serviceOrder.findFirst({
    where: { id: (await params).id, accountId: session.accountId },
    include: {
      invitation: { select: { id: true, groom: true, bride: true } },
      payments: { select: { receivedAt: true, amount: true, provider: true } },
    },
  });
  if (!order) notFound();
  const merchant = await merchantSettings();
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">ĐƠN DỊCH VỤ</p>
          <h1>{order.code}</h1>
          <p>
            Đã tạo {dateLabel(order.createdAt, true)} ·{" "}
            <span className={`badge ${order.status}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </p>
        </div>
        <RefreshButton />
      </div>
      <div className="checkout-grid">
        <section className="panel">
          <h2>
            {order.status === "paid"
              ? "Lời mời đã sẵn sàng xuất bản."
              : order.status === "cancelled"
                ? "Đơn đã được hủy."
                : "Thanh toán cho ngày vui."}
          </h2>
          {order.status === "paid" ? (
            <>
              <p className="notice success">
                Thanh toán đã được xác nhận. Gói có hiệu lực đến{" "}
                {dateLabel(order.expiresAt!)}.
              </p>
              <Link
                className="button"
                href={`/dashboard/${order.invitationId}`}
                style={{ marginTop: 25 }}
              >
                Về thiệp & xuất bản
              </Link>
            </>
          ) : order.status === "pending" ? (
            <>
              {merchant.bank && merchant.account && merchant.name ? (
                <>
                  <p>Chuyển khoản đúng số tiền và nội dung bên dưới.</p>
                  <div className="qr-box">
                    <Image
                      src={`https://img.vietqr.io/image/${merchant.bank}-${merchant.account}-compact2.png?amount=${order.total}&addInfo=${order.code}&accountName=${encodeURIComponent(merchant.name)}`}
                      alt="QR thanh toán đơn dịch vụ"
                      width={240}
                      height={290}
                      unoptimized
                    />
                  </div>
                  <div className="bank-details">
                    <div>
                      <span>BIN ngân hàng</span>
                      <strong>{merchant.bank}</strong>
                    </div>
                    <div>
                      <span>Chủ tài khoản</span>
                      <strong>{merchant.name}</strong>
                    </div>
                    <div>
                      <span>Số tài khoản</span>
                      <strong>{merchant.account}</strong>
                    </div>
                    <div>
                      <span>Số tiền</span>
                      <strong>{money(order.total)}</strong>
                    </div>
                    <div>
                      <span>Nội dung</span>
                      <strong>{order.code}</strong>
                    </div>
                  </div>
                  <CopyButton
                    value={order.code}
                    label="Sao chép nội dung chuyển khoản"
                  />
                </>
              ) : (
                <div className="notice">
                  Chủ dịch vụ chưa cấu hình tài khoản nhận tiền. Vui lòng liên
                  hệ hỗ trợ trước khi thanh toán. {merchant.support}
                </div>
              )}
              <p className="fine" style={{ margin: "22px 0" }}>
                {merchant.support} · Quản trị viên sẽ kiểm tra giao dịch trước
                khi kích hoạt. Nếu chưa cập nhật, bấm “Kiểm tra trạng thái”.
              </p>
              <PaymentNote id={order.id} />
              {order.paymentNote && (
                <p className="fine" style={{ marginTop: 15 }}>
                  Ghi chú đã gửi: {order.paymentNote}
                </p>
              )}
            </>
          ) : (
            <Link
              className="button"
              href={`/dashboard/orders/new?invitation=${order.invitationId}`}
            >
              Tạo đơn mới
            </Link>
          )}
        </section>
        <aside className="panel">
          <h2>Thông tin đã chốt</h2>
          <p>
            {order.invitation.groom} & {order.invitation.bride}
          </p>
          <div className="bank-details">
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
              <span>Mẫu cao cấp</span>
              <strong>{order.premiumTemplates ? "Có" : "Không"}</strong>
            </div>
            <div>
              <span>Ẩn thương hiệu</span>
              <strong>{order.removeBranding ? "Có" : "Không"}</strong>
            </div>
            <div>
              <span>Thành tiền</span>
              <strong>{money(order.total)}</strong>
            </div>
          </div>
          <p className="fine">
            Quyền lợi và giá trên đơn được giữ nguyên khi admin thay đổi bảng
            giá.
          </p>
          <Link className="text-link" href="/dashboard/orders">
            ← Tất cả đơn dịch vụ
          </Link>
        </aside>
      </div>
    </>
  );
}
