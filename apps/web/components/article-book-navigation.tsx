"use client";

import { type SupportedLocale, uiText } from "@one-forth/config";
import { ListTree, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface ArticleBookNavigationChapter {
  readonly title: string;
  readonly href: string;
  readonly current: boolean;
  readonly number?: number;
}

export interface ArticleBookNavigationPart {
  readonly title: string;
  readonly current: boolean;
  readonly chapters: readonly ArticleBookNavigationChapter[];
}

interface ArticleBookNavigationProps {
  readonly locale?: SupportedLocale;
  readonly bookTitle: string;
  readonly bookHref: string;
  readonly chapterPosition: string;
  readonly parts: readonly ArticleBookNavigationPart[];
}

function DirectoryTree({
  parts,
  onNavigate,
  label,
}: Readonly<{
  parts: readonly ArticleBookNavigationPart[];
  onNavigate?: () => void;
  label: string;
}>) {
  return (
    <nav className="article-book-tree" aria-label={label}>
      {parts.map((part) => (
        <details key={part.title} open>
          <summary>{part.title}</summary>
          <ol>
            {part.chapters.map((chapter) => (
              <li key={chapter.href}>
                <Link
                  href={chapter.href}
                  aria-current={chapter.current ? "page" : undefined}
                  {...(onNavigate ? { onClick: onNavigate } : {})}
                >
                  {chapter.number !== undefined ? (
                    <span className="article-book-tree__number" aria-hidden="true">
                      {String(chapter.number).padStart(2, "0")}
                    </span>
                  ) : null}
                  <span>{chapter.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </nav>
  );
}

export function ArticleBookNavigation({
  locale = "zh-CN",
  bookTitle,
  bookHref,
  chapterPosition,
  parts,
}: ArticleBookNavigationProps) {
  const text = uiText[locale].readerInterface;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), summary",
      );
      const first = focusable?.[0];
      const last = focusable?.[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <aside className="article-left" aria-label={text.bookDirectory}>
        <div className="article-side__label">
          <ListTree aria-hidden="true" size={15} />
          {text.bookDirectory}
        </div>
        <Link className="article-book-title" href={bookHref}>
          {bookTitle}
        </Link>
        <p className="article-book-position">{chapterPosition}</p>
        <DirectoryTree parts={parts} label={text.bookDirectory} />
      </aside>

      <button
        ref={triggerRef}
        type="button"
        className="article-mobile-book-trigger"
        aria-expanded={open}
        aria-controls="article-book-drawer"
        onClick={() => setOpen(true)}
      >
        <ListTree aria-hidden="true" size={16} />
        {text.bookDirectory} · {chapterPosition}
      </button>

      {open ? (
        <div
          className="article-book-drawer-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
              window.requestAnimationFrame(() => triggerRef.current?.focus());
            }
          }}
        >
          <aside
            ref={drawerRef}
            id="article-book-drawer"
            className="article-book-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="article-book-drawer-title"
          >
            <header>
              <div>
                <p>{text.bookDirectory}</p>
                <h2 id="article-book-drawer-title">{bookTitle}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="icon-button"
                aria-label={text.closeBookDirectory}
                onClick={() => {
                  setOpen(false);
                  window.requestAnimationFrame(() => triggerRef.current?.focus());
                }}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <DirectoryTree
              parts={parts}
              label={text.bookDirectory}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
