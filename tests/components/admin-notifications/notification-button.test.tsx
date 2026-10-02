import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationButton } from "@/features/admin-notifications/notification-button";
import { NotificationProvider } from "@/features/admin-notifications/notification-provider";

const response = {
  data: {
    items: [
      {
        id: "notification-1",
        kind: "online_order_created",
        title: "Có đơn online mới",
        body: "Đơn DH1001 · 50.000 ₫",
        entityType: "order",
        entityId: "order-1",
        href: "/admin/orders/order-1",
        createdAt: "2026-09-06T10:00:00.000Z",
        readAt: null,
      },
    ],
    nextCursor: null,
    unreadCount: 1,
    cutoff: "2026-09-06T10:00:01.000Z",
  },
};

describe("NotificationButton", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => response }),
    );
  });

  it("hiện badge, panel và link order chính xác", async () => {
    render(
      <NotificationProvider>
        <NotificationButton />
      </NotificationProvider>,
    );
    expect(await screen.findByTestId("notification-badge")).toHaveTextContent(
      "1",
    );
    fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));
    expect(
      screen.getByRole("link", { name: /Có đơn online mới/ }),
    ).toHaveAttribute("href", "/admin/orders/order-1");
    fireEvent.click(screen.getByRole("button", { name: /Đánh dấu đã đọc/ }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/notifications/read",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("panel thông báo có z-index cao nhất (z-[100]) khi mở ra", async () => {
    render(
      <NotificationProvider>
        <NotificationButton />
      </NotificationProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));
    const panel = screen.getByRole("region", { name: "Thông báo quản trị" });
    expect(panel).toHaveClass("z-[100]");
  });

  it("Escape đóng panel và trả focus về nút chuông", async () => {
    render(
      <NotificationProvider>
        <NotificationButton />
      </NotificationProvider>,
    );
    const trigger = screen.getByRole("button", { name: /Thông báo/ });
    fireEvent.click(trigger);
    expect(
      screen.getByRole("region", { name: "Thông báo quản trị" }),
    ).toHaveClass("animate-popover-enter");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("region", { name: "Thông báo quản trị" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("bấm ra ngoài panel thì đóng, bấm trong panel thì không", async () => {
    render(
      <>
        <NotificationProvider>
          <NotificationButton />
        </NotificationProvider>
        <main>Nội dung trang</main>
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));
    const panel = screen.getByRole("region", { name: "Thông báo quản trị" });

    fireEvent.pointerDown(panel);
    expect(
      screen.getByRole("region", { name: "Thông báo quản trị" }),
    ).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByText("Nội dung trang"));
    expect(
      screen.queryByRole("region", { name: "Thông báo quản trị" }),
    ).not.toBeInTheDocument();
  });

  it("không có thông báo thì hiện EmptyState chung của kit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { ...response.data, items: [], unreadCount: 0 },
        }),
      }),
    );
    render(
      <NotificationProvider>
        <NotificationButton />
      </NotificationProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));

    const title = await screen.findByText("Chưa có thông báo");
    expect(title.closest('[data-slot="empty-state"]')).not.toBeNull();
  });
  it("tải trang cursor và giữ thông báo cũ khi tải thêm lỗi", async () => {
    const first = { ...response.data, nextCursor: "older-cursor" };
    const older = { ...first.items[0], id: "older", title: "Thông báo cũ" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: first }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ...first,
            items: [first.items[0], older],
            nextCursor: "last-cursor",
          },
        }),
      })
      .mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <NotificationProvider>
        <NotificationButton />
      </NotificationProvider>,
    );
    await screen.findByTestId("notification-badge");
    fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));

    fireEvent.click(
      await screen.findByRole("button", { name: "Tải thêm thông báo" }),
    );
    expect(await screen.findByText("Thông báo cũ")).toBeInTheDocument();
    expect(screen.getAllByText(first.items[0].title)).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("?limit=6"),
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("cursor=older-cursor"),
      expect.anything(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Tải thêm thông báo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải");
    expect(screen.getByText("Thông báo cũ")).toBeInTheDocument();
  });

  it("hiện skeleton khi yêu cầu đầu tiên chưa hoàn thành", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    render(
      <NotificationProvider>
        <NotificationButton />
      </NotificationProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải thông báo");
    expect(
      screen.getByTestId("notification-list-skeleton"),
    ).toBeInTheDocument();
  });
  it("giữ trang cũ sau cập nhật và lỗi nền", async () => {
    const first = { ...response.data, nextCursor: "older" };
    const older = { ...first.items[0], id: "old", title: "Thông báo trước" };
    const fresh = { ...first.items[0], id: "fresh", title: "Thông báo mới" };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: first }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { ...first, items: [older], nextCursor: null },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { ...first, items: [fresh, first.items[0]] },
          }),
        })
        .mockResolvedValue({ ok: false }),
    );
    render(
      <NotificationProvider>
        <NotificationButton />
      </NotificationProvider>,
    );
    await screen.findByTestId("notification-badge");
    fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tải thêm thông báo" }));
    await screen.findByText("Thông báo trước");
    fireEvent.focus(window);
    await screen.findByText("Thông báo mới");
    expect(screen.getByText("Thông báo trước")).toBeInTheDocument();
    fireEvent.focus(window);
    await screen.findByRole("alert");
    expect(screen.getByText("Thông báo trước")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tải thêm thông báo" }),
    ).not.toBeInTheDocument();
  });
  it("khôi phục tin cũ khi đánh dấu đã đọc thất bại", async () => {
    const first = { ...response.data, nextCursor: "older" };
    const older = { ...first.items[0], id: "old", title: "Tin cũ chưa đọc" };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: first }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { ...first, items: [older], nextCursor: null },
          }),
        })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValue({ ok: true, json: async () => ({ data: first }) }),
    );
    render(
      <NotificationProvider>
        <NotificationButton />
      </NotificationProvider>,
    );
    await screen.findByTestId("notification-badge");
    fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tải thêm thông báo" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Đánh dấu đã đọc: Tin cũ chưa đọc",
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Đánh dấu đã đọc: Tin cũ chưa đọc",
        }),
      ).toBeInTheDocument(),
    );
  });
  it("cập nhật đầu danh sách không bỏ khoảng trống giữa các trang", async () => {
    const first = { ...response.data, nextCursor: "old-page" };
    const older = { ...first.items[0], id: "older", title: "Tin trước" };
    const fresh = { ...first.items[0], id: "fresh", title: "Tin mới" };
    const gap = {
      ...first.items[0],
      id: "gap",
      title: "Tin trong khoảng trống",
    };
    let headCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        const value = url.includes("cursor=new-page")
          ? { ...first, items: [gap], nextCursor: "old-page" }
          : url.includes("cursor=old-page")
            ? { ...first, items: [older], nextCursor: "last-page" }
            : ++headCalls > 1
              ? { ...first, items: [fresh], nextCursor: "new-page" }
              : first;
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: value }),
        });
      }),
    );
    render(
      <NotificationProvider>
        <NotificationButton />
      </NotificationProvider>,
    );
    await screen.findByTestId("notification-badge");
    fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));

    fireEvent.click(screen.getByRole("button", { name: "Tải thêm thông báo" }));
    await screen.findByText("Tin trước");
    fireEvent.focus(window);
    await screen.findByText("Tin mới");
    fireEvent.click(screen.getByRole("button", { name: "Tải thêm thông báo" }));
    expect(
      await screen.findByText("Tin trong khoảng trống"),
    ).toBeInTheDocument();
  });

  it.each([false, true])(
    "đọc tất cả kết quả %s giữ và đồng bộ trang tải trong lúc chờ",
    async (success) => {
      const first = { ...response.data, nextCursor: "older-page" };
      const older = {
        ...first.items[0],
        id: "older",
        title: "Trang tải trong lúc chờ",
      };
      let rejectRead!: (value: {
        ok: boolean;
        json?: () => Promise<unknown>;
      }) => void;
      vi.stubGlobal(
        "fetch",
        vi.fn((url: string) => {
          if (url.includes("/read"))
            return new Promise((resolve) => {
              rejectRead = resolve;
            });
          const value = url.includes("cursor=")
            ? { ...first, items: [older], nextCursor: null }
            : first;
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: value }),
          });
        }),
      );
      render(
        <NotificationProvider>
          <NotificationButton />
        </NotificationProvider>,
      );
      await screen.findByTestId("notification-badge");
      fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));

      fireEvent.click(screen.getByRole("button", { name: "Đọc tất cả" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Tải thêm thông báo" }),
      );
      await screen.findByText("Trang tải trong lúc chờ");
      await act(async () => {
        rejectRead({
          ok: success,
          json: async () => ({ data: { unreadCount: 0 }, ok: true }),
        });
      });
      expect(screen.getByText("Trang tải trong lúc chờ")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Tải thêm thông báo" }),
      ).not.toBeInTheDocument();
      if (success)
        expect(
          screen.queryByRole("button", {
            name: "Đánh dấu đã đọc: Trang tải trong lúc chờ",
          }),
        ).not.toBeInTheDocument();
    },
  );
  it.each(["one", "all"])(
    "GET cũ không ghi đè trạng thái đọc sau POST %s thành công",
    async (mode) => {
      const first = { ...response.data, nextCursor: "older" };
      let resolveHead!: (value: unknown) => void;
      let marked = false;
      let calls = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn((url: string) => {
          if (url.includes("/read")) {
            marked = true;
            return Promise.resolve({
              ok: true,
              json: async () => ({ data: { unreadCount: 0 } }),
            });
          }
          if (++calls === 2)
            return new Promise((resolve) => {
              resolveHead = resolve;
            });
          const value = marked
            ? {
                ...first,
                unreadCount: 0,
                items: first.items.map((item) => ({
                  ...item,
                  readAt: "2026-09-08T10:00:00.000Z",
                })),
              }
            : first;
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: value }),
          });
        }),
      );
      render(
        <NotificationProvider>
          <NotificationButton />
        </NotificationProvider>,
      );
      await screen.findByTestId("notification-badge");
      fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));
      fireEvent.focus(window);
      await waitFor(() => expect(resolveHead).toBeTypeOf("function"));
      fireEvent.click(
        screen.getByRole("button", {
          name: mode === "all" ? "Đọc tất cả" : /Đánh dấu đã đọc/,
        }),
      );
      await waitFor(() => expect(marked).toBe(true));
      await act(async () => {
        const value = first;
        resolveHead({ ok: true, json: async () => ({ data: value }) });
      });
      expect(
        screen.queryByTestId("notification-badge"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Đánh dấu đã đọc/ }),
      ).not.toBeInTheDocument();
    },
  );

  it("thử lại lỗi đầu danh sách không tải nhầm trang cũ", async () => {
    const first = { ...response.data, nextCursor: "older" };
    const fresh = {
      ...first.items[0],
      id: "fresh",
      title: "Đã cập nhật đầu danh sách",
    };
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        ++calls;
        if (calls === 2) return Promise.resolve({ ok: false });
        const value =
          calls > 2 && !url.includes("cursor=")
            ? { ...first, items: [fresh] }
            : first;
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: value }),
        });
      }),
    );
    render(
      <NotificationProvider>
        <NotificationButton />
      </NotificationProvider>,
    );
    await screen.findByTestId("notification-badge");
    fireEvent.click(screen.getByRole("button", { name: /Thông báo/ }));
    fireEvent.focus(window);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(
      await screen.findByText("Đã cập nhật đầu danh sách"),
    ).toBeInTheDocument();
  });
});
