"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Progressive enhancement: server-rendered content always remains readable. */
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
    const animations = new Set<Animation>();
    const photos = Array.from(
      container.querySelectorAll<HTMLElement>(
        ".wedding-hero-image, .wedding-album > button",
      ),
    );
    const story = container.querySelector<HTMLElement>(".wedding-photo-story");
    let opened = !container.querySelector(".invitation-opening");
    let frame = 0;
    const paint = () => {
      frame = 0;
      if (!opened || preference.matches) return;
      const height = window.innerHeight;
      if (story) {
        const bounds = story.getBoundingClientRect();
        const travel = Math.max(
          1,
          bounds.height - (story.firstElementChild as HTMLElement).offsetHeight,
        );
        const progress = Math.max(0, Math.min(1, -bounds.top / travel));
        const opening = Math.min(1, progress / 0.45);
        // Smoothstep gives each chapter a gentle arrival and departure.
        const ease = (value: number) => value * value * (3 - 2 * value);
        const gathering = ease(Math.min(1, progress / 0.38));
        const departing = ease(
          Math.max(0, Math.min(1, (progress - 0.72) / 0.28)),
        );
        story.style.setProperty("--orbit-opacity", `${1 - gathering}`);
        story.style.setProperty("--orbit-travel", `${gathering * 140}px`);
        story.style.setProperty("--orbit-turn", `${(1 - gathering) * 18}deg`);
        story.style.setProperty("--orbit-scale", `${0.8 + gathering * 0.2}`);
        story.style.setProperty("--stage-turn", `${(1 - gathering) * 7}deg`);
        story.style.setProperty("--stage-lift", `${departing * -32}px`);
        story.style.setProperty("--caption-lift", `${(1 - gathering) * 24}px`);
        story.style.setProperty("--chapter-progress", `${progress}`);
        const change = Math.max(0, Math.min(1, (progress - 0.4) / 0.5));
        story.style.setProperty("--scene-wipe", `${100 * (1 - change)}%`);
        story.style.setProperty("--scene-shift", `${8 * (1 - change)}%`);
        story.style.setProperty("--scene-scale", `${1.1 - change * 0.1}`);
        story.style.setProperty("--scene-first-label", `${1 - change}`);
        story.style.setProperty("--scene-second-label", `${change}`);
        story.style.setProperty("--story-inset", `${12 * (1 - opening)}%`);
        story.style.setProperty("--story-scale", `${1.16 - progress * 0.16}`);
        story.style.setProperty("--story-radius", `${120 * (1 - opening)}px`);
      }
      photos.forEach((photo) => {
        const bounds = photo.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.top > height) return;
        const progress = Math.max(
          0,
          Math.min(1, (height - bounds.top) / (height + bounds.height)),
        );
        photo.style.setProperty("--photo-drift", `${(progress - 0.5) * 28}px`);
        photo.style.setProperty("--photo-scale", `${1.09 - progress * 0.05}`);
      });
    };
    const schedule = () => {
      if (!frame && opened && !preference.matches)
        frame = window.requestAnimationFrame(paint);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    const reveal = (element: HTMLElement, index = 0) => {
      if (preference.matches || !element.animate) return;
      const animation = element.animate(
        [
          {
            opacity: 0,
            transform: `translateY(${index ? 18 : 28}px)`,
            ...(element.matches(".wedding-album > button")
              ? { clipPath: "inset(18% 0 18% 0)" }
              : {}),
          },
          {
            opacity: 1,
            transform: "translateY(0)",
            ...(element.matches(".wedding-album > button")
              ? { clipPath: "inset(0% 0 0% 0)" }
              : {}),
          },
        ],
        {
          duration: 800,
          delay: index * 90,
          easing: "cubic-bezier(.22,1,.36,1)",
          fill: "backwards",
        },
      );
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          const element = target as HTMLElement;
          if (element.classList.contains("wedding-hero-copy")) {
            Array.from(element.children).forEach((child, i) =>
              reveal(child as HTMLElement, i),
            );
          } else if (element.classList.contains("wedding-hero-image")) {
            if (!preference.matches) {
              const animation = element.animate(
                [
                  { clipPath: "inset(12% 12% 12% 12%)", opacity: 0.5 },
                  { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 },
                ],
                { duration: 1400, easing: "cubic-bezier(.22,1,.36,1)" },
              );
              animations.add(animation);
              animation.onfinish = () => animations.delete(animation);
            }
          } else if (
            element.matches(".wedding-section > h2, .wedding-thanks > h2")
          ) {
            if (!preference.matches) {
              const animation = element.animate(
                [
                  {
                    clipPath: "inset(0 0 100% 0)",
                    transform: "translateY(28px) scale(1.04)",
                  },
                  {
                    clipPath: "inset(0 0 0% 0)",
                    transform: "translateY(0) scale(1)",
                  },
                ],
                { duration: 1000, easing: "cubic-bezier(.22,1,.36,1)" },
              );
              animations.add(animation);
              animation.onfinish = () => animations.delete(animation);
            }
          } else if (element.matches(".wedding-album > button")) {
            const index = Array.from(element.parentElement!.children).indexOf(
              element,
            );
            reveal(element, index % 3);
          } else {
            reveal(element);
            element
              .querySelectorAll<HTMLElement>(
                ".family-grid > div, .event-card, .wedding-wishes > article",
              )
              .forEach((child, i) => reveal(child, i + 1));
          }
          observer.unobserve(element);
        });
      },
      { threshold: 0.08 },
    );
    const observe = () => {
      opened = true;
      container.classList.toggle(
        "invitation-motion-active",
        !preference.matches,
      );
      schedule();
      container
        .querySelectorAll(
          ".wedding-hero-copy, .wedding-hero-image, .wedding-section, .wedding-thanks, .wedding-album > button, .wedding-section > h2, .wedding-thanks > h2",
        )
        .forEach((element) => observer.observe(element));
    };
    container.addEventListener("invitation-opened", observe);
    if (!container.querySelector(".invitation-opening")) observe();
    const stop = () => {
      container.classList.toggle(
        "invitation-motion-active",
        opened && !preference.matches,
      );
      if (preference.matches) {
        resetTilt();
        animations.forEach((animation) => animation.cancel());
        story?.removeAttribute("style");
        photos.forEach((photo) => {
          photo.style.removeProperty("--photo-drift");
          photo.style.removeProperty("--photo-scale");
        });
      } else schedule();
    };
    preference.addEventListener("change", stop);
    return () => {
      resetTilt();
      container.removeEventListener("pointermove", tilt);
      container.removeEventListener("pointerleave", resetTilt);
      finePointer.removeEventListener("change", resetTilt);
      container.removeEventListener("invitation-opened", observe);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", stop);
    };
  }, []);
  return <div ref={root}>{children}</div>;
}
