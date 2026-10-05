import { merchantSchema, type MerchantSettings } from "@/lib/wedding";
import { prisma } from "@/server/db/prisma";

export async function merchantSettings(): Promise<MerchantSettings> {
  const row = await prisma.setting.findUnique({
    where: { key: "wedding.merchant" },
  });
  return row
    ? merchantSchema.parse(JSON.parse(row.value))
    : {
        bank: "",
        account: "",
        name: "",
        support: "Liên hệ quản trị viên để hỗ trợ thanh toán.",
        supportPhone: "",
        supportEmail: "",
      };
}
export function paymentReadiness(settings: MerchantSettings) {
  const bankReady = Boolean(settings.bank && settings.account && settings.name);
  const configured = Boolean(
    process.env.SEPAY_WEBHOOK_API_KEY &&
    process.env.SEPAY_WEBHOOK_API_KEY.length >= 32 &&
    process.env.SEPAY_ACCOUNT_NUMBER,
  );
  const accountMatches =
    configured && settings.account === process.env.SEPAY_ACCOUNT_NUMBER;
  return {
    bankReady,
    supportReady: Boolean(settings.supportPhone || settings.supportEmail),
    automaticReady: bankReady && configured && accountMatches,
    automaticMessage: !configured
      ? "Chưa bật SePay. Bạn có thể xác nhận thủ công sau khi đối chiếu sao kê."
      : !bankReady
        ? "Điền tài khoản nhận tiền dịch vụ trước khi dùng thanh toán tự động."
        : !accountMatches
          ? "Tài khoản nhận tiền đang khác tài khoản SePay trên máy chủ. Thanh toán tự động tạm ngừng; cần cập nhật cấu hình máy chủ cho cùng tài khoản."
          : "Cấu hình SePay và tài khoản nhận tiền khớp nhau. Cần kiểm tra giao dịch thử trước khi mở bán.",
  };
}
