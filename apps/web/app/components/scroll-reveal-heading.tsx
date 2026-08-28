"use client";

import { useEffect, useState, type ReactNode } from "react";

export function ScrollRevealHeading({ children }: { children: ReactNode }) {
  const [opacity, setOpacity] = useState(0.52);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOpacity(0.9);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = Math.min(window.scrollY / 360, 1);
      setOpacity(0.52 + progress * 0.38);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <h1
      data-scroll-heading
      className="text-balance text-center text-[40px] font-medium leading-[1.06] text-foreground sm:text-[52px] lg:text-[50px]"
      style={{ opacity }}
    >
      {children}
    </h1>
  );
}
