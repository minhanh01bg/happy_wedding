import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Invitation, WeddingTemplate } from "@prisma/client";
import { InvitationView } from "@/components/wedding/invitation-view";
import { InvitationEditor } from "@/components/wedding/invitation-editor";
import { DEMO_CONTENT, type InvitationInput } from "@/lib/wedding";

// next/font/local chỉ chạy qua trình biên dịch của Next, ngoài đó thì giả lập.
vi.mock("next/font/local", () => ({
  default: () => ({ className: "font", variable: "font-variable", style: {} }),
}));
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useParams: () => ({}),
}));
const post = vi.hoisted(() => vi.fn());
vi.mock("@/components/wedding/client", () => ({ post }));

const STUDIO = "THIỆP CƯỚI ĐƯỢC CHĂM CHÚT BỞI HỶ STUDIO";
// The label also wraps its hint, as the other editor fields do.
const MADE_BY_LABEL = /^Người làm thiệp \(tuỳ chọn\)/;

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
/* Dữ liệu giả, không phải cặp đôi thật. */
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
  photosJson: "[]",
  coverUrl: "/images/couple.jpg",
  musicUrl: "",
  giftBank: "",
  giftAccount: "",
  giftName: "",
  brideGiftBank: "",
  brideGiftAccount: "",
  brideGiftName: "",
  madeBy: "",
  status: "published",
  isDemo: false,
  version: 1,
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
};

function footer(madeBy: string, removeBranding = false) {
  const root = document.createElement("div");
  root.innerHTML = renderToStaticMarkup(
    <InvitationView
      invitation={{ ...invitation, madeBy }}
      removeBranding={removeBranding}
    />,
  );
  return root.querySelector("footer.wedding-thanks")!;
}

describe("dòng ghi công cuối thiệp", () => {
  it("keeps the studio link when no maker is set", () => {
    const end = footer("");
    const links = [...end.querySelectorAll("a")];
    expect(links.map((a) => [a.getAttribute("href"), a.textContent])).toEqual([
      ["/", STUDIO],
    ]);
    expect(end.textContent).not.toContain("Thiệp cưới được chăm chút bởi");
  });

  it("hides every credit when the plan removes branding and no maker is set", () => {
    const end = footer("", true);
    expect(end.querySelector("a")).toBeNull();
    expect(end.textContent).not.toMatch(/chăm chút bởi/i);
  });

  it("shows the maker as plain text instead of the studio link", () => {
    const end = footer("bạn thân cô dâu");
    expect(end.querySelector("a")).toBeNull();
    expect(end.textContent).not.toContain(STUDIO);
    const credit = [...end.querySelectorAll("p")].at(-1)!;
    expect(credit.textContent).toBe(
      "Thiệp cưới được chăm chút bởi bạn thân cô dâu",
    );
    expect(credit.closest("a")).toBeNull();
  });

  it("shows the maker even when the plan removes branding", () => {
    const end = footer("bạn thân cô dâu", true);
    expect(end.textContent).toContain(
      "Thiệp cưới được chăm chút bởi bạn thân cô dâu",
    );
    expect(end.querySelector("a")).toBeNull();
  });

  it("escapes markup in the maker's credit", () => {
    const end = footer('<img src=x onerror="alert(1)">');
    expect(end.querySelector("img")).toBeNull();
    expect(end.textContent).toContain(
      'Thiệp cưới được chăm chút bởi <img src=x onerror="alert(1)">',
    );
  });
});

describe("ô Người làm thiệp trong editor", () => {
  const initial: InvitationInput = {
    ...DEMO_CONTENT,
    templateId: template.id,
    slug: "minh-hoa",
    madeBy: "bạn thân cô dâu",
  };
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { id: "invitation-1", version: 3 } });
  });
  function submit() {
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  }
  function sentInvitation() {
    const [url, body] = post.mock.calls[0] as [
      string,
      { invitation: InvitationInput; id: string; version: number },
    ];
    expect(url).toBe("/api/wedding/invitations");
    return body;
  }

  it("shows the saved credit and sends it back unchanged", async () => {
    render(
      <InvitationEditor
        id="invitation-1"
        version={2}
        initial={initial}
        templates={[template]}
      />,
    );
    const input = screen.getByLabelText(MADE_BY_LABEL);
    expect(input).toHaveValue("bạn thân cô dâu");
    expect(input).toHaveAttribute("maxLength", "60");
    expect(screen.getByText(/^Hiện ở cuối thiệp:/)).toHaveTextContent(
      "Hiện ở cuối thiệp: “Thiệp cưới được chăm chút bởi bạn thân cô dâu”.",
    );

    submit();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(sentInvitation()).toMatchObject({
      id: "invitation-1",
      version: 2,
      invitation: { madeBy: "bạn thân cô dâu" },
    });
  });

  it("sends an edited credit trimmed, and an emptied one as a clear", async () => {
    render(
      <InvitationEditor
        id="invitation-1"
        version={2}
        initial={initial}
        templates={[template]}
      />,
    );
    const input = screen.getByLabelText(MADE_BY_LABEL);
    fireEvent.change(input, { target: { value: "  em họ chú rể  " } });
    submit();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(sentInvitation().invitation.madeBy).toBe("em họ chú rể");

    fireEvent.change(input, { target: { value: "" } });
    submit();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    const [, second] = post.mock.calls[1] as [
      string,
      { invitation: InvitationInput; version: number },
    ];
    expect(second.invitation.madeBy).toBe("");
    // The next save uses the version the server returned.
    expect(second.version).toBe(3);
  });
});
