/** getRandomValues chạy cả trên HTTP; randomUUID chỉ khả dụng trong secure context. */
export function createClientId(): string {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("Không có nguồn ngẫu nhiên bảo mật để tạo mã đơn");
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
