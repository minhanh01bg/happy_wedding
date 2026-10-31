import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { z } from "zod";
import type { ServicePlan } from "@prisma/client";
import { RsvpForm } from "@/components/wedding/rsvp-form";
import { Checkout } from "@/components/wedding/checkout";
import { EventFields } from "@/components/wedding/editor-fields";
import {
  DEMO_CONTENT,
  responseSchema,
  type InvitationInput,
} from "@/lib/wedding";

/**
 * Trình duyệt trên http thường (không phải secure context) không có
 * crypto.randomUUID, chỉ có crypto.getRandomValues. Các form chạy trên
 * trình duyệt vẫn phải tạo được id và gửi được.
 */
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const webCrypto = globalThis.crypto;
const fetchMock = vi.fn();

function sentBody(call = 0) {
  const [, init] = fetchMock.mock.calls[call] as [string, RequestInit];
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

beforeEach(() => {
  vi.stubGlobal("crypto", {
    getRandomValues: (array: Uint8Array) => webCrypto.getRandomValues(array),
  });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  router.push.mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("without crypto.randomUUID (plain HTTP)", () => {
  it("has no randomUUID in this environment", () => {
    expect(globalThis.crypto.randomUUID).toBeUndefined();
  });

  describe("RsvpForm", () => {
    const events = DEMO_CONTENT.events;
    function fillAndSubmit() {
      fireEvent.change(screen.getByLabelText("Tên của bạn"), {
        target: { value: "Bạn Lan" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Gửi xác nhận & lời chúc" }),
      );
    }

    it("posts a valid UUID clientId, keeps it for replays", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
      render(<RsvpForm slug="vu-tu" events={events} />);

      fillAndSubmit();
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Đã lưu phản hồi",
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/wedding/rsvp/vu-tu",
        expect.objectContaining({ method: "POST" }),
      );
      const body = sentBody();
      expect(body.clientId).toMatch(V4);
      expect(responseSchema.safeParse(body).success).toBe(true);
      expect(localStorage.getItem("rsvp:vu-tu")).toBe(body.clientId);

      fillAndSubmit();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(sentBody(1).clientId).toBe(body.clientId);
    });

    it("still posts when localStorage is blocked", async () => {
      vi.stubGlobal("localStorage", {
        getItem: () => {
          throw new DOMException("blocked", "SecurityError");
        },
        setItem: () => {
          throw new DOMException("blocked", "SecurityError");
        },
      });
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
      render(<RsvpForm slug="vu-tu" events={events} />);

      fillAndSubmit();
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Đã lưu phản hồi",
      );
      const body = sentBody();
      expect(body.clientId).toMatch(V4);
      expect(responseSchema.safeParse(body).success).toBe(true);
    });
  });

  describe("Checkout", () => {
    const plan = {
      id: "plan-basic",
      name: "Gói cơ bản",
      description: "",
      price: 199000,
      months: 12,
      maxPhotos: 12,
      premiumTemplates: false,
      removeBranding: false,
      active: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies ServicePlan;

    it("posts a valid UUID clientId and opens the order", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { id: "order-1" } }),
      });
      render(<Checkout invitationId="inv-1" plans={[plan]} />);

      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.click(
        screen.getByRole("button", {
          name: "Tạo đơn & xem hướng dẫn thanh toán",
        }),
      );

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith("/dashboard/orders/order-1"),
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/wedding/orders",
        expect.objectContaining({ method: "POST" }),
      );
      const body = sentBody();
      expect(body).toMatchObject({ invitationId: "inv-1", planId: plan.id });
      // Cùng schema với route /api/wedding/orders.
      expect(
        z
          .strictObject({
            invitationId: z.string(),
            planId: z.string(),
            clientId: z.uuid(),
          })
          .safeParse(body).success,
      ).toBe(true);
    });
  });

  describe("EventFields", () => {
    function Harness() {
      const [data, setData] = useState<InvitationInput>({
        ...DEMO_CONTENT,
        templateId: "t",
        slug: "vu-tu",
        events: DEMO_CONTENT.events.slice(0, 1),
      });
      return (
        <EventFields
          data={data}
          field={(key, value) => setData((d) => ({ ...d, [key]: value }))}
          eventField={(index, key, value) =>
            setData((d) => ({
              ...d,
              events: d.events.map((event, i) =>
                i === index ? { ...event, [key]: value } : event,
              ),
            }))
          }
        />
      );
    }

    it("renders and adds an event row", () => {
      render(<Harness />);
      expect(screen.getByText("Tiệc 1")).toBeInTheDocument();
      expect(screen.queryByText("Tiệc 2")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Thêm một tiệc" }));

      expect(screen.getByText("Tiệc 2")).toBeInTheDocument();
      expect(screen.getAllByRole("group")).toHaveLength(2);
      expect(screen.getAllByLabelText("Tên tiệc")[1]).toHaveValue("Tiệc cưới");
    });
  });
});
