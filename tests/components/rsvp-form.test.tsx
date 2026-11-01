import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { RsvpForm } from "@/components/wedding/rsvp-form";
import { responseSchema, type WeddingEvent } from "@/lib/wedding";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/components/wedding/client", () => ({ post }));

const place = { venue: "Nhà hàng minh họa", address: "Địa chỉ minh họa" };
// Hai tiệc thật của thiệp nhà trai đang chạy.
const groomParty: WeddingEvent = {
  title: "Tiệc cưới nhà trai",
  date: "2026-11-08T16:00:00+07:00",
  ...place,
};
const groomCeremony: WeddingEvent = {
  title: "Lễ thành hôn nhà trai",
  date: "2026-11-09T08:00:00+07:00",
  timeLabel: "Buổi sáng",
  ...place,
};
const brideCeremony: WeddingEvent = {
  title: "Lễ vu quy",
  date: "2026-11-07T09:00:00+07:00",
  ...place,
};
const brideParty: WeddingEvent = {
  title: "Tiệc báo hỷ",
  date: "2026-11-06T18:00:00+07:00",
  side: "bride",
  ...place,
};

const sideGroup = () =>
  screen.queryByRole("group", { name: "Bạn đến dự bên nào?" });
const dateGroup = () =>
  screen.queryByRole("group", { name: "Bạn đến vào ngày nào?" });
const partyGroup = () =>
  screen.queryByRole("group", { name: "Số người tham dự" });
const dateNames = () =>
  within(dateGroup()!)
    .getAllByRole("radio")
    .map((radio) => radio.closest("label")!.textContent);

function submit() {
  fireEvent.change(screen.getByLabelText("Tên của bạn"), {
    target: { value: "Bạn Lan" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Gửi xác nhận & lời chúc" }),
  );
}
function sent() {
  expect(post).toHaveBeenCalledTimes(1);
  const [url, body] = post.mock.calls[0] as [string, Record<string, unknown>];
  expect(url).toBe("/api/wedding/rsvp/vu-tu");
  expect(responseSchema.safeParse(body).success).toBe(true);
  return body;
}

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ ok: true });
  localStorage.clear();
});

describe("RsvpForm", () => {
  it("uses real radios with a legend for attendance, no select", () => {
    const { container } = render(
      <RsvpForm slug="vu-tu" events={[groomParty, groomCeremony]} />,
    );
    const attendance = screen.getByRole("group", {
      name: "Bạn có thể đến chung vui không?",
    });
    expect(attendance.tagName).toBe("FIELDSET");
    expect(within(attendance).getAllByRole("radio")).toHaveLength(3);
    expect(
      screen.getByRole("radio", { name: "Có, mình sẽ tham dự" }),
    ).toBeChecked();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(container.querySelector("select")).toBeNull();
  });

  it("skips the side step when every event is the groom's, with one chip per day", () => {
    render(<RsvpForm slug="vu-tu" events={[groomParty, groomCeremony]} />);

    expect(sideGroup()).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Nhà trai" })).toBeNull();
    expect(dateNames()).toEqual([
      "Chủ nhật · 08/11 16:00 · Tiệc cưới nhà trai",
      "Thứ hai · 09/11 Buổi sáng · Lễ thành hôn nhà trai",
    ]);
    const sunday = screen.getByRole("radio", { name: /^Chủ nhật · 08\/11/ });
    expect(sunday).toBeChecked();
    expect(sunday).toHaveAttribute("value", "0");
    expect(
      within(sunday.closest("label")!).getByText("Chủ nhật · 08/11"),
    ).toHaveAttribute("dateTime", "2026-11-08");
  });

  it("asks for the side when both families have events and lists only that side's days", () => {
    render(
      <RsvpForm
        slug="vu-tu"
        events={[groomParty, brideCeremony, groomCeremony, brideParty]}
      />,
    );

    const sides = within(sideGroup()!).getAllByRole("radio");
    expect(sides.map((radio) => radio.closest("label")!.textContent)).toEqual([
      "Nhà trai",
      "Nhà gái",
    ]);
    // Mặc định là bên của tiệc đầu tiên.
    expect(screen.getByRole("radio", { name: "Nhà trai" })).toBeChecked();
    expect(dateNames()).toEqual([
      "Chủ nhật · 08/11 16:00 · Tiệc cưới nhà trai",
      "Thứ hai · 09/11 Buổi sáng · Lễ thành hôn nhà trai",
    ]);

    fireEvent.click(screen.getByRole("radio", { name: "Nhà gái" }));

    expect(dateNames()).toEqual([
      "Thứ bảy · 07/11 09:00 · Lễ vu quy",
      "Thứ sáu · 06/11 18:00 · Tiệc báo hỷ",
    ]);
    expect(screen.queryByRole("radio", { name: /08\/11/ })).toBeNull();
    // Đổi bên thì ngày đầu tiên của bên mới được chọn.
    expect(screen.getByRole("radio", { name: /07\/11/ })).toBeChecked();
  });

  it("selects the only day of a side by itself", () => {
    render(
      <RsvpForm
        slug="vu-tu"
        events={[groomParty, groomCeremony, brideCeremony]}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /09\/11/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Nhà gái" }));

    expect(dateNames()).toEqual(["Thứ bảy · 07/11 09:00 · Lễ vu quy"]);
    expect(screen.getByRole("radio", { name: /07\/11/ })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "Nhà trai" }));
    expect(screen.getByRole("radio", { name: /08\/11/ })).toBeChecked();
  });

  it("shows a shared event under both sides", () => {
    const shared: WeddingEvent = {
      title: "Lễ thành hôn",
      date: "2026-11-10T10:00:00+07:00",
      ...place,
    };
    render(
      <RsvpForm slug="vu-tu" events={[groomParty, shared, brideCeremony]} />,
    );
    expect(dateNames()).toEqual([
      "Chủ nhật · 08/11 16:00 · Tiệc cưới nhà trai",
      "Thứ ba · 10/11 10:00 · Lễ thành hôn",
    ]);

    fireEvent.click(screen.getByRole("radio", { name: /10\/11/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Nhà gái" }));

    expect(dateNames()).toEqual([
      "Thứ ba · 10/11 10:00 · Lễ thành hôn",
      "Thứ bảy · 07/11 09:00 · Lễ vu quy",
    ]);
    expect(screen.getByRole("radio", { name: /10\/11/ })).toBeChecked();
  });

  it("sends the original eventIndex of the chosen day and the party size", async () => {
    render(
      <RsvpForm
        slug="vu-tu"
        events={[groomParty, brideCeremony, groomCeremony, brideParty]}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Nhà gái" }));
    fireEvent.click(screen.getByRole("radio", { name: /06\/11/ }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm một người" }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm một người" }));

    submit();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Đã lưu phản hồi",
    );
    expect(sent()).toMatchObject({
      name: "Bạn Lan",
      attendance: "attending",
      eventIndex: 3,
      partySize: 3,
    });
  });

  it("sends the groom's second day by its own index", async () => {
    render(<RsvpForm slug="vu-tu" events={[groomParty, groomCeremony]} />);
    fireEvent.click(screen.getByRole("radio", { name: /09\/11/ }));

    submit();
    await screen.findByRole("status");
    expect(sent()).toMatchObject({ eventIndex: 1, partySize: 1 });
  });

  it("hides side, day and party size for a guest who cannot come", async () => {
    render(
      <RsvpForm
        slug="vu-tu"
        events={[groomParty, brideCeremony, groomCeremony, brideParty]}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Nhà gái" }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm một người" }));
    fireEvent.click(
      screen.getByRole("radio", { name: "Mình rất tiếc, không thể đến" }),
    );

    expect(sideGroup()).not.toBeInTheDocument();
    expect(dateGroup()).not.toBeInTheDocument();
    expect(partyGroup()).not.toBeInTheDocument();

    submit();
    await screen.findByRole("status");
    expect(sent()).toMatchObject({
      attendance: "declined",
      eventIndex: 0,
      partySize: 1,
    });
  });

  it("hides the day and party size while the guest is undecided", () => {
    render(<RsvpForm slug="vu-tu" events={[groomParty, groomCeremony]} />);
    fireEvent.click(
      screen.getByRole("radio", { name: "Mình sẽ xác nhận sau" }),
    );
    expect(dateGroup()).not.toBeInTheDocument();
    expect(partyGroup()).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Có, mình sẽ tham dự" }));
    expect(dateGroup()).toBeInTheDocument();
    expect(partyGroup()).toBeInTheDocument();
  });

  it("keeps the party size between 1 and 10", () => {
    render(<RsvpForm slug="vu-tu" events={[groomParty]} />);
    const fewer = screen.getByRole("button", { name: "Bớt một người" });
    const more = screen.getByRole("button", { name: "Thêm một người" });
    const count = within(partyGroup()!).getByText(/người$/);

    expect(count).toHaveTextContent("1 người");
    expect(fewer).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(fewer);
    expect(count).toHaveTextContent("1 người");

    for (let i = 0; i < 12; i++) fireEvent.click(more);
    expect(count).toHaveTextContent("10 người");
    expect(more).toHaveAttribute("aria-disabled", "true");
    expect(fewer).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(fewer);
    expect(count).toHaveTextContent("9 người");
  });
});
