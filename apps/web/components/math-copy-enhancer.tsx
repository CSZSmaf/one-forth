"use client";

import { useEffect } from "react";

function elementForNode(node: Node | null): Element | null {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

function copyOwner(node: Node | null): Element | null {
  const element = elementForNode(node);
  return element?.closest("[data-latex], .katex") ?? null;
}

export function extractMathCopyText(node: Node | null): string | null {
  const owner = copyOwner(node);
  if (!owner) return null;

  const explicit = owner.closest<HTMLElement>("[data-latex]");
  const latex = explicit?.dataset.latex?.trim();
  if (latex) return latex;

  const annotation = owner.querySelector('annotation[encoding="application/x-tex"]');
  return annotation?.textContent?.trim() || null;
}

function useScrollableMathAccess() {
  useEffect(() => {
    const selector = ".static-math--glossary, .static-math--resource-claim, .static-math--display";
    const observed = new Set<HTMLElement>();
    const managed = new Set<HTMLElement>();

    function update(element: HTMLElement) {
      const style = getComputedStyle(element);
      const overflows =
        (style.overflowX === "auto" && element.scrollWidth > element.clientWidth) ||
        (style.overflowY === "auto" && element.scrollHeight > element.clientHeight);
      if (overflows && !element.hasAttribute("tabindex")) {
        element.tabIndex = 0;
        managed.add(element);
      } else if (!overflows && managed.delete(element)) {
        element.removeAttribute("tabindex");
      }
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target instanceof HTMLElement) update(entry.target);
      }
    });
    function register(root: Element) {
      const candidates = [
        ...(root.matches(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
      ];
      for (const element of candidates) {
        if (!(element instanceof HTMLElement) || observed.has(element)) continue;
        observed.add(element);
        resizeObserver.observe(element);
        update(element);
      }
    }
    const mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) register(node);
        }
      }
      for (const element of observed) {
        if (element.isConnected) continue;
        resizeObserver.unobserve(element);
        observed.delete(element);
        managed.delete(element);
      }
    });
    const updateAll = () => observed.forEach(update);
    register(document.body);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    document.fonts.addEventListener("loadingdone", updateAll);
    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      document.fonts.removeEventListener("loadingdone", updateAll);
      managed.forEach((element) => element.removeAttribute("tabindex"));
    };
  }, []);
}

/**
 * KaTeX's visual HTML is intentionally split into many glyph spans. When a
 * selection stays inside one formula, copy the original TeX annotation rather
 * than the visual glyph fragments.
 */
export function MathCopyEnhancer() {
  useScrollableMathAccess();
  useEffect(() => {
    function handleCopy(event: ClipboardEvent) {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const anchorOwner = copyOwner(selection.anchorNode);
      const focusOwner = copyOwner(selection.focusNode);
      if (!anchorOwner || !focusOwner || anchorOwner !== focusOwner) return;

      const latex = extractMathCopyText(selection.anchorNode);
      if (!latex || !event.clipboardData) return;

      event.clipboardData.setData("text/plain", latex);
      event.preventDefault();
    }

    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, []);

  return null;
}
