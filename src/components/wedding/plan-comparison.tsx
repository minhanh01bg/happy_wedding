import type { ServicePlan } from "@prisma/client";
import { money } from "@/lib/wedding";

export function PlanComparison({ plans }: { plans: ServicePlan[] }) {
  if (!plans.length) return null;
  const rows: [string, (plan: ServicePlan) => string][] = [
    ["Giá cho một thiệp", (p) => money(p.price)],
    ["Thời hạn", (p) => `${p.months} tháng`],
    ["Ảnh trong album", (p) => `${p.maxPhotos} ảnh`],
    [
      "Mẫu được sử dụng",
      (p) => (p.premiumTemplates ? "Tất cả mẫu, gồm cao cấp" : "Mẫu cơ bản"),
    ],
    [
      "Thương hiệu trên thiệp",
      (p) => (p.removeBranding ? "Có thể ẩn" : "Hiển thị Hỷ Studio"),
    ],
  ];
  return (
    <section
      className="plan-comparison"
      aria-labelledby="plan-comparison-title"
    >
      <h2 id="plan-comparison-title">So sánh các gói</h2>
      <p>Chọn số ảnh, thời gian lưu thiệp và phong cách phù hợp với hai bạn.</p>
      <p className="fine">
        Trên điện thoại, vuốt bảng sang ngang để xem các gói.
      </p>
      <div
        className="plan-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Bảng so sánh gói, có thể cuộn ngang"
      >
        <table>
          <caption>Quyền lợi của các gói đang được cung cấp</caption>
          <thead>
            <tr>
              <th scope="col">Quyền lợi</th>
              {plans.map((p) => (
                <th scope="col" key={p.id}>
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {plans.map((p) => (
                  <td key={p.id}>{value(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine">
        Giá và quyền lợi được chốt trên đơn trước khi thanh toán.
      </p>
    </section>
  );
}
export function SharedPlanBenefits() {
  return (
    <section
      className="shared-plan-benefits"
      aria-labelledby="shared-benefits-title"
    >
      <h2 id="shared-benefits-title">Gói nào cũng có lời mời đủ đầy</h2>
      <div className="grid-two">
        <div>
          <h3>Cho hai bạn</h3>
          <ul>
            <li>Tên hai người, thông tin gia đình, câu chuyện và album ảnh.</li>
            <li>Lịch tiệc hai nhà, địa điểm, chỉ đường và thêm vào lịch.</li>
            <li>Hai tài khoản QR mừng cưới riêng cho nhà trai và nhà gái.</li>
            <li>
              Nhạc nền tùy chọn, hiệu ứng mở thiệp và hiển thị trên điện thoại.
            </li>
          </ul>
        </div>
        <div>
          <h3>Cho việc đón khách</h3>
          <ul>
            <li>Khách xem thiệp và xác nhận tham dự mà không cần đăng nhập.</li>
            <li>
              Tối đa 2.000 lời mời riêng có tên khách; tự gửi qua kênh bạn chọn.
            </li>
            <li>
              Theo dõi số người dự từng tiệc, duyệt lời chúc trước khi hiển thị.
            </li>
            <li>Xuất danh sách phản hồi dạng CSV để chuẩn bị đón tiếp.</li>
          </ul>
        </div>
      </div>
      <p>
        Bạn có thể tạo bản nháp miễn phí, thử mẫu và lưu tối đa 12 ảnh trước khi
        mua gói. QR mừng cưới chuyển tới tài khoản của hai bạn, riêng với tiền
        mua dịch vụ.
      </p>
    </section>
  );
}
