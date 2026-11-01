import { describe, expect, it } from "vitest";
import { createQrMatrix, qrSvgDataUrl } from "@/lib/qr-image";
import { crc16, vietQrPayload } from "@/lib/vietqr";

/**
 * Payload của một tài khoản giả, CRC tính riêng một lần bằng Python (không qua
 * `crc16`). Bộ dựng đã đối chiếu một lần với ảnh img.vietqr.io thật; tài khoản
 * thật cố ý không lưu ở đây.
 */
const ACCOUNT = "0123456789";
const VIETQR_PAYLOAD =
  "00020101021138540010A00000072701240006970422011001234567890208QRIBFTTA53037045802VN6304B1A7";

/** Tách chuỗi EMVCo thành các trường: 2 ký tự mã, 2 ký tự độ dài, giá trị. */
function parseTlv(text: string) {
  const fields: Record<string, string> = {};
  let index = 0;
  while (index < text.length) {
    const id = text.slice(index, index + 2);
    const length = Number(text.slice(index + 2, index + 4));
    expect(Number.isInteger(length)).toBe(true);
    fields[id] = text.slice(index + 4, index + 4 + length);
    expect(fields[id]).toHaveLength(length);
    index += 4 + length;
  }
  return fields;
}

describe("vietQrPayload", () => {
  it("matches the payload computed independently for a fake account", () => {
    expect(vietQrPayload("970422", ACCOUNT)).toBe(VIETQR_PAYLOAD);
  });

  it("decodes back to the bank BIN, the account number and a valid CRC", () => {
    const payload = vietQrPayload("970422", ACCOUNT);
    const fields = parseTlv(payload);
    expect(fields["00"]).toBe("01");
    expect(fields["01"]).toBe("11");
    expect(fields["53"]).toBe("704");
    expect(fields["58"]).toBe("VN");
    // Không có số tiền, nội dung hay tên: chỉ là QR tài khoản.
    expect(Object.keys(fields).sort()).toEqual([
      "00",
      "01",
      "38",
      "53",
      "58",
      "63",
    ]);

    const merchant = parseTlv(fields["38"]);
    expect(merchant["00"]).toBe("A000000727");
    expect(merchant["02"]).toBe("QRIBFTTA");
    const beneficiary = parseTlv(merchant["01"]);
    expect(beneficiary).toEqual({ "00": "970422", "01": ACCOUNT });

    expect(payload.slice(-8, -4)).toBe("6304");
    expect(fields["63"]).toBe(crc16(payload.slice(0, -4)));
    expect(fields["63"]).toBe("B1A7");
  });

  it("computes CRC-16/CCITT-FALSE", () => {
    // Giá trị kiểm chuẩn của CRC-16/CCITT-FALSE.
    expect(crc16("123456789")).toBe("29B1");
  });

  it("keeps each account separate", () => {
    const groom = parseTlv(
      parseTlv(parseTlv(vietQrPayload("970436", "1111122222"))["38"])["01"],
    );
    expect(groom).toEqual({ "00": "970436", "01": "1111122222" });
  });
});

describe("QR image", () => {
  it("draws a square QR with no text in it", () => {
    const matrix = createQrMatrix(VIETQR_PAYLOAD);
    expect(matrix.dark).toHaveLength(matrix.size * matrix.size);
    // Ba ô định vị góc: hàng đầu tiên bắt đầu bằng 7 module tối.
    expect(matrix.dark.slice(0, 7)).toEqual(Array(7).fill(true));

    const url = qrSvgDataUrl(matrix);
    expect(url.startsWith("data:image/svg+xml,")).toBe(true);
    const svg = decodeURIComponent(url.slice("data:image/svg+xml,".length));
    expect(svg).toMatch(/viewBox="0 0 (\d+) \1"/);
    expect(svg).not.toContain("<text");
    expect(svg).not.toContain(ACCOUNT);
  });
});
