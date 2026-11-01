import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Invitation, WeddingTemplate } from "@prisma/client";
import { InvitationView } from "@/components/wedding/invitation-view";

// next/font/local chỉ chạy qua trình biên dịch của Next, ngoài đó thì giả lập.
vi.mock("next/font/local", () => ({
  default: () => ({ className: "font", variable: "font-variable", style: {} }),
}));

const template: WeddingTemplate = {
  id: "template-1",
  slug: "loi-yeu",
  name: "Lời yêu",
  category: "Cổ điển",
  description: "Mẫu minh họa",
  palette: "rose",
  layout: "editorial",
  premium: false,
  active: true,
  sortOrder: 0,
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
};
/* Dữ liệu giả: có ảnh và tài khoản mừng cưới để hàng lối tắt đủ chip. */
const invitation: Invitation & { template: WeddingTemplate } = {
  id: "invitation-1",
  ownerId: "owner-1",
  templateId: template.id,
  template,
  slug: "minh-hoa",
  groom: "Minh",
  bride: "Hoa",
  weddingDate: new Date("2026-12-12T03:00:00.000Z"),
  headline: "Một đời thương, một đời bên nhau.",
  story: "",
  groomParents: "",
  brideParents: "",
  eventsJson: JSON.stringify([
    {
      title: "Tiệc cưới nhà trai",
      date: "2026-12-12T03:00:00.000Z",
      venue: "Nhà hàng Minh Họa",
      address: "Số 1 đường Minh Họa, Hà Nội — địa chỉ minh họa",
    },
  ]),
  photosJson: JSON.stringify(["/images/couple.jpg", "/images/flowers.jpg"]),
  coverUrl: "/images/couple.jpg",
  musicUrl: "",
  giftBank: "970422",
  giftAccount: "0123456789",
  giftName: "NGUYEN VAN A",
  brideGiftBank: "",
  brideGiftAccount: "",
  brideGiftName: "",
  status: "published",
  isDemo: false,
  version: 1,
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
};

function renderPage() {
  const root = document.createElement("div");
  root.innerHTML = renderToStaticMarkup(
    <InvitationView invitation={invitation} />,
  );
  return root;
}

describe("thanh trên và hàng lối tắt của thiệp khách", () => {
  it("chỉ nút viên thuốc ở thanh trên dẫn tới phần xác nhận tham dự", () => {
    const root = renderPage();
    const top = root.querySelector(".wedding-top")!;
    const nav = root.querySelector('nav[aria-label="Các mục trong thiệp"]')!;

    const pill = top.querySelector('a[href="#rsvp"]');
    expect(pill?.textContent).toBe("Xác nhận tham dự ↓");
    expect(top.nextElementSibling).toBe(nav);
    expect(nav.querySelector('a[href="#rsvp"]')).toBeNull();
    expect(
      [...nav.querySelectorAll("a")].map((link) => [
        link.getAttribute("href"),
        link.textContent,
      ]),
    ).toEqual([
      ["#lich-tiec", "Lịch tiệc & chỉ đường"],
      ["#album", "Album ảnh"],
      ["#gifts", "Mừng cưới"],
    ]);
    expect(root.querySelector("#rsvp")).not.toBeNull();
  });
});
