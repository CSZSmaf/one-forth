import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  learningPaths,
  readerContentRepository,
  readerCurriculumRepository,
} from "@one-forth/content";

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  permanentRedirect: vi.fn((target: string): never => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock("next/navigation", () => navigationMocks);

import LearningPathPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/[locale]/paths/[slug]/page";
import {
  bookHasReadableDescendant,
  listReadableLearningPaths,
  listPublicLearningPaths,
} from "@/app/[locale]/paths/publication";

describe("learning path routes", () => {
  it("renders canonical textbook chapters instead of concept URLs", async () => {
    const readablePaths = await listReadableLearningPaths("zh-CN");
    const path = readablePaths[0];
    if (!path) {
      expect(await generateStaticParams()).toEqual([]);
      return;
    }

    render(
      await LearningPathPage({
        params: Promise.resolve({
          locale: "zh-CN",
          slug: path.id,
        }),
      }),
    );

    expect(
      screen.getByText(path.routeKind === "series" ? "全系列路线" : "专题路线", {
        selector: ".eyebrow",
      }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "学习阶段" })).toBeVisible();
    expect(document.body.textContent).not.toMatch(/预览稿|待人工审校|编辑状态|草稿/);

    const sequence = screen.getByRole("heading", { name: "学习阶段" }).closest("section");
    expect(sequence).not.toBeNull();
    if (!sequence) return;
    const links = within(sequence).getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    expect(
      links.every((link) =>
        /^\/zh-CN\/books\/[^/]+\/[^/]+\/[^/]+$/.test(link.getAttribute("href") ?? ""),
      ),
    ).toBe(true);
    expect(sequence.querySelector('a[href*="/concepts/"]')).toBeNull();
    expect(sequence.querySelectorAll(".path-section-list > section")).toHaveLength(
      path.sections.length,
    );
  });

  it("indexes every route only after all referenced Chapters are published", async () => {
    const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
    const readableContentIds = new Set(documents.map((document) => document.frontmatter.id));
    const readablePaths = await listReadableLearningPaths("zh-CN");
    const publicPaths = await listPublicLearningPaths("zh-CN");
    const params = await generateStaticParams();

    expect(params).toEqual(readablePaths.map((path) => ({ locale: "zh-CN", slug: path.id })));
    expect(readablePaths).toHaveLength(learningPaths.length);
    expect(publicPaths).toEqual(readablePaths);

    for (const path of readablePaths) {
      expect(path.schemaVersion).toBe(4);
      expect(path.sections.flatMap((section) => section.chapterIds)).toEqual(path.chapterIds);
      const referencedChapterIds = new Set([
        ...path.prerequisiteChapterIds,
        ...path.chapterIds,
        ...path.checkpoints.map((checkpoint) => checkpoint.afterChapterId),
        ...path.exercises.flatMap((exercise) => exercise.chapterIds),
      ]);
      for (const chapterId of referencedChapterIds) {
        const chapter = readerCurriculumRepository.getChapter(chapterId);
        expect(chapter?.publicationStatus, `${path.id}/${chapterId}`).toBe("published");
        expect(
          chapter?.contentId ? readableContentIds.has(chapter.contentId) : false,
          `${path.id}/${chapterId}`,
        ).toBe(true);
      }
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale: "zh-CN", slug: path.id }),
      });
      expect(metadata.robots, path.id).toMatchObject({ index: true, follow: true });
      expect(metadata.alternates?.canonical).toBe(`https://one-forth.com/zh-CN/paths/${path.id}`);
    }

    await expect(
      LearningPathPage({
        params: Promise.resolve({ locale: "zh-CN", slug: "missing-learning-path" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(
      await generateMetadata({
        params: Promise.resolve({ locale: "zh-CN", slug: "missing-learning-path" }),
      }),
    ).toEqual({});
  });

  it("keeps each foundation legacy URL as a permanent one-hop public alias", async () => {
    const target = (await bookHasReadableDescendant("m02", "zh-CN"))
      ? "/zh-CN/books/mathematics/single-variable-calculus"
      : "/zh-CN/books";
    await expect(
      LearningPathPage({
        params: Promise.resolve({ locale: "zh-CN", slug: "calculus-foundations" }),
      }),
    ).rejects.toThrow(`NEXT_REDIRECT:${target}`);
    expect(navigationMocks.permanentRedirect).toHaveBeenCalledWith(target);

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "calculus-foundations" }),
    });
    expect(metadata.alternates?.canonical).toBe(`https://one-forth.com${target}`);
  });
});
