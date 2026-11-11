"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Sections further down a page rise into view as you scroll to them. Only sections that start
 * below the fold are touched, so nothing visible ever flickers; the page HTML itself stays
 * fully visible (search engines, no-JS, printing and reduced-motion users see it unchanged).
 *
 * Page content can arrive after this runs (streamed pages), so new sections are picked up as
 * they are added.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (!("IntersectionObserver" in window) || !("MutationObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const main = document.getElementById("main-content");
    if (!main) return;

    const seen = new WeakSet<HTMLElement>();

    const settle = (el: HTMLElement) => {
      el.style.removeProperty("opacity");
      el.style.removeProperty("transform");
      el.style.removeProperty("transition");
      delete el.dataset.reveal;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          el.style.opacity = "1";
          el.style.transform = "none";
          // Drop the inline styles once the transition is done (no lasting transform).
          window.setTimeout(() => settle(el), 800);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    const scan = () => {
      const fold = window.innerHeight;
      main.querySelectorAll<HTMLElement>("section").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        // Outermost sections only, starting below the visible area.
        if (el.parentElement?.closest("section") || el.closest("[data-no-reveal]"))
          return;
        if (el.getBoundingClientRect().top <= fold * 0.92) return;
        el.dataset.reveal = "pending";
        el.style.opacity = "0";
        el.style.transform = "translateY(28px)";
        el.style.transition = `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`;
        observer.observe(el);
      });
    };

    let scheduled = 0;
    const scheduleScan = () => {
      if (scheduled) return;
      scheduled = window.setTimeout(() => {
        scheduled = 0;
        scan();
      }, 50);
    };

    scheduleScan();
    const mutations = new MutationObserver(scheduleScan);
    mutations.observe(main, { childList: true, subtree: true });

    const revealAll = () => {
      main.querySelectorAll<HTMLElement>('[data-reveal="pending"]').forEach(settle);
    };
    window.addEventListener("beforeprint", revealAll);

    return () => {
      window.clearTimeout(scheduled);
      mutations.disconnect();
      observer.disconnect();
      window.removeEventListener("beforeprint", revealAll);
      revealAll();
    };
  }, [pathname]);

  return null;
}
