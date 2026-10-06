"use client";

import Image from "next/image";
import { useState } from "react";
import { bankName } from "@/lib/banks";

export type GiftAccount = {
  side: "Nhà trai" | "Nhà gái";
  bank: string;
  account: string;
  name: string;
};

export function GiftAccounts({
  accounts,
  preview = false,
}: {
  accounts: GiftAccount[];
  preview?: boolean;
}) {
  return (
    <details className="wedding-gift-box">
      <summary>
        <span className="gift-box-art" aria-hidden="true">
          <span className="gift-box-lid">
            <span className="gift-box-bow" />
          </span>
          <span className="gift-box-body">
            <span className="gift-box-heart">♡</span>
          </span>
        </span>
        <span className="gift-box-label gift-label-closed">
          Mở hộp quà mừng cưới
        </span>
        <span className="gift-box-label gift-label-open">Đóng hộp quà</span>
        <span className="gift-box-hint">
          Một chút yêu thương gửi đến chúng mình
        </span>
      </summary>
      <div className="gift-box-content">
        {preview && (
          <p className="gift-demo-note">
            QR minh họa · không dùng để chuyển khoản. Thêm tài khoản nhà trai và
            nhà gái khi tạo thiệp.
          </p>
        )}
        <div className="gift-grid">
          {accounts.map((account) => (
            <GiftCard key={account.side} {...account} />
          ))}
          {preview &&
            ["Nhà trai", "Nhà gái"].map((side, index) => (
              <article className="gift-card gift-demo-card" key={side}>
                <p className="eyebrow">MỪNG CƯỚI {side.toUpperCase()}</p>
                <h3>{side}</h3>
                <div className="qr-box">
                  <Image
                    src={`/images/qr-demo-${index + 1}.svg`}
                    width={220}
                    height={220}
                    alt={`QR minh họa ${side.toLowerCase()}, không dùng chuyển khoản`}
                  />
                </div>
                <p>QR minh họa</p>
                <p>
                  Tài khoản sẽ hiển thị sau khi cặp đôi thêm thông tin ngân
                  hàng.
                </p>
              </article>
            ))}
        </div>
      </div>
    </details>
  );
}

function GiftCard({ side, bank, account, name }: GiftAccount) {
  const [failed, setFailed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const qr = `https://img.vietqr.io/image/${bank}-${account}-compact2.png?accountName=${encodeURIComponent(name)}`;
  return (
    <article className="gift-card">
      <p className="eyebrow">MỪNG CƯỚI {side.toUpperCase()}</p>
      <h3>{name}</h3>
      <p>{bankName(bank)}</p>
      <p className="gift-account-number">{account}</p>
      <div className="qr-box">
        {failed ? (
          <p role="status">
            Chưa tải được mã QR. Bạn vẫn có thể chuyển khoản bằng số tài khoản
            bên trên.
          </p>
        ) : (
          <Image
            src={qr}
            alt={`Mã QR mừng cưới ${side.toLowerCase()} cho ${name}`}
            width={240}
            height={290}
            style={{ width: "auto", height: "auto", maxWidth: "100%" }}
            unoptimized
            onError={() => setFailed(true)}
            referrerPolicy="no-referrer"
          />
        )}
      </div>
      <div className="gift-actions">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(account);
              setFeedback(`Đã sao chép số tài khoản ${side.toLowerCase()}.`);
            } catch {
              setFeedback(
                `Bạn có thể chọn và sao chép số tài khoản ${account} ở bên trên.`,
              );
            }
          }}
        >
          Sao chép số tài khoản {side.toLowerCase()}
        </button>
        {failed ? (
          <button
            type="button"
            className="secondary"
            onClick={() => setFailed(false)}
          >
            Tải lại mã QR
          </button>
        ) : (
          <a
            className="text-link"
            href={qr}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở ảnh QR để lưu
          </a>
        )}
      </div>
      {feedback && <p role="status">{feedback}</p>}
    </article>
  );
}
