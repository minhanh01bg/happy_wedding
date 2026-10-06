"use client";

import { useEffect, useRef } from "react";
import { Heart } from "lucide-react";

export function InvitationOpening({
  groom,
  bride,
  date,
  guestName,
  hasMusic = false,
}: {
  groom: string;
  bride: string;
  date: string;
  guestName?: string;
  hasMusic?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opening = useRef(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function open(skipMotion = false) {
    const element = dialog.current;
    if (!element || opening.current) return;
    opening.current = true;
    // Request playback inside the click, before animation awaits lose user activation.
    if (!skipMotion && hasMusic)
      element.dispatchEvent(
        new Event("invitation-music-request", { bubbles: true }),
      );
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Animation[] = [];
    const finishImmediately = () =>
      animations.forEach((animation) => animation.finish());
    reduce.addEventListener("change", finishImmediately);
    try {
      if (
        !skipMotion &&
        !reduce.matches &&
        typeof element.animate === "function"
      ) {
        element
          .querySelectorAll<HTMLElement>(".invitation-door")
          .forEach((door, i) => {
            animations.push(
              door.animate(
                [
                  {
                    transform: "rotateY(0deg) translateX(0%)",
                    opacity: 1,
                  },
                  {
                    transform: `rotateY(${i ? 38 : -38}deg) translateX(${i ? 4 : -4}%)`,
                    opacity: 1,
                    offset: 0.55,
                  },
                  {
                    transform: `rotateY(${i ? 82 : -82}deg) translateX(${i ? 12 : -12}%)`,
                    opacity: 0,
                  },
                ],
                {
                  duration: 1650,
                  delay: 220,
                  easing: "cubic-bezier(.22,.68,.18,1)",
                  fill: "forwards",
                },
              ),
            );
          });
        const glow = element.querySelector(".opening-glow");
        if (glow)
          animations.push(
            glow.animate(
              [{ opacity: 0 }, { opacity: 0.6, offset: 0.35 }, { opacity: 0 }],
              { duration: 1870, fill: "forwards" },
            ),
          );
        const seal = element.querySelector(".invitation-seal");
        if (seal)
          animations.push(
            seal.animate(
              [
                { opacity: 1, transform: "scale(1)" },
                { opacity: 0, transform: "translateY(-28px) scale(1.035)" },
              ],
              {
                duration: 520,
                easing: "cubic-bezier(.22,1,.36,1)",
                fill: "forwards",
              },
            ),
          );
        await Promise.all(
          animations.map((animation) => animation.finished.catch(() => {})),
        );
      }
      element.close();
      const heading = element
        .closest(".wedding-page")
        ?.querySelector<HTMLElement>(".wedding-hero h1");
      heading?.focus({ preventScroll: true });
      element.dispatchEvent(new Event("invitation-opened", { bubbles: true }));
    } finally {
      reduce.removeEventListener("change", finishImmediately);
      animations.forEach((animation) => animation.cancel());
      opening.current = false;
    }
  }

  return (
    <dialog
      ref={dialog}
      className="invitation-opening"
      aria-labelledby="opening-title"
      onCancel={(event) => {
        event.preventDefault();
        void open(true);
      }}
    >
      <div className="invitation-door door-left" aria-hidden="true">
        <span />
        <DoorFloral />
      </div>
      <div className="invitation-door door-right" aria-hidden="true">
        <span />
        <DoorFloral />
      </div>
      <div className="opening-glow" aria-hidden="true" />
      <div className="invitation-seal">
        <div className="opening-wax" aria-hidden="true">
          <Heart size={24} strokeWidth={1.2} />
        </div>
        <p className="eyebrow">TRÂN TRỌNG KÍNH MỜI</p>
        {guestName && <p className="opening-guest">{guestName}</p>}
        <h2 id="opening-title">
          {groom}
          <em>&</em>
          {bride}
        </h2>
        <p className="opening-date">{date}</p>
        <button
          type="button"
          className="button opening-button"
          autoFocus
          onClick={() => void open()}
        >
          <Heart size={20} /> {hasMusic ? "Mở thiệp kèm nhạc" : "Mở thiệp"}
        </button>
        <button
          type="button"
          className="opening-skip"
          onClick={() => void open(true)}
        >
          Xem ngay, bỏ qua hiệu ứng
        </button>
        <p className="opening-hint">Chạm để mở ngày vui của chúng mình</p>
      </div>
    </dialog>
  );
}

function DoorFloral() {
  return (
    <svg
      className="door-floral"
      viewBox="0 0 180 400"
      fill="none"
      aria-hidden="true"
    >
      <path d="M90 380C55 300 130 240 82 158C64 123 71 67 92 20M83 153C30 137 32 94 32 94C75 94 85 118 83 153ZM88 244C142 230 149 190 149 190C100 188 88 211 88 244ZM77 320C25 294 30 258 30 258C68 264 83 288 77 320ZM79 92C126 80 128 48 128 48C94 47 78 64 79 92Z" />
      <path d="M91 20C66 9 63 32 83 41C99 47 110 27 91 20ZM32 94L64 125M149 190L111 222M30 258L65 293" />
    </svg>
  );
}
