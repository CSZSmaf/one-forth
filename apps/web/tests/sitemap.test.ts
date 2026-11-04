import { siteConfig } from "@one-forth/config";
import {
  contentRepository,
  curriculumRepository,
  publicContentRepository,
  publicCurriculumRepository,
} from "@one-forth/content";
import { describe, expect, it } from "vitest";
import sitemap, { stableRootPaths, stableToolPaths } from "@/app/sitemap";
import {
  listPublicLearningPaths,
  listReadableLearningPaths,
} from "@/app/[locale]/paths/publication";

const absolute = (path: string): string => new URL(path, `${siteConfig.url}/`).toString();

describe("canonical sitemap", () => {
  it("contains exactly stable public tools and published curriculum routes", async () => {
    const entries = await sitemap();
    const documents = await publicContentRepository.listDocuments({ locale: "zh-CN" });
    const documentById = new Map(
      documents.map((document) => [document.frontmatter.id, document] as const),
    );
    const publishedChapters = publicCurriculumRepository.listChapters();
    const publicPaths = await listPublicLearningPaths("zh-CN");
    const expectedPaths = new Set<string>([
      ...stableRootPaths,
      "/zh-CN",
      "/zh-CN/books",
      ...stableToolPaths.map((path) => `/zh-CN${path}`),
      ...publicPaths.map((path) => `/zh-CN/paths/${path.id}`),
    ]);

    for (const document of documents) {
      expectedPaths.add(`/zh-CN/subjects/${document.frontmatter.domain}`);
      expectedPaths.add(
        `/zh-CN/subjects/${document.frontmatter.domain}/${document.frontmatter.subject}`,
      );
    }

    for (const series of publicCurriculumRepository.listSeries()) {
      expectedPaths.add(`/zh-CN/books/${series.slug}`);
      publicCurriculumRepository
        .listBooks(series.id)
        .forEach((book) => expectedPaths.add(`/zh-CN/books/${series.slug}/${book.slug}`));
    }
    for (const chapter of publishedChapters) {
      const document = chapter.contentId ? documentById.get(chapter.contentId) : undefined;
      const context = publicCurriculumRepository.getChapterContext(chapter.id, "zh-CN");
      if (document && context) {
        expectedPaths.add(context.canonicalPath);
      }
    }

    const urls = entries.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(new Set(urls)).toEqual(new Set([...expectedPaths].map(absolute)));
    expect(urls.every((url) => url.startsWith(`${siteConfig.url}/`))).toBe(true);
    expect(urls).toContain(absolute("/about"));
    expect(urls.some((url) => url.includes("/learn/"))).toBe(false);
    expect(urls.some((url) => url.includes("/concepts/"))).toBe(false);
    expect(urls).not.toContain(absolute("/zh-CN/search"));
  });

  it("applies the publication policy to every Chapter without indexing plans", async () => {
    const urls = new Set((await sitemap()).map((entry) => entry.url));
    const documents = await contentRepository.listDocuments({ locale: "zh-CN" });
    const documentById = new Map(
      documents.map((document) => [document.frontmatter.id, document] as const),
    );

    for (const chapter of curriculumRepository.listChapters()) {
      const context = curriculumRepository.getChapterContext(chapter.id, "zh-CN");
      expect(context, chapter.id).not.toBeNull();
      if (!context) continue;
      const document = chapter.contentId ? documentById.get(chapter.contentId) : undefined;
      const expected = document?.frontmatter.publicationStatus === "published";
      expect(urls.has(absolute(context.canonicalPath)), chapter.id).toBe(expected);
    }
  });

  it("includes every completed chapter and learning path in the canonical sitemap", async () => {
    const urls = new Set((await sitemap()).map((entry) => entry.url));
    const publicPathIds = new Set((await listPublicLearningPaths("zh-CN")).map((path) => path.id));
    const previewPaths = (await listReadableLearningPaths("zh-CN")).filter(
      (path) => !publicPathIds.has(path.id),
    );

    expect(previewPaths).toEqual([]);
    for (const pathId of publicPathIds) {
      expect(urls.has(absolute(`/zh-CN/paths/${pathId}`)), pathId).toBe(true);
    }
    expect(
      urls.has(
        absolute(
          "/zh-CN/books/physics/physical-quantities-measurement-modeling/quantities-dimensions",
        ),
      ),
    ).toBe(true);
    expect(
      urls.has(
        absolute(
          "/zh-CN/books/computer-science/programming-scientific-computing-foundations/programs-types-control",
        ),
      ),
    ).toBe(true);
  });

  it("never exposes internal design references", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.includes("/design-system"))).toBe(false);
    expect(urls.some((url) => url.includes("/preview"))).toBe(false);
  });
});
