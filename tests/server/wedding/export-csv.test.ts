// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import type { WeddingEvent } from "@/lib/wedding";

const place = { venue: "Nhà hàng minh họa", address: "Địa chỉ minh họa" };
const events: WeddingEvent[] = [
  { title: "Tiệc cưới nhà trai", date: "2026-11-08T16:00:00+07:00", ...place },
  { title: "Lễ thành hôn", date: "2026-11-10T10:00:00+07:00", ...place },
  { title: "Lễ vu quy", date: "2026-11-07T09:00:00+07:00", ...place },
];
const response = (
  name: string,
  attendance: string,
  eventIndex: number,
  partySize = 1,
) => ({
  name,
  attendance,
  eventIndex,
  partySize,
  message: "",
  createdAt: new Date("2026-10-20T03:00:00.000Z"),
});
const rows = [
  response("Khách Một", "attending", 2, 2),
  response("Khách Hai", "attending", 0),
  response("Khách Ba", "attending", 1),
  response("Khách Bốn", "declined", 0),
  response("Khách Năm", "undecided", 0),
  // Tiệc đã bị xóa khỏi thiệp sau khi khách phản hồi.
  response("Khách Sáu", "attending", 3),
];

vi.mock("@/server/db/prisma", () => ({
  prisma: { guestResponse: { findMany: async () => rows } },
}));
vi.mock("@/server/wedding/guards", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/wedding/guards")>()),
  customer: async () => ({ accountId: "account-1" }),
}));
vi.mock("@/server/wedding/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/wedding/service")>()),
  ownedInvitation: async () => ({
    id: "invitation-1",
    eventsJson: JSON.stringify(events),
  }),
}));

import { GET } from "@/app/api/wedding/[...path]/route";

async function exportCsv() {
  const path = ["export", "invitation-1"];
  const res = await GET(
    new Request("http://127.0.0.1:3200/api/wedding/export/invitation-1"),
    { params: Promise.resolve({ path }) },
  );
  expect(res.status).toBe(200);
  return (await res.text())
    .replace(/^﻿/, "")
    .split("\r\n")
    .map((line) => line.slice(1, -1).split('","'));
}

describe("guest response CSV export", () => {
  it("writes the side of the event in the Tiệc column", async () => {
    const [header, ...body] = await exportCsv();
    const party = header.indexOf("Tiệc");
    expect(party).toBe(3);
    expect(body.map((row) => [row[0], row[1], row[party]])).toEqual([
      ["Khách Một", "Có", "Nhà gái"],
      ["Khách Hai", "Có", "Nhà trai"],
      // Tiệc chung, phản hồi không đến hoặc tiệc đã xóa: giữ số thứ tự tiệc.
      ["Khách Ba", "Có", "2"],
      ["Khách Bốn", "Không", "1"],
      ["Khách Năm", "Chưa rõ", "1"],
      ["Khách Sáu", "Có", "4"],
    ]);
  });
});
