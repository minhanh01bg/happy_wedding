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
    const reveal = (element: HTMLElement, index = 0) => {
      if (preference.matches || !element.animate) return;
      const animation = element.animate(
        [
          { opacity: 0, transform: `translateY(${index ? 18 : 28}px)` },
          { opacity: 1, transform: "translateY(0)" },
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
          } else {
            reveal(element);
            element
              .querySelectorAll<HTMLElement>(
                ".family-grid > div, .event-card, .wedding-album > button, .wedding-wishes > article",
              )
              .forEach((child, i) => reveal(child, i + 1));
          }
          observer.unobserve(element);
        });
      },
      { threshold: 0.08 },
    );
    container
      .querySelectorAll(
        ".wedding-hero-copy, .wedding-hero-image, .wedding-section, .wedding-thanks",
      )
      .forEach((element) => observer.observe(element));
    const stop = () => {
      if (preference.matches)
        animations.forEach((animation) => animation.cancel());
    };
    preference.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", stop);
    };
  }, []);
  return <div ref={root}>{children}</div>;
}
