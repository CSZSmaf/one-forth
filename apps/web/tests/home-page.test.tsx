import { readerCurriculumRepository } from "@one-forth/content";
import { siteConfig } from "@one-forth/config";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LocaleHomePage from "@/app/[locale]/page";
import ProjectsPage from "@/app/[locale]/projects/page";

const forbiddenEditorialCopy =
  /课程规划|编辑状态|publicationStatus|editorialStatus|schema|草稿|预览稿|待人工审校/i;

describe("home page information architecture", () => {
  it("keeps the curriculum on the home page and software on the author projects page", async () => {
    const firstSeries = readerCurriculumRepository.listSeries()[0];
    const firstBook = firstSeries
      ? readerCurriculumRepository.listBooks(firstSeries.id)[0]
      : undefined;
    const startChapter = firstBook
      ? readerCurriculumRepository.getChapter(firstBook.startChapterId)
      : null;
    const startContext = startChapter
      ? readerCurriculumRepository.getChapterContext(startChapter.id, "zh-CN")
      : null;
    if (!firstBook || !startContext) throw new Error("The public curriculum start is missing.");

    const page = await LocaleHomePage({ params: Promise.resolve({ locale: "zh-CN" }) });
    const { container } = render(page);

    expect(container.querySelectorAll("main > section").length).toBeLessThanOrEqual(4);
    expect(container.querySelectorAll(".home-linear-primary")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "从《数学语言、集合与证明》开始" })).toHaveAttribute(
      "href",
      startContext.canonicalPath,
    );
    expect(startContext.chapterNumber).toBe(1);
    expect(screen.getByRole("heading", { name: "数学、物理、计算机与人工智能教材" })).toBeVisible();
    const search = screen.getByRole("search");
    expect(search).toHaveAttribute("action", "/zh-CN/search");
    expect(within(search).getByRole("searchbox")).toHaveAttribute("name", "q");

    const mainLinks = [...container.querySelectorAll("main a")].map((link) =>
      link.getAttribute("href"),
    );
    expect(mainLinks.some((href) => href?.includes("/subjects"))).toBe(false);
    expect(mainLinks.some((href) => href?.includes("/paths"))).toBe(false);
    expect(mainLinks.some((href) => href?.includes("/graph"))).toBe(false);
    expect(mainLinks.some((href) => href?.includes("/playground"))).toBe(false);
    expect(mainLinks.some((href) => href?.includes("/resources"))).toBe(false);
    expect(container.textContent).not.toMatch(forbiddenEditorialCopy);
    expect(container.textContent).not.toContain("Ctorch");
    expect(container.textContent).not.toContain("ChatOCR");
    expect(container.textContent).not.toContain("PageWeave");

    const profile = container.querySelector(".home-profile");
    expect(profile).not.toBeNull();
    const profileRegion = within(profile as HTMLElement);
    expect(profileRegion.getByRole("heading", { name: "One Forth" })).toBeVisible();
    expect(profileRegion.getByText("Independent educational project")).toBeVisible();
    expect(
      profileRegion.getByRole("link", { name: "联系: maintainers@example.org" }),
    ).toHaveAttribute("href", "mailto:maintainers@example.org");

    const projects = render(await ProjectsPage({ params: Promise.resolve({ locale: "zh-CN" }) }));
    const projectRegion = within(projects.container);
    expect(projectRegion.getByRole("heading", { name: "作者的其他项目" })).toBeVisible();
    expect(projectRegion.getByRole("link", { name: "阅读教程" })).toHaveAttribute(
      "href",
      siteConfig.projects.ctorch.url,
    );
    const projectNames = { ctorch: "Ctorch", chatocr: "拾语 ChatOCR", mogao: "PageWeave" };
    for (const id of ["ctorch", "chatocr", "mogao"] as const) {
      const links = within(projectRegion.getByRole("navigation", { name: projectNames[id] }));
      expect(links.getByRole("link", { name: "GitHub 仓库" })).toHaveAttribute(
        "href",
        siteConfig.projects[id].repository,
      );
      expect(links.getByRole("link", { name: "版本下载" })).toHaveAttribute(
        "href",
        siteConfig.projects[id].downloads,
      );
      expect(links.getAllByRole("link")).toHaveLength(id === "ctorch" ? 3 : 2);
    }
  });

  it("shows four subject entrances without the removed statistics strip", async () => {
    const series = readerCurriculumRepository.listSeries();
    const books = readerCurriculumRepository.listBooks();
    const parts = readerCurriculumRepository.listParts();
    const chapters = readerCurriculumRepository.listChapters();
    const previewChapters = chapters.filter((chapter) => chapter.publicationStatus === "preview");

    expect(series).toHaveLength(4);
    expect(books).toHaveLength(52);
    expect(parts).toHaveLength(156);
    expect(chapters).toHaveLength(312);
    expect(previewChapters).toHaveLength(0);
    expect(chapters.every((chapter) => chapter.publicationStatus === "published")).toBe(true);

    const page = await LocaleHomePage({ params: Promise.resolve({ locale: "zh-CN" }) });
    const { container } = render(page);

    expect(container.querySelector(".home-curriculum-scale")).toBeNull();

    expect(container.querySelectorAll(".home-series-list > li")).toHaveLength(series.length);
    expect(container.querySelectorAll(".home-series-list a")).toHaveLength(series.length);
    expect(container.querySelector(".book-cover")).toBeNull();
    expect(container.querySelector(".home-series-list ol")).toBeNull();
    for (const entry of series) {
      const href = `/zh-CN/books/${entry.slug}`;
      expect(container.querySelectorAll(`.home-series-list a[href="${href}"]`)).toHaveLength(1);
    }
    expect(container.textContent).not.toMatch(forbiddenEditorialCopy);

    const seriesDirectory = container.querySelector(".home-series-directory");
    expect(seriesDirectory).not.toBeNull();
    const directory = within(seriesDirectory as HTMLElement);
    expect(directory.getByRole("heading", { name: "数学" })).toBeVisible();
    expect(directory.getByRole("heading", { name: "物理" })).toBeVisible();
    expect(directory.getByRole("heading", { name: "计算机" })).toBeVisible();
    expect(directory.getByRole("heading", { name: "人工智能" })).toBeVisible();
  });
});
