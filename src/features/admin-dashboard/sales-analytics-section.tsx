import Link from "next/link";

import { EmptyState, Money, StatTile } from "@/components/kit";
import { ChartSvg } from "@/components/kit/chart-svg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ProductSalesRow,
  SalesAnalytics,
} from "@/server/admin/sales-analytics";
import { REPORT_DAY_OPTIONS } from "@/server/reports/daily-revenue";

function ProductRanking({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: ProductSalesRow[];
  metric: "quantity" | "grossProfit";
}) {
  return (
    <Card aria-label={title}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <ol className="divide-y">
            {rows.map((row, index) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="text-muted-foreground mr-2">
                    {index + 1}.
                  </span>
                  {row.productId ? (
                    <Link
                      className="hover:text-primary font-semibold underline-offset-4 hover:underline"
                      href={`/admin/products?edit=${encodeURIComponent(row.productId)}`}
                    >
                      {row.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{row.name}</span>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    Doanh thu tiền hàng <Money amount={row.revenue} size="sm" />
                    {metric === "grossProfit"
                      ? ` · ${row.quantity.toLocaleString("vi-VN")} ${row.unit}`
                      : ""}
                    {metric === "grossProfit" && row.unknownCostLineCount > 0
                      ? " · Chỉ tính phần có giá vốn"
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {metric === "quantity" ? (
                    `${row.quantity.toLocaleString("vi-VN")} ${row.unit}`
                  ) : (
                    <Money amount={row.grossProfit} />
                  )}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            size="compact"
            title="Chưa có dữ liệu trong kỳ"
            description={
              metric === "grossProfit"
                ? "Lợi nhuận chỉ tính các dòng có giá vốn khi ghi nhận đơn."
                : "Sản phẩm bán trong kỳ sẽ hiện ở đây."
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

export function SalesAnalyticsSection({
  analytics,
}: {
  analytics: SalesAnalytics;
}) {
  const { days, totals, byChannel } = analytics;
  const label = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
  return (
    <section aria-label="Phân tích bán hàng" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Phân tích bán hàng</h2>
          <p className="text-muted-foreground text-sm">
            {days} ngày gần nhất · Giờ Việt Nam · Không tính đơn hủy
          </p>
        </div>
        <nav aria-label="Khoảng thời gian báo cáo" className="flex gap-2">
          {REPORT_DAY_OPTIONS.map((option) => (
            <Link
              key={option}
              href={`/admin?days=${option}`}
              aria-current={option === days ? "page" : undefined}
              className={cn(
                "border-border min-h-11 rounded-xl border px-3 py-2.5 text-sm font-bold",
                option === days
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted",
              )}
            >
              {option} ngày
            </Link>
          ))}
        </nav>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Doanh thu trong kỳ"
          value={totals.revenue}
          format="money"
          hint="Giá trị đơn gồm phí giao hàng"
        />
        <StatTile
          label="Số đơn trong kỳ"
          value={totals.orderCount}
          hint={`${days} ngày gần nhất`}
        />
        <StatTile
          label="Lợi nhuận gộp đã biết"
          value={totals.grossProfit}
          format="money"
          hint="Tiền hàng sau giảm giá − giá vốn khi ghi nhận đơn; chưa trừ chi phí vận hành"
        />
      </div>
      {totals.unknownCostLineCount > 0 ? (
        <p
          role="note"
          className="bg-muted text-muted-foreground rounded-xl border p-3 text-sm"
        >
          Có {totals.unknownCostLineCount} dòng hàng chưa có giá vốn được lưu
          cùng đơn. Các dòng này vẫn được tính doanh thu và số lượng, nhưng chưa
          được tính lợi nhuận.
        </p>
      ) : null}
      <ChartSvg
        title={`Doanh thu ${days} ngày`}
        subtitle="Tại quầy và online; gồm phí giao hàng"
        data={analytics.daily.map((day) => ({
          label: label(day.date),
          value: day.byChannel.pos,
          secondaryValue: day.byChannel.online,
        }))}
        seriesLabels={["Tại quầy", "Online"]}
        valueFormat="vnd-k"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartSvg
          title="Số đơn theo ngày"
          subtitle="Đơn bán được ghi nhận trong kỳ"
          data={analytics.daily.map((day) => ({
            label: label(day.date),
            value: day.orderCount,
          }))}
          valueFormat="number"
        />
        <ChartSvg
          title="Lợi nhuận gộp theo ngày"
          subtitle="Chỉ dòng có giá vốn khi ghi nhận đơn; không gồm phí giao hàng"
          data={analytics.daily.map((day) => ({
            label: label(day.date),
            value: day.grossProfit,
          }))}
          valueFormat="vnd-k"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cơ cấu kênh bán</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {(["pos", "online"] as const).map((channel) => {
              const name = channel === "pos" ? "Tại quầy" : "Online";
              const share = totals.orderCount
                ? (byChannel[channel].orderCount / totals.orderCount) * 100
                : 0;
              return (
                <div key={channel}>
                  <div className="mb-2 flex justify-between gap-2 text-sm">
                    <span className="font-semibold">{name}</span>
                    <span>
                      {byChannel[channel].orderCount} đơn ·{" "}
                      {share.toLocaleString("vi-VN", {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </span>
                  </div>
                  <progress
                    aria-label={`Tỷ trọng số đơn ${name}`}
                    value={share}
                    max={100}
                    className="accent-primary h-2 w-full"
                  />
                  <p className="text-muted-foreground mt-2 text-sm">
                    Doanh thu{" "}
                    <Money amount={byChannel[channel].revenue} size="sm" />
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProductRanking
          title="Top 5 bán nhiều nhất"
          rows={analytics.topQuantity}
          metric="quantity"
        />
        <ProductRanking
          title="Top 5 lợi nhuận gộp"
          rows={analytics.topProfit}
          metric="grossProfit"
        />
      </div>
    </section>
  );
}
