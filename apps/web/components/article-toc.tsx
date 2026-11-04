"use client";

import { useSyncExternalStore } from "react";
import type { TableOfContentsItem } from "@/lib/content-utils";
import {
  getChapterLearningState,
  learningStateEvent,
  learningStateStorageKey,
} from "@/lib/learning-state";

interface ArticleTableOfContentsProps {
  readonly chapterId: string;
  readonly legacyConceptIds?: readonly string[];
  readonly items: readonly TableOfContentsItem[];
  readonly ariaLabel: string;
  /**
   * Both placements exist in the server-rendered article shell. Only the placement
   * for the active viewport remains exposed to assistive technology after hydration.
   */
  readonly viewport?: "desktop" | "mobile";
}

const mobileArticleQuery = "(max-width: 1160px)";

function subscribeToViewport(callback: () => void): () => void {
  const mediaQuery = window.matchMedia?.(mobileArticleQuery);
  if (!mediaQuery) return () => undefined;
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function isMobileViewport(): boolean {
  return window.matchMedia?.(mobileArticleQuery)?.matches ?? false;
}

export function ArticleTableOfContents({
  chapterId,
  legacyConceptIds = [],
  items,
  ariaLabel,
  viewport = "desktop",
}: ArticleTableOfContentsProps) {
  const fallback = items[0]?.id ?? "";
  const isMobile = useSyncExternalStore(
    subscribeToViewport,
    isMobileViewport,
    () => viewport === "mobile",
  );
  const isInactivePlacement = viewport === "mobile" ? !isMobile : isMobile;
  const activeId = useSyncExternalStore(
    (callback) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === learningStateStorageKey) callback();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(learningStateEvent, callback);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(learningStateEvent, callback);
      };
    },
    () => getChapterLearningState(localStorage, chapterId, legacyConceptIds).lastAnchor ?? fallback,
    () => fallback,
  );

  return (
    <nav
      aria-label={ariaLabel}
      aria-hidden={isInactivePlacement || undefined}
      inert={isInactivePlacement || undefined}
      data-toc-viewport={viewport}
    >
      {items.map((item) => {
        const current = item.id === activeId;
        return (
          <a
            key={item.id}
            className={[item.level === 3 ? "toc-level-3" : "", current ? "is-current" : ""]
              .filter(Boolean)
              .join(" ")}
            href={`#${item.id}`}
            aria-current={current ? "location" : undefined}
          >
            {item.title}
          </a>
        );
      })}
    </nav>
  );
}
