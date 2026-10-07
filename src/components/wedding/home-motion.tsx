"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Event-driven motion; the server-rendered page stays visible without JavaScript. */
export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current;
    if (!container || !window.IntersectionObserver) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const animations = new Set<Animation>();
    const hero = container.querySelector<HTMLElement>(".home-hero");
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>(".template-card"),
    );
    let frame = 0;
    let pointer: { element: HTMLElement; x: number; y: number } | null = null;
    const clear = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer = null;
      [hero, ...cards].forEach((element) => {
        [
          "--light-x",
          "--light-y",
          "--depth-x",
          "--depth-y",
          "--hero-travel",
        ].forEach((name) => element?.style.removeProperty(name));
        element?.classList.remove("layer-hovered");
      });
    };
    const paint = () => {
      frame = 0;
      if (reduced.matches || document.hidden) return;
      if (hero) {
        const bounds = hero.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -bounds.top / bounds.height));
        hero.style.setProperty("--hero-travel", `${progress * -65}px`);
      }
      if (pointer && fine.matches) {
        const { element, x, y } = pointer;
        element.style.setProperty("--light-x", `${x * 100}%`);
        element.style.setProperty("--light-y", `${y * 100}%`);
        element.style.setProperty("--depth-x", `${(0.5 - y) * 6}deg`);
        element.style.setProperty("--depth-y", `${(x - 0.5) * 8}deg`);
        element.classList.add("layer-hovered");
      }
    };
    const schedule = () => {
      if (!frame && !reduced.matches && !document.hidden)
        frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (reduced.matches || !fine.matches || event.pointerType !== "mouse")
        return;
      const element = (event.target as Element).closest<HTMLElement>(
        ".home-hero, .template-card",
      );
      if (pointer?.element !== element) {
        pointer?.element.classList.remove("layer-hovered");
        pointer = null;
      }
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      pointer = {
        element,
        x: Math.max(
          0,
          Math.min(1, (event.clientX - bounds.left) / bounds.width),
        ),
        y: Math.max(
          0,
          Math.min(1, (event.clientY - bounds.top) / bounds.height),
        ),
      };
      schedule();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (reduced.matches || typeof entry.target.animate !== "function")
            continue;
          const element = entry.target as HTMLElement;
          const card = element.matches(".template-card");
          const index = card ? cards.indexOf(element) : 0;
          const animation = element.animate(
            [
              {
                opacity: 0,
                transform: card
                  ? `perspective(1200px) translateY(100px) rotateX(18deg) rotateZ(${index % 2 ? 5 : -5}deg) scale(.9)`
                  : "translateY(32px)",
                filter: "blur(5px)",
              },
              {
                opacity: 1,
                transform: "translateY(0) rotateX(0) rotateZ(0) scale(1)",
                filter: "blur(0px)",
              },
            ],
            {
              duration: card ? 1150 : 850,
              delay: card ? index * 120 : 0,
              easing: "cubic-bezier(.16,1,.3,1)",
              fill: "backwards",
            },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
      },
      { threshold: 0.12 },
    );
    container
      .querySelectorAll(
        ".hero-copy > *, .hero-visual, .section-heading-row, .template-card, .story-image, .story-copy, .steps-grid > article, .closing-cta > *",
      )
      .forEach((element) => observer.observe(element));
    const preference = () => {
      container.classList.toggle("home-motion-active", !reduced.matches);
      if (reduced.matches) {
        clear();
        animations.forEach((animation) => animation.cancel());
      } else schedule();
    };
    preference();
    container.addEventListener("pointermove", move);
    container.addEventListener("pointerleave", clear);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", preference);
    fine.addEventListener("change", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      clear();
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      container.removeEventListener("pointermove", move);
      container.removeEventListener("pointerleave", clear);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", preference);
      fine.removeEventListener("change", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, []);
  return (
    <div className="layer-home" ref={root}>
      {children}
    </div>
  );
}
