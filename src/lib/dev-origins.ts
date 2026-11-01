/**
 * Đọc `ALLOWED_DEV_ORIGINS`: danh sách hostname, cách nhau bằng dấu phẩy, mà
 * `next dev` cho phép gọi tài nguyên dev (`/_next/*`, HMR). Cần khi thiệp được
 * xem qua một domain khác hostname server, ví dụ reverse proxy HTTPS.
 *
 * Next chỉ so hostname của header `Origin`/`Referer`, nên mỗi mục là hostname
 * trần, không scheme, không port, không đường dẫn. Mục `https://...` hay
 * `...:443` sẽ không bao giờ khớp, nên bị từ chối ngay khi nạp config thay vì
 * để trang hỏng âm thầm. Ký tự đại diện theo Next: `*` thay đúng một nhãn,
 * `**` (chỉ ở đầu) thay một hoặc nhiều nhãn.
 */
const LABEL = /^[a-z0-9-]+$/i;

function isHostnamePattern(entry: string): boolean {
  const labels = entry.split(".");
  // `*` hay `**` đứng một mình không khớp hostname nào trong Next.
  if (labels.every((label) => label === "*" || label === "**")) return false;
  return labels.every(
    (label, index) =>
      LABEL.test(label) || label === "*" || (label === "**" && index === 0),
  );
}

export function parseAllowedDevOrigins(value: string | undefined): string[] {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const entry of entries) {
    if (!isHostnamePattern(entry)) {
      throw new Error(
        `ALLOWED_DEV_ORIGINS: "${entry}" is not a hostname; list bare hostnames such as thiep.example.com or *.example.com, without scheme, port or path`,
      );
    }
  }
  return entries;
}
