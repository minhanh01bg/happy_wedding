"use client";

import Image from "next/image";
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
  const move = (step: number) =>
    setSelected((current) => (current + step + photos.length) % photos.length);
  return (
    <>
      <div className="wedding-album">
        {photos.map((photo, i) => (
          <button
            type="button"
            key={`${photo}-${i}`}
            aria-label={`Xem ảnh kỷ niệm ${i + 1} của ${couple}`}
            onClick={() => {
              setSelected(i);
              dialog.current?.showModal();
            }}
          >
            <Image
              src={photo}
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
        <div className="lightbox-image" key={selected}>
          <Image
            src={photos[selected]}
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
