/**
 * UUID v4 cho code chay tren trinh duyet.
 *
 * `crypto.randomUUID` chi co trong secure context (HTTPS hoac localhost), nen
 * tren mot server http thuong no khong ton tai. `crypto.getRandomValues` thi
 * van co, nen dung no de dung UUID v4 theo RFC 4122. Khong dung Math.random:
 * clientId cua RSVP la quyen cap nhat phan hoi cua mot trinh duyet, phai
 * khong doan duoc.
 */
export function randomUUID(): string {
  const { crypto } = globalThis;
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx (RFC 4122)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
