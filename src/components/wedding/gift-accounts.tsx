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

export function GiftAccounts({ accounts }: { accounts: GiftAccount[] }) {
  return (
    <div className="gift-grid">
      {accounts.map((account) => (
        <GiftCard key={account.side} {...account} />
      ))}
    </div>
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
