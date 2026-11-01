import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyText } from "@/lib/copy-text";

/**
 * Thiệp chạy trên http thường (không phải secure context), nơi trình duyệt
 * không có navigator.clipboard. Sao chép vẫn phải chạy bằng execCommand.
 */
const secureDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "isSecureContext",
);

function setSecureContext(value: boolean) {
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    get: () => value,
  });
}

function setClipboard(writeText?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

/** execCommand giả: ghi lại chữ đang được chọn trong textarea lúc copy. */
function mockExecCommand(result: boolean | Error = true) {
  const selected: string[] = [];
  const execCommand = vi.fn((command: string) => {
    const field = document.activeElement;
    if (command === "copy" && field instanceof HTMLTextAreaElement) {
      selected.push(
        field.value.slice(field.selectionStart, field.selectionEnd),
      );
      expect(field).toHaveAttribute("readonly");
    }
    if (result instanceof Error) throw result;
    return result;
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
  return { execCommand, selected };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  if (secureDescriptor)
    Object.defineProperty(window, "isSecureContext", secureDescriptor);
  else delete (window as { isSecureContext?: boolean }).isSecureContext;
  delete (navigator as { clipboard?: unknown }).clipboard;
  delete (document as { execCommand?: unknown }).execCommand;
});

describe("copyText", () => {
  it("uses the Clipboard API in a secure context", async () => {
    setSecureContext(true);
    const writeText = vi.fn(async () => {});
    setClipboard(writeText);
    const { execCommand } = mockExecCommand();

    await expect(copyText("1111122222")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("1111122222");
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("copies through a hidden textarea on plain http", async () => {
    setSecureContext(false);
    setClipboard(undefined);
    const { execCommand, selected } = mockExecCommand();
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();

    await expect(copyText("1111122222", button)).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(selected).toEqual(["1111122222"]);
    // Gỡ textarea và trả focus cho nút vừa bấm.
    expect(document.querySelector("textarea")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("falls back to execCommand when the Clipboard API refuses", async () => {
    setSecureContext(true);
    setClipboard(vi.fn(async () => Promise.reject(new Error("denied"))));
    const { selected } = mockExecCommand();

    await expect(copyText("3333344444")).resolves.toBe(true);
    expect(selected).toEqual(["3333344444"]);
  });

  it("puts the textarea inside the open modal dialog that holds the button", async () => {
    setSecureContext(false);
    setClipboard(undefined);
    const dialog = document.createElement("dialog");
    dialog.setAttribute("open", "");
    const button = document.createElement("button");
    dialog.append(button);
    document.body.append(dialog);
    let host: Element | null = null;
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => {
        host = document.querySelector("textarea")?.parentElement ?? null;
        return true;
      }),
    });

    await expect(copyText("1111122222", button)).resolves.toBe(true);
    expect(host).toBe(dialog);
    expect(dialog.querySelector("textarea")).toBeNull();
  });

  it("returns false when both ways fail", async () => {
    setSecureContext(true);
    setClipboard(vi.fn(async () => Promise.reject(new Error("denied"))));
    mockExecCommand(false);
    await expect(copyText("1111122222")).resolves.toBe(false);

    mockExecCommand(new Error("not allowed"));
    await expect(copyText("1111122222")).resolves.toBe(false);
    expect(document.querySelector("textarea")).toBeNull();

    setSecureContext(false);
    setClipboard(undefined);
    delete (document as { execCommand?: unknown }).execCommand;
    await expect(copyText("1111122222")).resolves.toBe(false);
  });
});
