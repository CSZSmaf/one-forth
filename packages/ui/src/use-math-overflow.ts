"use client";

import { useEffect, type RefObject } from "react";

/** Only formulas that actually overflow become keyboard scroll stops. */
export function useMathOverflow(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    let active = true;
    const schedule = () => {
      if (!active) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.querySelectorAll<HTMLElement>(".static-math").forEach((formula) => {
          if (formula.closest('[aria-hidden="true"], svg')) return;
          if (formula.scrollWidth > formula.clientWidth + 1) {
            formula.tabIndex = 0;
            formula.dataset.mathScroll = "true";
          } else if (formula.dataset.mathScroll) {
            formula.removeAttribute("tabindex");
            delete formula.dataset.mathScroll;
          }
        });
      });
    };
    const resize = new ResizeObserver(schedule);
    const changes = new MutationObserver(schedule);
    resize.observe(root);
    changes.observe(root, { childList: true, characterData: true, subtree: true });
    schedule();
    void document.fonts?.ready.then(schedule);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      resize.disconnect();
      changes.disconnect();
    };
  }, [ref]);
}
