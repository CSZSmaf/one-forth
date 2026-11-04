import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleTableOfContents } from "@/components/article-toc";

function mediaQuery(matches: boolean): MediaQueryList {
  return {
    matches,
    media: "(max-width: 1160px)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}

function renderPlacements() {
  return render(
    <>
      <ArticleTableOfContents
        chapterId="/zh-CN/books/mathematics/linear-algebra/vectors-coordinates"
        items={[{ id: "definition", level: 2, title: "定义" }]}
        ariaLabel="桌面页内目录"
        viewport="desktop"
      />
      <ArticleTableOfContents
        chapterId="/zh-CN/books/mathematics/linear-algebra/vectors-coordinates"
        items={[{ id: "definition", level: 2, title: "定义" }]}
        ariaLabel="移动端页内目录"
        viewport="mobile"
      />
    </>,
  );
}

describe("article table of contents placement", () => {
  it("exposes only the desktop navigation at desktop widths", () => {
    vi.mocked(window.matchMedia).mockReturnValue(mediaQuery(false));
    const { container } = renderPlacements();

    expect(screen.getByRole("navigation", { name: "桌面页内目录" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "移动端页内目录" })).toBeNull();
    const mobileNavigation = container.querySelector('nav[data-toc-viewport="mobile"]');
    expect(mobileNavigation).toHaveAttribute("aria-hidden", "true");
    expect(mobileNavigation).toHaveAttribute("inert");
  });

  it("exposes only the mobile navigation at mobile widths", () => {
    vi.mocked(window.matchMedia).mockReturnValue(mediaQuery(true));
    const { container } = renderPlacements();

    expect(screen.getByRole("navigation", { name: "移动端页内目录" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "桌面页内目录" })).toBeNull();
    const desktopNavigation = container.querySelector('nav[data-toc-viewport="desktop"]');
    expect(desktopNavigation).toHaveAttribute("aria-hidden", "true");
    expect(desktopNavigation).toHaveAttribute("inert");
  });
});
