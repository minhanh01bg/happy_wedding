"use client";

import { useEffect, useRef } from "react";
import { Heart } from "lucide-react";

export function InvitationOpening({
  groom,
  bride,
  date,
  guestName,
}: {
  groom: string;
  bride: string;
  date: string;
  guestName?: string;
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
                    transform: "perspective(1200px) rotateY(0deg)",
                    opacity: 1,
                  },
                  {
                    transform: `perspective(1200px) rotateY(${i ? 105 : -105}deg)`,
                    opacity: 0,
                  },
                ],
                {
                  duration: 1250,
                  easing: "cubic-bezier(.65,0,.25,1)",
                  fill: "forwards",
                },
              ),
            );
          });
        const seal = element.querySelector(".invitation-seal");
        if (seal)
          animations.push(
            seal.animate(
              [
                { opacity: 1, transform: "scale(1)" },
                { opacity: 0, transform: "scale(.85)" },
              ],
              { duration: 350, fill: "forwards" },
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
      </div>
      <div className="invitation-door door-right" aria-hidden="true">
        <span />
      </div>
      <div className="invitation-seal">
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
          <Heart size={20} /> Mở thiệp
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
