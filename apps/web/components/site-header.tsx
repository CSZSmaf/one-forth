"use client";

import { siteConfig, uiText, type SupportedLocale } from "@one-forth/config";
import type { ToolCoverageSummary } from "@one-forth/content/tool-summary";
import { BrandMark } from "@one-forth/ui";
import {
  ChevronDown,
  FlaskConical,
  Github,
  GitBranch,
  History,
  LibraryBig,
  ListTree,
  Menu,
  Moon,
  Route,
  ScrollText,
  Search,
  Sigma,
  Sun,
  Tags,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SearchDialog } from "./search-dialog";
import {
  createBookNavigation,
  createToolNavigation,
  isNavigationItemCurrent,
  type ToolNavigationId,
} from "./site-navigation-data";

const themeEvent = "one-forth-theme-change";

// The platform stays fixed for the lifetime of this browser session.
const subscribeToPlatform = () => () => {};
const defaultShortcut = () => "Ctrl + K";

function getSearchShortcut(): string {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘ K" : defaultShortcut();
}

const toolIcons: Readonly<Record<ToolNavigationId, LucideIcon>> = {
  playground: FlaskConical,
  graph: GitBranch,
  paths: Route,
  glossary: ListTree,
  symbols: Tags,
  equations: Sigma,
  resources: ScrollText,
  updates: History,
};

function subscribeToTheme(callback: () => void): () => void {
  window.addEventListener(themeEvent, callback);
  return () => window.removeEventListener(themeEvent, callback);
}

function getThemeSnapshot(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

interface SiteHeaderProps {
  readonly locale: SupportedLocale;
  readonly toolCoverage: ToolCoverageSummary;
}

export function SiteHeader({ locale, toolCoverage }: SiteHeaderProps) {
  const pathname = usePathname();
  const book = createBookNavigation(locale);
  const tools = createToolNavigation(locale, toolCoverage);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchOpenerRef = useRef<HTMLElement | null>(null);
  const toolMenuRootRef = useRef<HTMLDivElement>(null);
  const toolMenuButtonRef = useRef<HTMLButtonElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const mobileDrawerCloseRef = useRef<HTMLButtonElement>(null);
  const restoreMobileFocusRef = useRef(false);
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");
  const searchShortcut = useSyncExternalStore(
    subscribeToPlatform,
    getSearchShortcut,
    defaultShortcut,
  );
  const bookIsCurrent = isNavigationItemCurrent(pathname, book.currentPrefix);
  const hasCurrentTool = tools.some((tool) =>
    isNavigationItemCurrent(pathname, tool.currentPrefix),
  );

  useEffect(() => {
    document.documentElement.dataset.clientReady = "true";
    const keydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLocaleLowerCase() !== "k") return;
      event.preventDefault();
      if (searchOpen) return;
      const activeElement =
        document.activeElement instanceof HTMLElement && document.activeElement !== document.body
          ? document.activeElement
          : searchTriggerRef.current;
      searchOpenerRef.current =
        mobileOpen && mobileDrawerRef.current?.contains(activeElement)
          ? mobileMenuButtonRef.current
          : activeElement;
      restoreMobileFocusRef.current = false;
      setMobileOpen(false);
      setToolMenuOpen(false);
      setSearchOpen(true);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [mobileOpen, searchOpen]);

  useEffect(() => {
    if (!toolMenuOpen) return;
    const firstItem = toolMenuRef.current?.querySelector<HTMLElement>("[role='menuitem']");
    firstItem?.focus();

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !toolMenuRootRef.current?.contains(event.target)) {
        setToolMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [toolMenuOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const mobileMenuButton = mobileMenuButtonRef.current;
    document.body.style.overflow = "hidden";
    mobileDrawerCloseRef.current?.focus();

    const handleDrawerKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        restoreMobileFocusRef.current = true;
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!mobileDrawerRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDrawerKeydown);
    return () => {
      document.removeEventListener("keydown", handleDrawerKeydown);
      document.body.style.overflow = previousOverflow;
      if (restoreMobileFocusRef.current) {
        window.requestAnimationFrame(() => mobileMenuButton?.focus());
      }
      restoreMobileFocusRef.current = false;
    };
  }, [mobileOpen]);

  function toggleTheme(): void {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("one-forth-theme", nextTheme);
    window.dispatchEvent(new Event(themeEvent));
  }

  function openSearch(opener: HTMLElement): void {
    searchOpenerRef.current = opener;
    setToolMenuOpen(false);
    setSearchOpen(true);
  }

  function closeMobileDirectory(restoreFocus: boolean): void {
    restoreMobileFocusRef.current = restoreFocus;
    setMobileOpen(false);
  }

  function handleToolMenuKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const items = Array.from(
      toolMenuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? [],
    );
    if (items.length === 0) return;
    const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLElement));

    if (event.key === "Escape") {
      event.preventDefault();
      setToolMenuOpen(false);
      toolMenuButtonRef.current?.focus();
    } else if (event.key === "Tab") {
      setToolMenuOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      items[(currentIndex + offset + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="wordmark" href={`/${locale}`} aria-label={siteConfig.brand.logoLabel}>
            <BrandMark src={siteConfig.brand.logoPath} className="wordmark__mark" />
            <span>{siteConfig.brand.wordmark}</span>
          </Link>
          <nav className="desktop-nav" aria-label="主导航">
            <Link href={book.href} aria-current={bookIsCurrent ? "page" : undefined}>
              {book.label}
            </Link>
            <Link
              href={`/${locale}/projects`}
              aria-current={pathname === `/${locale}/projects` ? "page" : undefined}
            >
              {uiText[locale].otherProjects}
            </Link>
            <Link href="/about">{uiText[locale].authorProfile}</Link>
          </nav>
          <div className="site-actions">
            <button
              ref={searchTriggerRef}
              type="button"
              className="search-trigger"
              aria-label={uiText[locale].search}
              aria-haspopup="dialog"
              aria-keyshortcuts="Control+K Meta+K"
              onClick={(event) => openSearch(event.currentTarget)}
            >
              <Search aria-hidden="true" size={17} />
              <span>{uiText[locale].search}</span>
              <kbd aria-hidden="true">{searchShortcut}</kbd>
            </button>
            <div ref={toolMenuRootRef} className="desktop-tool-menu">
              <button
                ref={toolMenuButtonRef}
                type="button"
                className="tool-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={toolMenuOpen}
                aria-controls="desktop-tool-navigation"
                data-current={hasCurrentTool ? "true" : undefined}
                onClick={() => setToolMenuOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                  event.preventDefault();
                  setToolMenuOpen(true);
                }}
              >
                <span>工具</span>
                <ChevronDown aria-hidden="true" size={15} />
              </button>
              {toolMenuOpen ? (
                <div
                  ref={toolMenuRef}
                  id="desktop-tool-navigation"
                  className="tool-menu"
                  role="menu"
                  aria-label="工具"
                  onKeyDown={handleToolMenuKeydown}
                >
                  {tools.map((tool) => {
                    const Icon = toolIcons[tool.id];
                    const current = isNavigationItemCurrent(pathname, tool.currentPrefix);
                    return (
                      <Link
                        key={tool.id}
                        href={tool.href}
                        role="menuitem"
                        aria-current={current ? "page" : undefined}
                        onClick={() => setToolMenuOpen(false)}
                      >
                        <Icon aria-hidden="true" size={17} />
                        <span>
                          <strong>{tool.label}</strong>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <a
              className="icon-button repository-link"
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={uiText[locale].githubRepository}
              title={uiText[locale].githubRepository}
            >
              <Github aria-hidden="true" size={18} />
            </a>
            <button
              type="button"
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            >
              <Sun className="theme-icon theme-icon--sun" size={17} />
              <Moon className="theme-icon theme-icon--moon" size={17} />
            </button>
            <button
              ref={mobileMenuButtonRef}
              type="button"
              className="icon-button mobile-menu-button"
              onClick={() => {
                if (mobileOpen) closeMobileDirectory(true);
                else {
                  restoreMobileFocusRef.current = false;
                  setMobileOpen(true);
                }
              }}
              aria-expanded={mobileOpen}
              aria-controls="mobile-directory"
              aria-label={mobileOpen ? "关闭目录" : "打开目录"}
            >
              <Menu aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div
          className="mobile-directory-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeMobileDirectory(true);
          }}
        >
          <aside
            ref={mobileDrawerRef}
            id="mobile-directory"
            className="mobile-directory"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-directory-title"
          >
            <header className="mobile-directory__header">
              <div>
                <p className="eyebrow">ONE FORTH</p>
                <h2 id="mobile-directory-title">目录</h2>
              </div>
              <button
                ref={mobileDrawerCloseRef}
                type="button"
                className="icon-button"
                aria-label="关闭目录"
                onClick={() => closeMobileDirectory(true)}
              >
                <X aria-hidden="true" size={19} />
              </button>
            </header>
            <nav className="mobile-directory__navigation" aria-label="移动目录">
              <Link
                className="mobile-directory__primary"
                href={book.href}
                aria-current={bookIsCurrent ? "page" : undefined}
                onClick={() => closeMobileDirectory(false)}
              >
                <LibraryBig aria-hidden="true" size={19} />
                <span>
                  <strong>{book.label}</strong>
                </span>
              </Link>
              <p className="mobile-directory__section-label">工具</p>
              <div className="mobile-directory__tools">
                {tools.map((tool) => {
                  const Icon = toolIcons[tool.id];
                  const current = isNavigationItemCurrent(pathname, tool.currentPrefix);
                  return (
                    <Link
                      key={tool.id}
                      href={tool.href}
                      aria-current={current ? "page" : undefined}
                      onClick={() => closeMobileDirectory(false)}
                    >
                      <Icon aria-hidden="true" size={17} />
                      <span>
                        <strong>{tool.label}</strong>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </nav>
            <button type="button" className="mobile-theme-control" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun aria-hidden="true" size={17} />
              ) : (
                <Moon aria-hidden="true" size={17} />
              )}
              <span>{theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}</span>
            </button>
          </aside>
        </div>
      ) : null}

      <SearchDialog
        locale={locale}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        restoreFocusRef={searchOpenerRef}
      />
    </>
  );
}
