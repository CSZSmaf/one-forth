"use client";

import { useEffect } from "react";

const anchorSelector = [
  ".article-prose h2[id]",
  ".article-prose h3[id]",
  ".article-prose .semantic-block[id]",
  ".article-prose .equation[id]",
  ".article-concept-anchor[id]",
].join(",");

function anchorLabel(element: HTMLElement): string {
  const heading = element.matches("h2, h3")
    ? element
    : element.querySelector<HTMLElement>(".semantic-block__heading, figcaption, h2");
  return heading?.textContent?.trim() || element.getAttribute("aria-label") || "此处";
}

function focusHashTarget(): void {
  let id: string;
  try {
    id = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

export function AnchorCopyEnhancer() {
  useEffect(() => {
    const targets = [...document.querySelectorAll<HTMLElement>(anchorSelector)].filter(
      (target) => !target.closest(".interactive-figure-anchor"),
    );
    const buttons: HTMLButtonElement[] = [];

    for (const target of targets) {
      if (target.dataset.anchorCopyReady === "true") continue;
      target.dataset.anchorCopyReady = "true";
      target.classList.add("anchor-copy-target");

      const button = document.createElement("button");
      const label = anchorLabel(target);
      button.type = "button";
      button.className = "anchor-copy-button";
      button.textContent = "复制链接";
      button.setAttribute("aria-label", `复制“${label}”的链接`);
      button.addEventListener("click", async () => {
        const url = new URL(window.location.href);
        url.hash = target.id;
        try {
          await navigator.clipboard.writeText(url.toString());
          button.textContent = "已复制";
          window.setTimeout(() => {
            button.textContent = "复制链接";
          }, 1_500);
        } catch {
          window.location.hash = target.id;
          button.textContent = "链接已定位";
        }
      });

      const owner = target.matches("h2, h3")
        ? target
        : (target.querySelector<HTMLElement>(".semantic-block__heading, figcaption, h2") ?? target);
      owner.append(button);
      buttons.push(button);
    }

    window.addEventListener("hashchange", focusHashTarget);
    focusHashTarget();
    return () => {
      window.removeEventListener("hashchange", focusHashTarget);
      for (const button of buttons) button.remove();
      for (const target of targets) {
        delete target.dataset.anchorCopyReady;
        target.classList.remove("anchor-copy-target");
      }
    };
  }, []);

  return null;
}
