import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { NotificationList } from "@/components/kit/notification-list";

it("formats notification timestamps in Vietnam regardless of the server or browser timezone", () => {
  const createdAt = "2026-09-08T08:00:00.000Z";
  const expected = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(createdAt));
  render(
    <NotificationList
      items={[
        {
          id: "timezone",
          title: "Thông báo",
          body: "Nội dung",
          href: "/account/orders",
          kind: "order_created",
          createdAt,
        },
      ]}
      loading={false}
      error={null}
      onRetry={() => {}}
      onMarkRead={() => {}}
      emptyDescription="Chưa có thông báo"
    />,
  );
  expect(screen.getByText(expected)).toHaveAttribute("dateTime", createdAt);
});
