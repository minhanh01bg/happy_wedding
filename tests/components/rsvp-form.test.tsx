import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { RsvpForm } from "@/components/wedding/rsvp-form";
import { responseSchema, type WeddingEvent } from "@/lib/wedding";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/components/wedding/client", () => ({ post }));

const place = { venue: "Nhà hàng minh họa", address: "Địa chỉ minh họa" };
// Tiệc minh họa: hai tiệc nhà trai, hai tiệc nhà gái.
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
// Nhà trai ở chỉ số 0–1, nhà gái ở 2–3.
const bothSides = [groomParty, groomCeremony, brideCeremony, brideParty];

const sideGroup = () =>
  screen.queryByRole("group", { name: "Bạn đến dự bên nào?" });
const partyGroup = () =>
  screen.queryByRole("group", { name: "Số người tham dự" });

/** Form không còn hỏi ngày: không có câu hỏi, không có ô chọn tiệc. */
function expectNoDayQuestion(container: HTMLElement) {
  expect(screen.queryByText("Bạn đến vào ngày nào?")).toBeNull();
  expect(
    screen.queryByRole("group", { name: "Bạn đến vào ngày nào?" }),
  ).toBeNull();
  expect(container.querySelector('input[name="eventIndex"]')).toBeNull();
  expect(container.querySelector("time")).toBeNull();
  expect(screen.queryByRole("radio", { name: /\d{2}\/\d{2}/ })).toBeNull();
}

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
  it("offers only two attendance radios with a legend, no select", () => {
    const { container } = render(
      <RsvpForm slug="vu-tu" events={[groomParty, groomCeremony]} />,
    );
    const attendance = screen.getByRole("group", {
      name: "Bạn có thể đến chung vui không?",
    });
    expect(attendance.tagName).toBe("FIELDSET");
    expect(
      within(attendance)
        .getAllByRole("radio")
        .map((radio) => radio.closest("label")!.textContent),
    ).toEqual(["Có, mình sẽ tham dự", "Mình rất tiếc, không thể đến"]);
    expect(
      screen.getByRole("radio", { name: "Có, mình sẽ tham dự" }),
    ).toBeChecked();
    expect(
      screen.queryByRole("radio", { name: "Mình sẽ xác nhận sau" }),
    ).toBeNull();
    expect(screen.queryByText("Mình sẽ xác nhận sau")).toBeNull();
    expect(container.querySelector('input[value="undecided"]')).toBeNull();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(container.querySelector("select")).toBeNull();
  });

  it("asks neither side nor day when every event is the groom's, and sends the first event", async () => {
    const { container } = render(
      <RsvpForm slug="vu-tu" events={[groomParty, groomCeremony]} />,
    );

    expect(sideGroup()).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Nhà trai" })).toBeNull();
    expectNoDayQuestion(container);
    expect(partyGroup()).toBeInTheDocument();

    submit();
    await screen.findByRole("status");
    expect(sent()).toMatchObject({
      attendance: "attending",
      eventIndex: 0,
      partySize: 1,
    });
  });

  it("asks for the side when both families have events, with no day question", () => {
    const { container } = render(<RsvpForm slug="vu-tu" events={bothSides} />);

    const sides = within(sideGroup()!).getAllByRole("radio");
    expect(sides.map((radio) => radio.closest("label")!.textContent)).toEqual([
      "Nhà trai",
      "Nhà gái",
    ]);
    // Mặc định là bên của tiệc đầu tiên.
    expect(screen.getByRole("radio", { name: "Nhà trai" })).toBeChecked();
    expectNoDayQuestion(container);

    fireEvent.click(screen.getByRole("radio", { name: "Nhà gái" }));
    expect(screen.getByRole("radio", { name: "Nhà gái" })).toBeChecked();
    expectNoDayQuestion(container);
    expect(partyGroup()).toBeInTheDocument();
  });

  it("sends the first bride event's original index and the party size", async () => {
    render(<RsvpForm slug="vu-tu" events={bothSides} />);
    fireEvent.click(screen.getByRole("radio", { name: "Nhà gái" }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm một người" }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm một người" }));

    submit();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Đã lưu phản hồi",
    );
    expect(sent()).toMatchObject({
      name: "Bạn Lan",
      attendance: "attending",
      eventIndex: 2,
      partySize: 3,
    });
  });

  it("sends the first groom event after switching back to the groom's side", async () => {
    render(<RsvpForm slug="vu-tu" events={bothSides} />);
    fireEvent.click(screen.getByRole("radio", { name: "Nhà gái" }));
    fireEvent.click(screen.getByRole("radio", { name: "Nhà trai" }));

    submit();
    await screen.findByRole("status");
    expect(sent()).toMatchObject({ eventIndex: 0, partySize: 1 });
  });

  it("counts a shared event as the first event of either side", async () => {
    const shared: WeddingEvent = {
      title: "Lễ thành hôn",
      date: "2026-11-10T10:00:00+07:00",
      ...place,
    };
    render(
      <RsvpForm slug="vu-tu" events={[groomParty, shared, brideCeremony]} />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Nhà gái" }));

    submit();
    await screen.findByRole("status");
    expect(sent()).toMatchObject({ eventIndex: 1 });
  });

  it("hides side and party size for a guest who cannot come", async () => {
    const { container } = render(<RsvpForm slug="vu-tu" events={bothSides} />);
    fireEvent.click(screen.getByRole("radio", { name: "Nhà gái" }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm một người" }));
    fireEvent.click(
      screen.getByRole("radio", { name: "Mình rất tiếc, không thể đến" }),
    );

    expect(sideGroup()).not.toBeInTheDocument();
    expect(partyGroup()).not.toBeInTheDocument();
    expectNoDayQuestion(container);

    submit();
    await screen.findByRole("status");
    expect(sent()).toMatchObject({
      attendance: "declined",
      eventIndex: 0,
      partySize: 1,
    });
  });

  it("shows side and party size again when the guest changes to attending", () => {
    render(<RsvpForm slug="vu-tu" events={bothSides} />);
    fireEvent.click(
      screen.getByRole("radio", { name: "Mình rất tiếc, không thể đến" }),
    );
    expect(sideGroup()).not.toBeInTheDocument();
    expect(partyGroup()).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Có, mình sẽ tham dự" }));
    expect(sideGroup()).toBeInTheDocument();
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
