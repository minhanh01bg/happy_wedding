/**
 * Sao chép chữ vào clipboard, kể cả khi trang chạy trên http thường.
 *
 * `navigator.clipboard` chỉ có trong secure context (HTTPS hoặc localhost).
 * Trên http nó là `undefined`, nên khi đó dùng cách cũ: chọn chữ trong một
 * textarea ẩn rồi gọi `document.execCommand("copy")`. Cách này cũng là đường
 * lùi khi trình duyệt từ chối Clipboard API.
 *
 * Phải gọi ngay trong trình xử lý click: execCommand chỉ chạy khi có thao tác
 * của người dùng. Đường http không `await` gì trước execCommand.
 *
 * `trigger` là phần tử người dùng vừa bấm. Khi một `<dialog>` modal đang mở,
 * mọi thứ bên ngoài nó bị inert, nên textarea phải nằm trong chính dialog đó
 * mới chọn được chữ.
 *
 * Trả về `true` khi đã sao chép, `false` khi cả hai cách đều không được.
 */
export async function copyText(
  text: string,
  trigger?: Element | null,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Bị từ chối quyền hoặc trang không có focus: thử cách cũ bên dưới.
    }
  }
  return copyBySelection(text, trigger);
}

function copyBySelection(text: string, trigger?: Element | null): boolean {
  if (typeof document.execCommand !== "function") return false;
  const host = trigger?.closest("dialog[open]") ?? document.body;
  const previous =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const field = document.createElement("textarea");
  field.value = text;
  // readonly: iOS không bật bàn phím. 16px: iOS không phóng to khi focus.
  // Đặt ngoài màn hình thay vì display:none, vì iOS Safari không chọn được
  // chữ trong phần tử không hiển thị.
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  field.tabIndex = -1;
  Object.assign(field.style, {
    position: "fixed",
    top: "0",
    left: "-9999px",
    width: "1px",
    height: "1px",
    padding: "0",
    border: "0",
    opacity: "0",
    fontSize: "16px",
  });
  host.appendChild(field);
  try {
    field.focus({ preventScroll: true });
    field.select();
    // iOS Safari bỏ qua select(); setSelectionRange mới chọn được chữ.
    field.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    previous?.focus({ preventScroll: true });
  }
}
