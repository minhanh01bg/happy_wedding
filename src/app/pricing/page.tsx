import { Header, Footer } from "@/components/wedding/shell";
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
            <br />
            Giá dưới đây là giá khởi tạo của dự án, admin có thể điều chỉnh.
          </p>
        </div>
        <PlanCards plans={plans} />
        <section className="faq">
          <h2>Những điều bạn muốn biết</h2>
          {[
            [
              "Mua gói rồi có thể sửa thiệp không?",
              "Có. Bạn có thể chỉnh nội dung và ảnh trong thời gian gói còn hiệu lực. Muốn đổi đường dẫn thiệp đã xuất bản, hãy thu hồi trước và gửi lại link mới cho khách.",
            ],
            [
              "Thanh toán như thế nào?",
              "Chuyển khoản theo thông tin trên đơn, với đúng số tiền và mã đơn. Admin xác nhận sau khi kiểm tra giao dịch; hệ thống cũng hỗ trợ webhook SePay khi được cấu hình.",
            ],
            [
              "Khi gói hết hạn thì sao?",
              "Đường dẫn công khai ngừng hoạt động. Bạn vẫn xem và sửa dữ liệu trong tài khoản, hoặc mua thêm gói để gia hạn.",
            ],
            [
              "Có thể dùng thử mẫu cao cấp không?",
              "Có thể xem mẫu và tạo bản nháp. Để xuất bản mẫu cao cấp, chọn gói hỗ trợ Signature.",
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
