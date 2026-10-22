"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./invitation-motion.module.css";

const ease = "cubic-bezier(.22,1,.36,1)";
/** One-shot entrances; a container that holds other targets stays put. */
const targetSelector = [
  "[data-hero-copy] > *",
  "[data-hero-photo]",
  "[data-story-image]",
  ".story-words",
  ".album-title-line",
  ".wedding-section > :not(dialog, .wedding-photo-story)",
  ".wedding-thanks > :not(dialog)",
  ".family-grid > *",
  ".event-card",
  ".wedding-wishes > article",
  ".wedding-album > button",
].join(", ");
const photoSelector =
  "[data-hero-photo], [data-story-image], .wedding-album > button";
/** Individual transform properties compose with each design's own transform. */
const entrances: Record<string, Keyframe[]> = {
  "vuon-thuong": [
    { clipPath: "circle(0% at 50% 65%)", opacity: 0.3 },
    { clipPath: "circle(100% at 50% 65%)", opacity: 1 },
  ],
  "song-hy": [{ rotate: "y -35deg", opacity: 0, offset: 0 }],
  "ngay-chung-doi": [
    { clipPath: "inset(0 100% 0 0)" },
    { clipPath: "inset(0 0% 0 0)" },
  ],
  "dem-sao": [{ scale: "0.7", filter: "blur(12px)", opacity: 0, offset: 0 }],
  "nang-thu": [
    { translate: "0 90px", rotate: "-18deg", opacity: 0, offset: 0 },
  ],
  "loi-hen": [
    { clipPath: "inset(50% 0 50% 0)" },
    { clipPath: "inset(0% 0 0% 0)" },
  ],
  "thu-tinh": [{ rotate: "x -45deg", opacity: 0, offset: 0 }],
  "khoanh-khac": [{ scale: "1.18", opacity: 0.2, offset: 0 }],
  "ben-nhau": [
    { clipPath: "inset(0 45% 0 45%)" },
    { clipPath: "inset(0 0% 0 0%)" },
  ],
};
/** Cover entrances that follow the portrait's own frame, so they stay on it. */
const heroEntrances: Record<string, Keyframe[]> = {
  "loi-yeu": [
    { clipPath: "inset(100% 0 0 0 round 999px 999px 6px 6px)" },
    { clipPath: "inset(0% 0 0 0 round 999px 999px 6px 6px)" },
  ],
};

/**
 * Progressive enhancement: server-rendered content always remains readable.
 * Scroll-linked motion lives in CSS scroll timelines, so nothing here runs per
 * scroll frame; JS only plays entrances once and keeps album prints tactile.
 */
export function InvitationMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current;
    if (!container || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let pointerFrame = 0;
    let hovered: HTMLElement | null = null;
    const resetTilt = () => {
      window.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      hovered?.style.removeProperty("--tilt-x");
      hovered?.style.removeProperty("--tilt-y");
      hovered?.style.removeProperty("--shine-x");
      hovered?.style.removeProperty("--shine-y");
      hovered?.classList.remove("photo-hovered");
      hovered = null;
    };
    const tilt = (event: PointerEvent) => {
      if (
        preference.matches ||
        !finePointer.matches ||
        event.pointerType !== "mouse"
      )
        return;
      const photo = (event.target as Element).closest<HTMLElement>(
        ".wedding-album > button",
      );
      if (!photo) {
        resetTilt();
        return;
      }
      if (hovered !== photo) {
        resetTilt();
        hovered = photo;
      }
      window.cancelAnimationFrame(pointerFrame);
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        const bounds = photo.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(1, (event.clientX - bounds.left) / bounds.width),
        );
        const y = Math.max(
          0,
          Math.min(1, (event.clientY - bounds.top) / bounds.height),
        );
        photo.style.setProperty("--tilt-x", `${(0.5 - y) * 6}deg`);
        photo.style.setProperty("--tilt-y", `${(x - 0.5) * 6}deg`);
        photo.style.setProperty("--shine-x", `${x * 100}%`);
        photo.style.setProperty("--shine-y", `${y * 100}%`);
        photo.classList.add("photo-hovered");
      });
    };
    container.addEventListener("pointermove", tilt);
    container.addEventListener("pointerleave", resetTilt);
    finePointer.addEventListener("change", resetTilt);

    const design =
      container
        .querySelector(".wedding-page")
        ?.className.match(/design-([\w-]+)/)?.[1] || "";
    const candidates = Array.from(
      container.querySelectorAll<HTMLElement>(targetSelector),
    ).filter(
      (element) =>
        !element.closest('[data-motion="own"], .wedding-photo-story, dialog'),
    );
    const targets = candidates.filter(
      (element) =>
        !candidates.some(
          (other) => other !== element && element.contains(other),
        ),
    );
    const keyframes = (element: HTMLElement, index: number): Keyframe[] => {
      if (element.matches("h2"))
        return [{ opacity: 0, translate: "0 .45em", scale: "1.04", offset: 0 }];
      if (element.matches(".event-card"))
        return [
          {
            opacity: 0,
            translate: "0 40px",
            rotate: `${index % 2 ? -2 : 2}deg`,
            offset: 0,
          },
        ];
      if (element.matches("[data-hero-photo]") && heroEntrances[design])
        return heroEntrances[design];
      if (element.matches(photoSelector))
        return (
          entrances[design] || [
            { opacity: 0, translate: "0 48px", scale: "0.94", offset: 0 },
          ]
        );
      return [{ opacity: 0, translate: "0 28px", offset: 0 }];
    };
    const animations = new Set<Animation>();
    const markSection = (element: HTMLElement) =>
      element
        .closest(".wedding-section, .wedding-thanks")
        ?.classList.add("is-revealed");
    let delay = 0;
    const reveal = (elements: HTMLElement[]) => {
      const base = delay;
      delay = 0;
      elements
        .sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
            ? -1
            : 1,
        )
        .forEach((element, i) => {
          observer.unobserve(element);
          element.dataset.reveal = "in";
          markSection(element);
          if (preference.matches || !element.animate) return;
          const animation = element.animate(keyframes(element, i), {
            duration: element.matches("h2, " + photoSelector) ? 1100 : 900,
            delay: base + Math.min(i, 6) * 90,
            easing: ease,
            fill: "backwards",
          });
          animations.add(animation);
          const settle = () => animations.delete(animation);
          animation.onfinish = settle;
          animation.oncancel = settle;
        });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target as HTMLElement);
        if (visible.length) reveal(visible);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    // Pause falling petals once the hero is out of view.
    const petals = new IntersectionObserver((entries) =>
      entries.forEach(({ target, isIntersecting }) =>
        target.toggleAttribute("data-paused", !isIntersecting),
      ),
    );
    container
      .querySelectorAll(".wedding-petals")
      .forEach((element) => petals.observe(element));

    let started = false;
    const start = (wait: number) => {
      if (started) return;
      started = true;
      delay = wait;
      container.classList.toggle(
        "invitation-motion-active",
        !preference.matches,
      );
      targets
        .filter((element) => element.dataset.reveal === "wait")
        .forEach((element) => observer.observe(element));
    };
    // Behind the opening doors everything waits; the hero reveals as they part.
    // Designs that stage their own hero key it on data-entrance.
    const onOpeningStart = (event: Event) => {
      const instant = (event as CustomEvent<{ instant?: boolean }>).detail
        ?.instant;
      if (!instant && !preference.matches)
        container.dataset.entrance = "opening";
      start(instant ? 0 : 650);
    };
    const onOpened = () => start(0);
    const opening = container.querySelector<HTMLDialogElement>(
      ".invitation-opening",
    );
    if (opening?.open) {
      targets.forEach((element) => (element.dataset.reveal = "wait"));
      container.addEventListener("invitation-opening-start", onOpeningStart);
      container.addEventListener("invitation-opened", onOpened);
    } else {
      // Already on screen: never hide what the guest is reading.
      const fold = window.innerHeight * 0.9;
      targets.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        const seen = bounds.top < fold && bounds.bottom > 0;
        element.dataset.reveal = seen ? "in" : "wait";
        if (seen) markSection(element);
      });
      start(0);
    }

    const sync = () => {
      container.classList.toggle(
        "invitation-motion-active",
        started && !preference.matches,
      );
      if (preference.matches) {
        resetTilt();
        animations.forEach((animation) => animation.cancel());
      }
    };
    preference.addEventListener("change", sync);
    return () => {
      resetTilt();
      container.removeEventListener("pointermove", tilt);
      container.removeEventListener("pointerleave", resetTilt);
      finePointer.removeEventListener("change", resetTilt);
      container.removeEventListener("invitation-opening-start", onOpeningStart);
      container.removeEventListener("invitation-opened", onOpened);
      preference.removeEventListener("change", sync);
      observer.disconnect();
      petals.disconnect();
      animations.forEach((animation) => animation.cancel());
      targets.forEach((element) => delete element.dataset.reveal);
      container.classList.remove("invitation-motion-active");
      delete container.dataset.entrance;
    };
  }, []);
  return (
    <div ref={root} className={styles.root}>
      {children}
    </div>
  );
}
