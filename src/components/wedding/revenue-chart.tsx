"use client";

import { useState } from "react";
import { money, dateLabel } from "@/lib/wedding";
import type { RevenuePoint } from "@/server/wedding/reporting";

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const [selected, setSelected] = useState(points.length - 1);
  const width = 860;
  const left = 90;
  const right = width - 20;
  const top = 20;
  const bottom = 210;
  const max = Math.max(1, ...points.map((point) => point.amount));
  const x = (index: number) =>
    left + (index * (right - left)) / Math.max(1, points.length - 1);
  const y = (amount: number) => bottom - (amount / max) * (bottom - top);
  const current = points[selected];
  return (
    <div className="revenue-chart">
      <p className="fine">
        Tiền mua gói đã ghi nhận theo ngày Việt Nam. Không gồm đơn chưa thanh
        toán, tiền mừng cưới hoặc thiệp minh họa.
      </p>
      <svg
        viewBox={`0 0 ${width} 255`}
        role="img"
        aria-label={`Biểu đồ tiền dịch vụ đã nhận trong ${points.length} ngày. Chọn ngày bên dưới hoặc mở bảng số liệu để đọc chi tiết.`}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const position = ((event.clientX - box.left) / box.width) * width;
          setSelected(
            Math.max(
              0,
              Math.min(
                points.length - 1,
                Math.round(
                  ((position - left) / (right - left)) * (points.length - 1),
                ),
              ),
            ),
          );
        }}
      >
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={left}
              x2={right}
              y1={y(max * ratio)}
              y2={y(max * ratio)}
              className="chart-gridline"
            />
            <text x={left - 12} y={y(max * ratio) + 4} textAnchor="end">
              {ratio === 0 ? "0" : money(Math.round(max * ratio))}
            </text>
          </g>
        ))}
        <polyline
          points={points
            .map((point, index) => `${x(index)},${y(point.amount)}`)
            .join(" ")}
          fill="none"
          className="chart-line"
        />
        <line
          x1={x(selected)}
          x2={x(selected)}
          y1={top}
          y2={bottom}
          className="chart-marker"
        />
        <circle
          cx={x(selected)}
          cy={y(current.amount)}
          r="5"
          className="chart-point"
        />
        <text x={left} y="242">
          {dateLabel(`${points[0].date}T00:00:00+07:00`)}
        </text>
        <text x={right} y="242" textAnchor="end">
          {dateLabel(`${points.at(-1)!.date}T00:00:00+07:00`)}
        </text>
      </svg>
      <div className="chart-selection">
        <label>
          Chọn ngày xem số liệu
          <select
            value={selected}
            onChange={(event) => setSelected(Number(event.target.value))}
          >
            {points.map((point, index) => (
              <option value={index} key={point.date}>
                {dateLabel(`${point.date}T00:00:00+07:00`)}
              </option>
            ))}
          </select>
        </label>
        <p role="status">
          {dateLabel(`${current.date}T00:00:00+07:00`)}:{" "}
          <strong>{money(current.amount)}</strong> · {current.orders} đơn
        </p>
      </div>
      {!points.some((point) => point.amount > 0) && (
        <p className="notice">
          Chưa ghi nhận tiền dịch vụ trong khoảng thời gian này.
        </p>
      )}
      <details className="chart-data">
        <summary>Xem bảng số liệu theo ngày</summary>
        <div className="data-table-wrap">
          <table className="data-table">
            <caption>Tiền dịch vụ đã nhận và số đơn có giao dịch</caption>
            <thead>
              <tr>
                <th scope="col">Ngày</th>
                <th scope="col">Số đơn</th>
                <th scope="col">Đã nhận</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date}>
                  <th scope="row">
                    {dateLabel(`${point.date}T00:00:00+07:00`)}
                  </th>
                  <td>{point.orders}</td>
                  <td>{money(point.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
