/**
 * Payload VietQR (chuẩn EMVCo của NAPAS) cho chuyển khoản tới số tài khoản,
 * không kèm số tiền hay nội dung.
 *
 * Khớp từng ký tự với payload trong ảnh `img.vietqr.io/image/<BIN>-<STK>-*`
 * mà thiệp dùng trước đây (đã đối chiếu một lần với ảnh thật; ví dụ với tài
 * khoản giả nằm ở tests/lib/vietqr.test.ts).
 * Payload đó không chứa tên chủ tài khoản: app ngân hàng tự tra tên khi quét.
 */
export function vietQrPayload(bin: string, account: string): string {
  const beneficiary = tlv("00", bin) + tlv("01", account);
  const merchant =
    tlv("00", NAPAS_GUID) + tlv("01", beneficiary) + tlv("02", TO_ACCOUNT);
  const body =
    tlv("00", "01") + // Phiên bản payload
    tlv("01", "11") + // QR tĩnh: dùng lại nhiều lần, người chuyển tự nhập tiền
    tlv("38", merchant) +
    tlv("53", "704") + // VND
    tlv("58", "VN") +
    "6304";
  return body + crc16(body);
}

const NAPAS_GUID = "A000000727";
/** Dịch vụ chuyển nhanh NAPAS247 tới số tài khoản (không phải số thẻ). */
const TO_ACCOUNT = "QRIBFTTA";

function tlv(id: string, value: string) {
  if (value.length > 99) throw new RangeError(`Trường ${id} quá dài`);
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE (đa thức 0x1021, khởi tạo 0xFFFF), 4 ký tự hex in hoa. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
