"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Progressive enhancement: server-rendered content always remains readable. */
export function InvitationMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current;
    if (!container || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
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
        story.style.setProperty("--story-inset", `${12 * (1 - progress)}%`);
        story.style.setProperty("--story-scale", `${1.16 - progress * 0.16}`);
        story.style.setProperty("--story-radius", `${120 * (1 - progress)}px`);
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
          ".wedding-hero-copy, .wedding-hero-image, .wedding-section, .wedding-thanks, .wedding-album > button",
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
