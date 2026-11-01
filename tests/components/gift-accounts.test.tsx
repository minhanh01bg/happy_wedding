import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  GiftAccounts,
  type GiftAccount,
} from "@/components/wedding/gift-accounts";

const groom: GiftAccount = {
  side: "Nhà trai",
  bank: "970422",
  account: "0123456789",
  name: "NGUYEN VAN A",
};
const bride: GiftAccount = {
  side: "Nhà gái",
  bank: "970436",
  account: "1111122222",
  name: "TRAN THI B",
};
const PNG = "data:image/png;base64,iVBORw0KGgo=";

/*
 * jsdom chưa có showModal/close. Bản giả dưới đây làm như trình duyệt: dialog
 * modal xếp chồng, Esc gửi `cancel` rồi đóng dialog trên cùng, `close` không
 * nổi bọt.
 */
const modalStack: HTMLDialogElement[] = [];
const dialogProto = HTMLDialogElement.prototype as {
  showModal?: () => void;
  close?: () => void;
};
const original = {
  showModal: dialogProto.showModal,
  close: dialogProto.close,
  getContext: HTMLCanvasElement.prototype.getContext,
  toDataURL: HTMLCanvasElement.prototype.toDataURL,
  createObjectURL: URL.createObjectURL,
  revokeObjectURL: URL.revokeObjectURL,
  isSecureContext: Object.getOwnPropertyDescriptor(window, "isSecureContext"),
};
function onEscape(event: KeyboardEvent) {
  const top = modalStack.at(-1);
  if (event.key !== "Escape" || !top) return;
  if (top.dispatchEvent(new Event("cancel", { cancelable: true }))) top.close();
}

let selected: string[];
let execResult: boolean;

beforeEach(() => {
  modalStack.length = 0;
  dialogProto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
    modalStack.push(this);
  };
  dialogProto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    modalStack.splice(modalStack.indexOf(this), 1);
    this.dispatchEvent(new Event("close"));
  };
  document.addEventListener("keydown", onEscape);

  // Thiệp chạy trên http: không có navigator.clipboard, phải dùng execCommand.
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    get: () => false,
  });
  selected = [];
  execResult = true;
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: vi.fn(() => {
      const field = document.activeElement as HTMLTextAreaElement;
      selected.push(
        field.value.slice(field.selectionStart, field.selectionEnd),
      );
      return execResult;
    }),
  });

  // Canvas giả để có ảnh PNG trong lớp xem lớn.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: "",
    fillRect: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => PNG);
  URL.createObjectURL = vi.fn(() => "blob:qr-mung-cuoi");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.removeEventListener("keydown", onEscape);
  dialogProto.showModal = original.showModal;
  dialogProto.close = original.close;
  HTMLCanvasElement.prototype.getContext = original.getContext;
  HTMLCanvasElement.prototype.toDataURL = original.toDataURL;
  URL.createObjectURL = original.createObjectURL;
  URL.revokeObjectURL = original.revokeObjectURL;
  if (original.isSecureContext)
    Object.defineProperty(window, "isSecureContext", original.isSecureContext);
  else delete (window as { isSecureContext?: boolean }).isSecureContext;
  delete (document as { execCommand?: unknown }).execCommand;
});

function openGiftBox(accounts: GiftAccount[] = [groom, bride]) {
  const view = render(<GiftAccounts accounts={accounts} />);
  const trigger = screen.getByRole("button", { name: /Mở hộp quà mừng cưới/ });
  fireEvent.click(trigger);
  const modal = screen.getByRole("dialog", { name: "Hộp quà yêu thương" });
  return { ...view, trigger, modal };
}

function card(side: string) {
  return screen.getByText(side, { exact: true }).closest("article")!;
}

describe("GiftAccounts cards", () => {
  it("shows each detail once, with a QR drawn in the page", () => {
    const { modal } = openGiftBox();
    expect(modal).toHaveAccessibleDescription(
      "Quét mã QR hoặc sao chép số tài khoản để gửi yêu thương",
    );
    expect(modal).not.toHaveTextContent(/GỬI CHÚT|MỪNG CƯỚI/);

    const groomCard = card("Nhà trai");
    const qrButton = within(groomCard).getByRole("button", {
      name: "Phóng to mã QR mừng cưới nhà trai của NGUYEN VAN A",
    });
    const qr = qrButton.querySelector("img")!;
    expect(qr.getAttribute("src")).toMatch(/^data:image\/svg\+xml,/);
    expect(
      within(groomCard).getByRole("heading", { name: "NGUYEN VAN A" }),
    ).toBeInTheDocument();
    expect(within(groomCard).getByText("MBBank")).toBeInTheDocument();

    // Tên, ngân hàng, số tài khoản: mỗi thứ đúng một lần trong thẻ.
    const text = groomCard.textContent ?? "";
    for (const detail of ["NGUYEN VAN A", "MBBank", "0123456789"])
      expect(text.split(detail)).toHaveLength(2);
    expect(card("Nhà gái")).toHaveTextContent("TRAN THI B");

    expect(modal.querySelector('img[src*="vietqr"]')).toBeNull();
    expect(modal.querySelector("a")).toBeNull();
  });

  it("copies the account without spaces on plain http and confirms for 2 seconds", async () => {
    openGiftBox();
    vi.useFakeTimers();
    const copy = screen.getByRole("button", {
      name: "Sao chép số tài khoản nhà trai",
    });
    expect(copy).toHaveTextContent("Sao chép STK");

    await act(async () => fireEvent.click(copy));
    expect(selected).toEqual(["0123456789"]);
    expect(copy).toHaveTextContent("Đã sao chép");
    expect(within(card("Nhà trai")).getByRole("status")).toHaveTextContent(
      "Đã sao chép số tài khoản nhà trai.",
    );
    // Textarea tạm đã được gỡ.
    expect(document.querySelector("textarea")).toBeNull();

    act(() => vi.advanceTimersByTime(2000));
    expect(copy).toHaveTextContent("Sao chép STK");
  });

  it("copies when the number itself is tapped", async () => {
    openGiftBox();
    const number = screen.getByRole("button", {
      name: "Sao chép số tài khoản 1111122222",
    });
    await act(async () => fireEvent.click(number));
    expect(selected).toEqual(["1111122222"]);
    expect(
      within(card("Nhà gái")).getByRole("button", {
        name: "Đã sao chép",
      }),
    ).toBeInTheDocument();
  });

  it("asks the guest to select the number by hand when copying fails", async () => {
    execResult = false;
    openGiftBox();
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Sao chép số tài khoản nhà gái" }),
      ),
    );
    expect(within(card("Nhà gái")).getByRole("status")).toHaveTextContent(
      "Chưa sao chép tự động được. Hãy chạm giữ số 1111122222 để chọn rồi sao chép.",
    );
  });

  it("shows an error state when the QR cannot be generated", () => {
    openGiftBox([{ ...groom, account: "9".repeat(120) }]);
    const groomCard = card("Nhà trai");
    expect(
      within(groomCard).getByText(
        "Chưa tạo được mã QR. Bạn vẫn chuyển khoản được bằng số tài khoản bên dưới.",
      ),
    ).toHaveAttribute("role", "status");
    expect(
      within(groomCard).queryByRole("button", { name: /Phóng to mã QR/ }),
    ).toBeNull();
    expect(
      within(groomCard).getByRole("button", {
        name: "Sao chép số tài khoản nhà trai",
      }),
    ).toBeInTheDocument();
  });

  it("keeps the illustrative cards for template previews", () => {
    render(<GiftAccounts accounts={[]} preview />);
    fireEvent.click(screen.getByRole("button", { name: /Mở hộp quà/ }));
    const modal = screen.getByRole("dialog", { name: "Hộp quà yêu thương" });
    expect(modal.querySelectorAll(".gift-demo-card")).toHaveLength(2);
    expect(modal).toHaveTextContent("không dùng để chuyển khoản");
    expect(screen.getByText("Nhà trai", { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Phóng to mã QR/ })).toBeNull();
  });
});

describe("GiftAccounts QR zoom", () => {
  function openZoom() {
    const box = openGiftBox();
    const qrButton = screen.getByRole("button", {
      name: "Phóng to mã QR mừng cưới nhà trai của NGUYEN VAN A",
    });
    fireEvent.click(qrButton);
    const zoom = screen.getByRole("dialog", {
      name: "Mã QR mừng cưới nhà trai",
    });
    return { ...box, qrButton, zoom };
  }

  it("opens a large QR in the page, with no link to a new tab", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const { zoom, modal } = openZoom();
    expect(zoom).toHaveAttribute("open");
    const image = within(zoom).getByRole("img", {
      name: "Mã QR mừng cưới nhà trai cho NGUYEN VAN A",
    });
    expect(image).toHaveAttribute("src", PNG);
    expect(
      within(zoom).getByRole("button", { name: "Đóng mã QR phóng to" }),
    ).toHaveFocus();
    expect(zoom).toHaveTextContent("Nhấn giữ ảnh để lưu vào máy");
    expect(zoom).toHaveTextContent("MBBank");
    expect(
      within(zoom).getByRole("button", {
        name: "Sao chép số tài khoản nhà trai",
      }),
    ).toBeInTheDocument();
    expect(modal.querySelector("a")).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("closes with Esc, returns focus to the QR and keeps the gift box open", () => {
    const { zoom, qrButton, modal, trigger } = openZoom();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(zoom).not.toHaveAttribute("open");
    expect(qrButton).toHaveFocus();
    expect(modal).toHaveAttribute("open");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(modal).not.toHaveAttribute("open");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes with the X button or a tap on the backdrop", () => {
    const { zoom, qrButton, modal } = openZoom();
    fireEvent.click(
      within(zoom).getByRole("button", { name: "Đóng mã QR phóng to" }),
    );
    expect(zoom).not.toHaveAttribute("open");
    expect(qrButton).toHaveFocus();

    fireEvent.click(qrButton);
    expect(zoom).toHaveAttribute("open");
    // Chạm vào chính phần tử dialog (ngoài khung trắng) là chạm nền.
    fireEvent.click(zoom);
    expect(zoom).not.toHaveAttribute("open");
    expect(qrButton).toHaveFocus();
    expect(modal).toHaveAttribute("open");
  });

  it("downloads the PNG through a[download] inside the page", () => {
    vi.useFakeTimers();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
      expect(this.closest("dialog")).toHaveAttribute("open");
    });
    const { zoom } = openZoom();
    fireEvent.click(within(zoom).getByRole("button", { name: "Tải ảnh QR" }));

    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe("qr-mung-cuoi-nha-trai.png");
    expect(clicked[0].getAttribute("href")).toBe("blob:qr-mung-cuoi");
    expect(clicked[0].target).toBe("");
    expect(clicked[0].isConnected).toBe(false);
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.type).toBe("image/png");
    expect(within(zoom).getByText("Đã tải ảnh QR về máy.")).toHaveAttribute(
      "role",
      "status",
    );
    expect(openSpy).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:qr-mung-cuoi");
  });

  it("falls back to the SVG and hides the download button without canvas", () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => null,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const { zoom } = openZoom();
    expect(
      within(zoom)
        .getByRole("img", { name: "Mã QR mừng cưới nhà trai cho NGUYEN VAN A" })
        .getAttribute("src"),
    ).toMatch(/^data:image\/svg\+xml,/);
    expect(
      within(zoom).queryByRole("button", { name: "Tải ảnh QR" }),
    ).toBeNull();
  });
});
