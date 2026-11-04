import { readerContentRepository, readerCurriculumRepository } from "@one-forth/content";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleShell } from "@/components/article-shell";

async function getDocument(conceptId: string) {
  const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
  const document = documents.find((candidate) => candidate.frontmatter.conceptId === conceptId);
  if (!document) throw new Error(`The ${conceptId} article fixture is missing.`);
  return document;
}

describe("article workspace", () => {
  it("uses the canonical book order for position, chapter navigation, and book progress", async () => {
    const document = await getDocument("sets-and-mappings");
    const chapter = readerCurriculumRepository.getChapterForContent(document.frontmatter.id);
    const context = chapter
      ? readerCurriculumRepository.getChapterContext(chapter.id, "zh-CN")
      : null;
    if (!context) throw new Error("The published sets chapter has no curriculum context.");
    const bookChapters = readerCurriculumRepository.listChapters(context.book.id);

    render(
      <ArticleShell
        document={document}
        tableOfContents={[{ id: "definition", level: 2, title: "定义" }]}
      >
        <h2 id="definition">定义</h2>
      </ArticleShell>,
    );

    expect(
      screen.getByRole("link", {
        name: `${context.book.code} · ${context.book.title["zh-CN"]}`,
      }),
    ).toBeVisible();
    expect(
      screen.getByText(`第 ${context.chapterNumber}/${context.chapterCount} 章`),
    ).toBeVisible();
    const bookNavigation = within(screen.getByRole("navigation", { name: "本册目录" }));
    expect(bookNavigation.getAllByRole("link")).toHaveLength(bookChapters.length);
    for (const entry of bookChapters) {
      const entryContext = readerCurriculumRepository.getChapterContext(entry.id, "zh-CN");
      if (!entryContext) throw new Error(`The public Chapter ${entry.id} has no context.`);
      expect(
        bookNavigation.getByRole("link", {
          name: entry.shortTitle?.["zh-CN"] ?? entry.title["zh-CN"],
        }),
      ).toHaveAttribute("href", entryContext.canonicalPath);
    }
    expect(screen.getByRole("progressbar", { name: "本册完成进度" })).toHaveValue(0);
    expect(screen.getByText(`0/${bookChapters.length} 章 · 0%`)).toBeVisible();
  });

  it("keeps the textbook header order without exposing editorial state", async () => {
    const document = await getDocument("linear-regression");
    const chapter = readerCurriculumRepository.getChapterForContent(document.frontmatter.id);
    const context = chapter
      ? readerCurriculumRepository.getChapterContext(chapter.id, "zh-CN")
      : null;
    if (!context) throw new Error("The published regression chapter has no curriculum context.");
    const { container } = render(
      <ArticleShell
        document={document}
        tableOfContents={[{ id: "definition", level: 2, title: "定义" }]}
      >
        <h2 id="definition">定义</h2>
      </ArticleShell>,
    );
    const articleText = container.querySelector(".article-main")?.textContent ?? "";
    const orderedLabels = [
      `${context.book.code} · 第 ${context.chapterNumber} 章`,
      document.frontmatter.title,
      document.frontmatter.summary,
      "预备知识",
      "本章目标",
    ];
    orderedLabels.reduce((previousIndex, label) => {
      const index = articleText.indexOf(label);
      expect(index, label).toBeGreaterThan(previousIndex);
      return index;
    }, -1);

    expect(articleText).not.toMatch(
      /内容维护与审阅信息|编辑状态|审阅状态|未有独立人工审阅|内容检查状态|草稿|预览|schema/i,
    );
    const reportLink = screen.getByRole("link", { name: "报告页面错误" });
    expect(reportLink).toHaveAttribute("href", expect.stringContaining("/zh-CN/contribute?topic="));
    expect(reportLink).toHaveAttribute(
      "href",
      expect.stringContaining("source=https%3A%2F%2Fone-forth.com"),
    );
  });

  it("keeps internal publication metadata out of the reader-facing article header", async () => {
    const document = await getDocument("existence-uniqueness");
    expect(document.frontmatter.publicationStatus).toBe("published");
    expect(document.frontmatter.editorialStatus).toBe("checked");

    const { container } = render(
      <ArticleShell
        document={document}
        tableOfContents={[{ id: "definition", level: 2, title: "定义" }]}
      >
        <h2 id="definition">定义</h2>
      </ArticleShell>,
    );

    const articleText = container.querySelector(".article-header")?.textContent ?? "";
    expect(articleText).toContain(document.frontmatter.summary);
    expect(articleText).toContain(`难度 ${document.frontmatter.difficulty}/5`);
    expect(container.querySelector(".content-preview-notice")).toBeNull();
    expect(articleText).not.toMatch(/预览稿|待人工审校|已审阅|独立人工审阅|编辑状态|草稿/i);
  });

  it("keeps the right rail limited to this page's H2/H3 table of contents", async () => {
    const document = await getDocument("linear-regression");

    const { container } = render(
      <ArticleShell
        document={document}
        tableOfContents={[{ id: "definition", level: 2, title: "定义" }]}
      >
        <h2 id="definition">定义</h2>
      </ArticleShell>,
    );
    const rightRail = container.querySelector<HTMLElement>(".article-right");

    expect(rightRail).not.toBeNull();
    expect(rightRail?.textContent).toContain("本页目录");
    expect(rightRail?.textContent).toContain("定义");
    expect(rightRail?.textContent).not.toMatch(/关键公式|相关概念|实验参数|梯度下降更新/);
    expect(rightRail?.querySelectorAll("nav")).toHaveLength(1);
    expect(container.querySelector('[aria-current="page"]')).toBeTruthy();
  });

  it("leaves authored concept anchors in the article body instead of synthesizing header targets", async () => {
    const document = await getDocument("sets-and-mappings");
    const anchorId = "set-operations";

    const { container } = render(
      <ArticleShell
        document={document}
        tableOfContents={[{ id: anchorId, level: 2, title: "集合运算" }]}
      >
        <h2 id={anchorId}>集合运算</h2>
      </ArticleShell>,
    );

    expect(container.querySelector(".article-concept-anchor-list")).toBeNull();
    expect(container.querySelector(`.article-header [id="${anchorId}"]`)).toBeNull();
    expect(container.querySelectorAll(`[id="${anchorId}"]`)).toHaveLength(1);
    expect(container.querySelector(`.article-prose [id="${anchorId}"]`)).not.toBeNull();
  });
});
