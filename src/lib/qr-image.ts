import QRCode from "qrcode";

/** Ma trận module của mã QR: `dark[row * size + col]`. */
export type QrMatrix = { size: number; dark: boolean[] };

/** Tạo ma trận QR mức sửa lỗi M. Ném lỗi khi dữ liệu quá dài cho QR. */
export function createQrMatrix(text: string): QrMatrix {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  return { size: modules.size, dark: Array.from(modules.data, Boolean) };
}

/**
 * Ảnh SVG dạng data URL: nét sắc ở mọi cỡ, không cần canvas nên tạo được cả
 * lúc render trên server. `margin` tính bằng số module.
 */
export function qrSvgDataUrl(matrix: QrMatrix, margin = 1): string {
  const full = matrix.size + margin * 2;
  let path = "";
  for (let row = 0; row < matrix.size; row++) {
    let col = 0;
    while (col < matrix.size) {
      if (!matrix.dark[row * matrix.size + col]) {
        col++;
        continue;
      }
      let run = 1;
      while (
        col + run < matrix.size &&
        matrix.dark[row * matrix.size + col + run]
      )
        run++;
      path += `M${col + margin} ${row + margin}h${run}v1h-${run}z`;
      col += run;
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" width="${full * 8}" height="${full * 8}" shape-rendering="crispEdges">` +
    `<rect width="${full}" height="${full}" fill="#fff"/><path fill="#111" d="${path}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Ảnh PNG dạng data URL, vẽ bằng canvas trong trình duyệt. Dùng cho lớp xem
 * lớn và nút tải: nhấn giữ hay tải về đều ra PNG mà thư viện ảnh và app ngân
 * hàng đọc được (SVG thì không). Trả `null` khi trình duyệt không vẽ được.
 */
export function qrPngDataUrl(
  matrix: QrMatrix,
  { scale = 12, margin = 4 } = {},
): string | null {
  try {
    const full = (matrix.size + margin * 2) * scale;
    const canvas = document.createElement("canvas");
    canvas.width = full;
    canvas.height = full;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, full, full);
    context.fillStyle = "#111";
    matrix.dark.forEach((dark, index) => {
      if (!dark) return;
      const row = Math.floor(index / matrix.size);
      const col = index % matrix.size;
      context.fillRect(
        (col + margin) * scale,
        (row + margin) * scale,
        scale,
        scale,
      );
    });
    const url = canvas.toDataURL("image/png");
    return url.startsWith("data:image/png") ? url : null;
  } catch {
    return null;
  }
}

/**
 * Tải một data URL về máy bằng `a[download]` trỏ tới blob, ngay trong trang,
 * không mở tab mới. Chạy đồng bộ trong trình xử lý click để iOS Safari còn
 * coi là thao tác của người dùng. Link tạm nằm trong dialog đang mở vì mọi thứ
 * bên ngoài dialog modal đều inert.
 */
export function downloadDataUrl(
  dataUrl: string,
  fileName: string,
  trigger?: Element | null,
): boolean {
  try {
    const comma = dataUrl.indexOf(",");
    const type =
      /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? "application/octet-stream";
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    (trigger?.closest("dialog[open]") ?? document.body).append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}
