import {
  learningPaths,
  readerContentRepository,
  readerCurriculumRepository,
} from "@one-forth/content";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleShell } from "@/components/article-shell";
import LocaleHomePage from "@/app/[locale]/page";
import BookPage from "@/app/[locale]/books/[series]/[book]/page";
import LearningPathPage from "@/app/[locale]/paths/[slug]/page";
import { learningStateStorageKey } from "@/lib/learning-state";

vi.mock("next/navigation", () => ({
  usePathname: () => "/zh-CN/books/mathematics/linear-algebra/matrices-operations",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  permanentRedirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

describe("legacy progress in reader pages", () => {
  it("restores a real chapter, book summary, homepage and learning path from v2 storage", async () => {
    const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
    const document = documents.find((entry) => entry.frontmatter.conceptId === "matrices");
    if (!document) throw new Error("The matrices chapter is missing.");
    const chapter = readerCurriculumRepository.getChapterForContent(document.frontmatter.id);
    const context = chapter && readerCurriculumRepository.getChapterContext(chapter.id, "zh-CN");
    if (!context) throw new Error("The matrices curriculum context is missing.");
    localStorage.setItem(
      learningStateStorageKey,
      JSON.stringify({
        version: 2,
        concepts: {
          matrices: {
            status: "completed",
            progress: 100,
            lastAnchor: "saved-section",
            updatedAt: "2026-11-02T00:00:00Z",
          },
          vectors: { status: "completed", progress: 100, updatedAt: "2026-11-01T00:00:00Z" },
        },
      }),
    );

    const article = render(
      <ArticleShell
        document={document}
        tableOfContents={[{ id: "saved-section", title: "保存位置", level: 2 }]}
      >
        <h2 id="saved-section">保存位置</h2>
      </ArticleShell>,
    );
    expect(screen.getByRole("button", { name: "重新学习" })).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "本册完成进度" })).toHaveValue(
      Math.round((2 / readerCurriculumRepository.listChapters(context.book.id).length) * 100),
    );
    article.unmount();

    const book = render(
      await BookPage({
        params: Promise.resolve({
          locale: "zh-CN",
          series: context.series.slug,
          book: context.book.slug,
        }),
      }),
    );
    expect(screen.getByRole("link", { name: /继续本册/ })).toHaveAttribute(
      "href",
      `${context.canonicalPath}#saved-section`,
    );
    book.unmount();

    const home = render(await LocaleHomePage({ params: Promise.resolve({ locale: "zh-CN" }) }));
    expect(screen.getByRole("link", { name: "回到最近章节" })).toHaveAttribute(
      "href",
      `${context.canonicalPath}#saved-section`,
    );
    home.unmount();

    const path = learningPaths.find((entry) => entry.chapterIds.includes(context.chapter.id));
    if (!path) throw new Error("A learning path containing matrices is missing.");
    const route = render(
      await LearningPathPage({ params: Promise.resolve({ locale: "zh-CN", slug: path.id }) }),
    );
    const step = route.container.querySelector(`a[href="${context.canonicalPath}"]`)?.closest("li");
    if (!step) throw new Error("The path's matrices step is missing.");
    expect(within(step).getByText("已完成")).toBeVisible();
    expect(route.container.querySelector(".path-progress-summary strong")?.textContent).toMatch(
      /[1-9]/,
    );
  });
});
