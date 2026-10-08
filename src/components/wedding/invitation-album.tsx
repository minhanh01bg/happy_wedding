"use client";

import Image from "next/image";
import { weddingImageSource } from "@/lib/wedding-images";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";

export function InvitationAlbum({
  photos,
  couple,
  design = "loi-yeu",
}: {
  photos: string[];
  couple: string;
  design?: string;
}) {
  const [landscape, setLandscape] = useState<string[]>([]);
  const [spread, setSpread] = useState(0);
  const [spotlight, setSpotlight] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(0);
  const [direction, setDirection] = useState("next");
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const move = (step: number) => {
    setDirection(step < 0 ? "previous" : "next");
    setSelected((current) => (current + step + photos.length) % photos.length);
  };
  return (
    <>
      {design === "loi-yeu" && photos.length > 1 && (
        <div className="wedding-photo-story" aria-hidden="true">
          <div className="wedding-photo-stage">
            <div className="wedding-photo-orbit">
              {photos.slice(1, 5).map((photo, index) => (
                <div
                  className={`wedding-photo-card photo-card-${index}`}
                  key={index}
                >
                  <Image
                    src={weddingImageSource(photo)}
                    alt=""
                    fill
                    sizes="(max-width:800px) 30vw, 260px"
                  />
                </div>
              ))}
            </div>
            <div className="wedding-photo-frame">
              <Image
                src={weddingImageSource(photos[0])}
                alt=""
                fill
                sizes="(max-width:800px) 90vw, 1000px"
              />
            </div>
            <div className="wedding-photo-frame wedding-photo-second">
              <Image
                src={weddingImageSource(photos[1])}
                alt=""
                fill
                sizes="(max-width:800px) 90vw, 1000px"
              />
            </div>
            <div className="wedding-photo-scene-label">
              <span>01 / KỶ NIỆM</span>
              <span>02 / BÊN NHAU</span>
            </div>
            <div className="wedding-photo-progress">
              <span />
            </div>
            <p className="wedding-photo-caption">
              Từng khoảnh khắc, một đời thương nhớ
            </p>
          </div>
        </div>
      )}
      <div
        className={`album-composition album-${design}`}
        data-album-composition={design}
      >
        <div className="album-title-line">
          <Heart size={16} />
          <p>Mỗi tấm ảnh, một lời thương.</p>
          <span>{String(photos.length).padStart(2, "0")} KỶ NIỆM</span>
        </div>
        {design === "dem-sao" && (
          <div className="album-spotlight" aria-live="polite">
            <Image
              key={spotlight}
              src={weddingImageSource(photos[spotlight])}
              alt={`Kỷ niệm ${spotlight + 1} của ${couple}`}
              fill
              sizes="(max-width:760px) 90vw, 800px"
            />
            <span>
              {String(spotlight + 1).padStart(2, "0")} / DƯỚI BẦU TRỜI YÊU
            </span>
          </div>
        )}
        <div
          className="wedding-album"
          key={design === "thu-tinh" ? spread : design}
        >
          {photos.map((photo, i) => (
            <button
              type="button"
              data-album-photo
              data-photo-index={i}
              key={`${photo}-${i}`}
              hidden={design === "thu-tinh" && Math.floor(i / 2) !== spread}
              className={
                [
                  design === "dem-sao" && spotlight === i ? "is-current" : "",
                  weddingImageSource(photo).includes(
                    "wedding-couple-journey",
                  ) ||
                  weddingImageSource(photo).includes("wedding-couple-moment") ||
                  landscape.includes(photo)
                    ? "is-landscape"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              style={
                {
                  "--photo-index": i,
                  "--print-turn": `${((i % 3) - 1) * 7}deg`,
                } as import("react").CSSProperties
              }
              aria-label={`Xem ảnh kỷ niệm ${i + 1} của ${couple}`}
              onFocus={() => {
                if (design === "dem-sao") setSpotlight(i);
              }}
              onPointerEnter={() => {
                if (design === "dem-sao") setSpotlight(i);
              }}
              onClick={() => {
                setDirection("next");
                setSelected(i);
                dialog.current?.showModal();
              }}
            >
              <picture className="album-photo-surface">
                <Image
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    if (image.naturalWidth > image.naturalHeight * 1.2)
                      setLandscape((current) =>
                        current.includes(photo) ? current : [...current, photo],
                      );
                  }}
                  src={weddingImageSource(photo)}
                  alt={`Kỷ niệm của ${couple}, ảnh ${i + 1}`}
                  fill
                  sizes="(max-width:760px) 90vw, 700px"
                />
              </picture>
              <span aria-hidden="true">
                <b>{String(i + 1).padStart(2, "0")}</b>{" "}
                {design === "nang-thu" ? "Một ngày thật đẹp ♡" : "Xem ảnh ↗"}
              </span>
            </button>
          ))}
        </div>
        {design === "thu-tinh" && photos.length > 2 && (
          <div className="album-page-controls">
            <button
              type="button"
              disabled={spread === 0}
              onClick={() => setSpread(spread - 1)}
            >
              <ChevronLeft size={18} />
              Trang trước
            </button>
            <span aria-live="polite">
              Trang {spread + 1} / {Math.ceil(photos.length / 2)}
            </span>
            <button
              type="button"
              disabled={spread >= Math.ceil(photos.length / 2) - 1}
              onClick={() => setSpread(spread + 1)}
            >
              Trang sau
              <ChevronRight size={18} />
            </button>
          </div>
        )}
        {design === "loi-hen" && (
          <p className="album-scroll-hint">
            Vuốt ngang để xem những ngày bên nhau →
          </p>
        )}
        {design === "ben-nhau" && (
          <p className="album-scroll-hint">Chạm một khung ảnh để mở kỷ niệm</p>
        )}
      </div>
      <dialog
        ref={dialog}
        className="wedding-lightbox"
        aria-label="Album ảnh cưới"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move(1);
          }
        }}
      >
        <div className="lightbox-toolbar">
          <p aria-live="polite">
            Ảnh {selected + 1} / {photos.length}
          </p>
          <button
            type="button"
            autoFocus
            aria-label="Đóng album"
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        <div
          className={`lightbox-image photo-${direction}`}
          key={selected}
          onPointerDown={(event) => {
            if (event.pointerType !== "touch" || !event.isPrimary) return;
            swipe.current = {
              x: event.clientX,
              y: event.clientY,
              id: event.pointerId,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            swipe.current = null;
          }}
          onPointerUp={(event) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start || start.id !== event.pointerId) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (
              photos.length > 1 &&
              Math.abs(dx) >= 50 &&
              Math.abs(dx) > Math.abs(dy) * 1.5
            )
              move(dx < 0 ? 1 : -1);
          }}
        >
          <Image
            src={weddingImageSource(photos[selected])}
            alt={`Kỷ niệm của ${couple}, ảnh ${selected + 1}`}
            fill
            sizes="95vw"
          />
        </div>
        {photos.length > 1 && (
          <div className="lightbox-navigation">
            <button
              type="button"
              aria-label="Ảnh trước"
              onClick={() => move(-1)}
            >
              <ChevronLeft /> Ảnh trước
            </button>
            <button
              type="button"
              aria-label="Ảnh tiếp theo"
              onClick={() => move(1)}
            >
              Ảnh tiếp <ChevronRight />
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
