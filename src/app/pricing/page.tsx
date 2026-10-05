import { Header, Footer } from "@/components/wedding/shell";
import {
  PlanComparison,
  SharedPlanBenefits,
} from "@/components/wedding/plan-comparison";
import { PlanCards } from "@/components/wedding/plan-cards";
import { prisma } from "@/server/db/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Gói dịch vụ" };
export default async function Pricing() {
  const plans = await prisma.servicePlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <>
      <Header />
      <main className="section">
        <div className="page-intro centered">
          <p className="eyebrow">MỘT LẦN THANH TOÁN, NHIỀU ĐIỀU ĐÁNG NHỚ</p>
          <h1>
            Đủ đầy cho ngày <em>chung đôi.</em>
          </h1>
          <p>
            Tạo và xem bản nháp miễn phí. Chỉ mua gói khi đã sẵn sàng xuất bản.
            Mỗi gói dành cho một thiệp; thời hạn bắt đầu khi thanh toán được xác
            nhận.
          </p>
        </div>
        {plans.length ? (
          <PlanCards plans={plans} />
        ) : (
          <p className="notice">
            Chưa có gói đang được cung cấp. Bạn vẫn có thể tạo và xem bản nháp
            miễn phí.
          </p>
        )}
        <SharedPlanBenefits />
        <PlanComparison plans={plans} />
        <section className="faq">
          <h2>Những điều bạn muốn biết</h2>
          {[
            [
              "Nên chọn gói theo nhu cầu nào?",
              "Nếu cần một lời mời gọn gàng, chọn gói đủ số ảnh và thời gian bạn cần. Nếu muốn mẫu cao cấp, nhiều ảnh hơn hoặc ẩn thương hiệu, xem các quyền lợi tương ứng trong bảng. Các gói đều có QR hai bên, lịch tiệc, xác nhận tham dự và quản lý phản hồi.",
            ],
            [
              "Gia hạn có giữ nguyên link và nội dung không?",
              "Có. Mua thêm gói cho chính thiệp đang dùng để giữ link và nội dung. Khi thanh toán được xác nhận, thời hạn mới nối tiếp hạn còn lại, hoặc bắt đầu từ lúc xác nhận nếu đã hết hạn. Các đơn giữ quyền lợi riêng; hệ thống không cộng dồn số ảnh giữa các gói hay tự trừ tiền gói cũ.",
            ],
            [
              "Mua gói rồi có thể sửa thiệp không?",
              "Có. Bạn có thể chỉnh nội dung và ảnh trong thời gian gói còn hiệu lực. Muốn đổi đường dẫn thiệp đã xuất bản, hãy thu hồi trước và gửi lại link mới cho khách.",
            ],
            [
              "Thanh toán như thế nào?",
              "Chuyển khoản theo thông tin trên đơn, với đúng số tiền và mã đơn. Gói được kích hoạt sau khi giao dịch được kiểm tra và xác nhận. Nút báo đã chuyển giúp yêu cầu kiểm tra, không tự kích hoạt gói.",
            ],
            [
              "Khi gói hết hạn thì sao?",
              "Đường dẫn công khai ngừng hoạt động. Dữ liệu vẫn được giữ trong tài khoản để xem lại. Mua thêm gói để gia hạn và tiếp tục dùng quyền lợi; nếu chưa gia hạn, giới hạn bản nháp là 12 ảnh.",
            ],
            [
              "Có thể dùng thử mẫu cao cấp không?",
              "Có thể xem mẫu và tạo bản nháp. Để xuất bản mẫu cao cấp, chọn gói có quyền sử dụng mẫu cao cấp trong bảng so sánh.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
