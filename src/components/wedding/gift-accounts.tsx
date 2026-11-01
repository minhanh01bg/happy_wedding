"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Check, Copy, Download, X, ZoomIn } from "lucide-react";
import { bankName } from "@/lib/banks";
import { copyText } from "@/lib/copy-text";
import {
  createQrMatrix,
  downloadDataUrl,
  qrPngDataUrl,
  qrSvgDataUrl,
} from "@/lib/qr-image";
import { vietQrPayload } from "@/lib/vietqr";
import styles from "./gift-accounts.module.css";

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
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  const close = () => dialog.current?.close();
  return (
    <div className="wedding-gift-box">
      <button
        type="button"
        className="gift-box-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <GiftArt />
        <span className="gift-box-label">Mở hộp quà mừng cưới</span>
        <span className="gift-box-hint">
          Một chút yêu thương gửi đến chúng mình
        </span>
      </button>
      <dialog
        ref={dialog}
        className="gift-modal"
        aria-labelledby="gift-modal-title"
        aria-describedby="gift-modal-lead"
        onClose={(event) => {
          // React chuyển sự kiện close của dialog QR lồng bên trong lên đây.
          if (event.target === event.currentTarget) setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="gift-modal-surface">
          <button
            type="button"
            className="gift-modal-close"
            aria-label="Đóng hộp quà"
            onClick={close}
            autoFocus
          >
            <X size={22} />
          </button>
          <div
            className={`gift-celebration ${styles.celebration}`}
            aria-hidden="true"
          >
            <span className="gift-burst-glow" />
            <GiftArt />
            {Array.from({ length: 40 }, (_, index) => {
              const angle = index * 2.399;
              return (
                <i
                  key={index}
                  style={
                    {
                      "--burst-x": `${Math.round(Math.cos(angle) * (100 + (index % 5) * 34))}px`,
                      "--burst-y": `${Math.round(Math.sin(angle) * (90 + (index % 7) * 18) - 50)}px`,
                      "--burst-spin": `${index % 2 ? 440 : -380}deg`,
                      "--burst-color": [
                        "#c99548",
                        "#aa6175",
                        "#eac6a1",
                        "#fff0cb",
                      ][index % 4],
                      "--burst-delay": `${(index % 5) * 25}ms`,
                    } as CSSProperties
                  }
                >
                  {index % 6 === 0 ? "♡" : ""}
                </i>
              );
            })}
          </div>
          <div className={styles.header}>
            <h2 id="gift-modal-title" className={styles.title}>
              Hộp quà yêu thương
            </h2>
            <p id="gift-modal-lead" className={styles.lead}>
              Quét mã QR hoặc sao chép số tài khoản để gửi yêu thương
            </p>
          </div>
          <div className="gift-box-content">
            {preview && (
              <p className="gift-demo-note">
                QR minh họa · không dùng để chuyển khoản. Thêm tài khoản nhà
                trai và nhà gái khi tạo thiệp.
              </p>
            )}
            {accounts.length > 0 && (
              <div className={styles.grid}>
                {accounts.map((account) => (
                  <GiftCard key={account.side} {...account} />
                ))}
              </div>
            )}
            {preview && (
              <div className={styles.grid}>
                {(["Nhà trai", "Nhà gái"] as const).map((side, index) => (
                  <article
                    className={`gift-card gift-demo-card ${styles.card}`}
                    data-side={sideKey(side)}
                    key={side}
                  >
                    <span className={styles.side}>{side}</span>
                    <span className={styles.qrTile}>
                      <Image
                        src={`/images/qr-demo-${index + 1}.svg`}
                        width={220}
                        height={220}
                        alt={`QR minh họa ${side.toLowerCase()}, không dùng chuyển khoản`}
                      />
                    </span>
                    <h3 className={styles.name}>QR minh họa</h3>
                    <p className={styles.bank}>
                      Số tài khoản hiện ở đây khi cặp đôi thêm ngân hàng.
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}

function GiftArt() {
  return (
    <span className="gift-box-art" aria-hidden="true">
      <span className="gift-box-lid">
        <span className="gift-box-bow" />
      </span>
      <span className="gift-box-body">
        <span className="gift-box-heart">♡</span>
      </span>
    </span>
  );
}

function sideKey(side: GiftAccount["side"]) {
  return side === "Nhà trai" ? "groom" : "bride";
}

/**
 * Mã QR tự sinh từ payload VietQR, không tải ảnh từ img.vietqr.io. Ảnh chỉ
 * có ô vuông QR, không in sẵn tên hay số tài khoản nên thẻ không bị lặp chữ.
 */
function useVietQr(bank: string, account: string) {
  return useMemo(() => {
    try {
      const matrix = createQrMatrix(vietQrPayload(bank, account));
      return { matrix, svg: qrSvgDataUrl(matrix) };
    } catch {
      return null;
    }
  }, [bank, account]);
}

function GiftCard({ side, bank, account, name }: GiftAccount) {
  const qr = useVietQr(bank, account);
  const [zoomed, setZoomed] = useState(false);
  // PNG chỉ vẽ khi mở lớp xem lớn: canvas chỉ có trong trình duyệt.
  const [png, setPng] = useState<string | null>(null);
  const [download, setDownload] = useState<"idle" | "done" | "failed">("idle");
  const zoom = useRef<HTMLDialogElement>(null);
  const qrButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const sideLabel = side.toLowerCase();
  const bankLabel = bankName(bank);
  const openZoom = () => {
    if (qr && !png) setPng(qrPngDataUrl(qr.matrix));
    setDownload("idle");
    setZoomed(true);
    zoom.current?.showModal();
    closeButton.current?.focus();
  };
  return (
    <article className={`gift-card ${styles.card}`} data-side={sideKey(side)}>
      <span className={styles.side}>{side}</span>
      {qr ? (
        // Chính ảnh QR là chỗ bấm; button để bàn phím và trình đọc màn hình
        // cũng mở được.
        <button
          ref={qrButton}
          type="button"
          className={styles.qrTile}
          aria-haspopup="dialog"
          aria-label={`Phóng to mã QR mừng cưới ${sideLabel} của ${name}`}
          onClick={openZoom}
        >
          <Image src={qr.svg} alt="" width={328} height={328} unoptimized />
          <span className={styles.zoomBadge} aria-hidden="true">
            <ZoomIn size={14} />
          </span>
        </button>
      ) : (
        <div className={styles.qrFailed}>
          <p role="status">
            Chưa tạo được mã QR. Bạn vẫn chuyển khoản được bằng số tài khoản bên
            dưới.
          </p>
        </div>
      )}
      <h3 className={styles.name}>{name}</h3>
      <CopyAccount account={account} side={side} bankLabel={bankLabel} />
      {qr && (
        <dialog
          ref={zoom}
          className={styles.zoom}
          aria-label={`Mã QR mừng cưới ${sideLabel}`}
          onClose={(event) => {
            // Không để React chuyển tiếp lên dialog hộp quà: hộp quà vẫn mở.
            event.stopPropagation();
            setZoomed(false);
            qrButton.current?.focus();
          }}
          onClick={(event) => {
            // Lớp phủ kín màn hình: chạm ra ngoài khung trắng là chạm nền.
            if (event.target === event.currentTarget) zoom.current?.close();
          }}
        >
          <div className={styles.zoomPanel}>
            <button
              ref={closeButton}
              type="button"
              className={styles.zoomClose}
              aria-label="Đóng mã QR phóng to"
              onClick={() => zoom.current?.close()}
            >
              <X size={22} aria-hidden="true" />
            </button>
            {zoomed && (
              <>
                <span className={styles.side}>{side}</span>
                <div className={styles.zoomQr}>
                  <Image
                    src={png ?? qr.svg}
                    alt={`Mã QR mừng cưới ${sideLabel} cho ${name}`}
                    width={540}
                    height={540}
                    unoptimized
                  />
                </div>
                <p className={styles.saveHint}>Nhấn giữ ảnh để lưu vào máy</p>
                <strong className={styles.name}>{name}</strong>
                <CopyAccount
                  account={account}
                  side={side}
                  bankLabel={bankLabel}
                >
                  {png && (
                    <button
                      type="button"
                      className={styles.action}
                      onClick={(event) => {
                        const saved = downloadDataUrl(
                          png,
                          `qr-mung-cuoi-${sideKey(side) === "groom" ? "nha-trai" : "nha-gai"}.png`,
                          event.currentTarget,
                        );
                        setDownload(saved ? "done" : "failed");
                      }}
                    >
                      <Download size={16} aria-hidden="true" />
                      <span>Tải ảnh QR</span>
                    </button>
                  )}
                </CopyAccount>
                <p
                  role="status"
                  className={
                    download === "failed" ? styles.copyHint : "sr-only"
                  }
                >
                  {download === "done" && "Đã tải ảnh QR về máy."}
                  {download === "failed" &&
                    "Chưa tải được ảnh. Hãy nhấn giữ ảnh QR để lưu vào máy."}
                </p>
              </>
            )}
          </div>
        </dialog>
      )}
    </article>
  );
}

type CopyState = "idle" | "copied" | "failed";

/** Ngân hàng, số tài khoản (chạm để sao chép) và nút "Sao chép STK". */
function CopyAccount({
  account,
  side,
  bankLabel,
  children,
}: {
  account: string;
  side: GiftAccount["side"];
  bankLabel: string;
  children?: ReactNode;
}) {
  const digits = account.replace(/\s+/g, "");
  // Nhóm 4 ký tự chỉ để dễ đọc; chữ trong DOM không có dấu cách.
  const groups = digits.match(/.{1,4}/g) ?? [digits];
  const sideLabel = side.toLowerCase();
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (event: MouseEvent<HTMLButtonElement>) => {
    const copied = await copyText(digits, event.currentTarget);
    clearTimeout(timer.current);
    setState(copied ? "copied" : "failed");
    if (copied) timer.current = setTimeout(() => setState("idle"), 2000);
  };
  return (
    <div className={styles.copyArea}>
      <p className={styles.bank}>{bankLabel}</p>
      <button
        type="button"
        className={styles.number}
        aria-label={`Sao chép số tài khoản ${digits}`}
        onClick={copy}
      >
        <span className={styles.digits}>
          {groups.map((group, index) => (
            <span key={index}>{group}</span>
          ))}
        </span>
      </button>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.action} ${styles.copy}`}
          data-copied={state === "copied" || undefined}
          onClick={copy}
        >
          {state === "copied" ? (
            <>
              <Check size={16} aria-hidden="true" />
              <span>Đã sao chép</span>
            </>
          ) : (
            <>
              <Copy size={16} aria-hidden="true" />
              {/* Mắt đọc "STK"; trình đọc màn hình đọc đủ "số tài khoản". */}
              <span>
                Sao chép <span aria-hidden="true">STK</span>
                <span className="sr-only">số tài khoản {sideLabel}</span>
              </span>
            </>
          )}
        </button>
        {children}
      </div>
      <div
        role="status"
        className={state === "failed" ? styles.copyHint : "sr-only"}
      >
        {state === "copied" && `Đã sao chép số tài khoản ${sideLabel}.`}
        {state === "failed" && (
          <>
            Chưa sao chép tự động được. Hãy chạm giữ số{" "}
            <span className={styles.selectable}>{digits}</span> để chọn rồi sao
            chép.
          </>
        )}
      </div>
    </div>
  );
}
