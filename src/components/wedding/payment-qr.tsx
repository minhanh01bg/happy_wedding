"use client";

import Image from "next/image";
import { useState } from "react";

export function PaymentQr({
  bank,
  account,
  name,
  amount,
  code,
}: {
  bank: string;
  account: string;
  name: string;
  amount?: number;
  code?: string;
}) {
  const [failed, setFailed] = useState(false);
  const query = new URLSearchParams({
    accountName: name,
    ...(amount !== undefined ? { amount: String(amount) } : {}),
    ...(code ? { addInfo: code } : {}),
  });
  const url = `https://img.vietqr.io/image/${bank}-${account}-compact2.png?${query}`;
  return (
    <div className="payment-qr">
      <div className="qr-box">
        {failed ? (
          <p role="status">
            Chưa tải được QR. Hãy chuyển khoản theo ngân hàng, tài khoản và nội
            dung được hiển thị trên đơn.
          </p>
        ) : (
          <Image
            src={url}
            alt={
              code
                ? "QR thanh toán đơn dịch vụ"
                : "QR tài khoản nhận tiền dịch vụ"
            }
            width={240}
            height={290}
            style={{ height: "auto", width: "auto", maxWidth: "100%" }}
            unoptimized
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      {failed ? (
        <button
          type="button"
          className="secondary small"
          onClick={() => setFailed(false)}
        >
          Tải lại QR thanh toán
        </button>
      ) : (
        <a
          className="text-link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Mở QR thanh toán để lưu
        </a>
      )}
    </div>
  );
}
