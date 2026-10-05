"use client";

import Image from "next/image";
import { weddingImageSource } from "@/lib/wedding-images";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function InvitationAlbum({
  photos,
  couple,
}: {
  photos: string[];
  couple: string;
}) {
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
      {photos.length > 1 && (
        <div className="wedding-photo-story" aria-hidden="true">
          <div className="wedding-photo-stage">
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
            <p className="wedding-photo-caption">
              Từng khoảnh khắc, một đời thương nhớ
            </p>
          </div>
        </div>
      )}
      <div className="wedding-album">
        {photos.map((photo, i) => (
          <button
            type="button"
            key={`${photo}-${i}`}
            aria-label={`Xem ảnh kỷ niệm ${i + 1} của ${couple}`}
            onClick={() => {
              setDirection("next");
              setSelected(i);
              dialog.current?.showModal();
            }}
          >
            <Image
              src={weddingImageSource(photo)}
              alt={`Kỷ niệm của ${couple}, ảnh ${i + 1}`}
              fill
              sizes="(max-width:800px) 45vw, 300px"
            />
            <span aria-hidden="true">Xem ảnh ↗</span>
          </button>
        ))}
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
