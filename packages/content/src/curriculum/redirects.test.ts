import { describe, expect, it } from "vitest";
import { normalizeCurriculumPath, siteConfig } from "@one-forth/config";
import {
  curriculumRedirects,
  learningPathAliases,
  learningPathById,
  publicConceptById,
  publicContentRepository,
  publicCurriculumRepository,
  readerConceptById,
  readerContentRepository,
  readerCurriculumRedirects,
  readerCurriculumRepository,
} from "../index";

describe("legacy curriculum redirects", () => {
  it("derives only published learn, concept, and Book alias mappings", async () => {
    const documents = await publicContentRepository.listDocuments({ locale: "zh-CN" });
    const expectedPathCount = learningPathAliases.filter((alias) =>
      publicCurriculumRepository.getBook(alias.targetBookId),
    ).length;
    const expectedCount = documents.length + publicConceptById.size + expectedPathCount + 128;
    expect(curriculumRedirects).toHaveLength(expectedCount);
    expect(curriculumRedirects.filter((entry) => entry.kind === "legacy-books")).toHaveLength(128);
    expect(curriculumRedirects.filter((entry) => entry.kind === "legacy-learn")).toHaveLength(
      documents.length,
    );
    expect(curriculumRedirects.filter((entry) => entry.kind === "legacy-concept")).toHaveLength(
      publicConceptById.size,
    );
    expect(curriculumRedirects.filter((entry) => entry.kind === "legacy-path")).toHaveLength(
      expectedPathCount,
    );
    expect(new Set(curriculumRedirects.map((entry) => entry.sourcePath)).size).toBe(expectedCount);
    expect(curriculumRedirects.map((entry) => entry.sourcePath)).toEqual(
      [...curriculumRedirects.map((entry) => entry.sourcePath)].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    );
  });

  it("targets one real Book or Chapter without another legacy hop", () => {
    const sources = new Set(curriculumRedirects.map((entry) => entry.sourcePath));
    for (const redirect of curriculumRedirects) {
      const target = new URL(redirect.targetPath, siteConfig.url);
      expect(sources.has(target.pathname), redirect.sourcePath).toBe(false);
      const [, locale, books, series, book, chapter] = target.pathname.split("/");
      expect(locale, redirect.sourcePath).toBe("zh-CN");
      if (redirect.kind === "legacy-books") {
        expect(normalizeCurriculumPath(redirect.sourcePath)).toBe(redirect.targetPath);
        const validTarget =
          target.pathname === "/zh-CN/books" ||
          (books === "paths" && learningPathById.has(series ?? "")) ||
          (books === "books" &&
            Boolean(
              chapter
                ? publicCurriculumRepository.getChapterByRoute(series ?? "", book ?? "", chapter)
                : publicCurriculumRepository.getBookByRoute(series ?? "", book ?? ""),
            ));
        expect(validTarget, redirect.sourcePath).toBe(true);
        continue;
      }
      expect(books, redirect.sourcePath).toBe("books");
      if (redirect.kind === "legacy-path") {
        expect(
          publicCurriculumRepository.getBookByRoute(series ?? "", book ?? ""),
          redirect.sourcePath,
        ).not.toBeNull();
        expect(chapter, redirect.sourcePath).toBeUndefined();
      } else {
        expect(
          publicCurriculumRepository.getChapterByRoute(series ?? "", book ?? "", chapter ?? ""),
          redirect.sourcePath,
        ).not.toBeNull();
      }
    }
  });

  it("emits a retired path alias exactly when its target Book is public", () => {
    for (const alias of learningPathAliases) {
      const redirect = curriculumRedirects.find(
        (entry) => entry.sourcePath === `/zh-CN/paths/${alias.id}`,
      );
      const book = publicCurriculumRepository.getBook(alias.targetBookId);
      const series = book ? publicCurriculumRepository.getSeries(book.seriesId) : null;
      if (!book || !series) {
        expect(redirect, alias.id).toBeUndefined();
        continue;
      }
      expect(redirect, alias.id).toMatchObject({
        targetPath: `/zh-CN/books/${series.slug}/${book.slug}`,
        kind: "legacy-path",
      });
    }
  });

  it("publishes legacy concept redirects for the completed concept catalog", () => {
    expect(
      curriculumRedirects.find(
        (entry) => entry.sourcePath === "/zh-CN/concepts/adaptive-optimizers",
      ),
    ).toMatchObject({ kind: "legacy-concept" });
  });

  it("derives reader-safe redirects for every published document", async () => {
    const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
    const expectedPathCount = learningPathAliases.filter((alias) =>
      readerCurriculumRepository.getBook(alias.targetBookId),
    ).length;
    expect(readerCurriculumRedirects).toHaveLength(
      documents.length + readerConceptById.size + expectedPathCount + 128,
    );
    expect(readerCurriculumRedirects.filter((entry) => entry.kind === "legacy-learn")).toHaveLength(
      documents.length,
    );

    expect(
      documents.every((document) => document.frontmatter.publicationStatus === "published"),
    ).toBe(true);
    for (const document of documents) {
      expect(
        readerCurriculumRedirects.find(
          (entry) => entry.sourcePath === `/${document.locale}/learn/${document.slug.join("/")}`,
        ),
      ).toMatchObject({ targetPath: document.url, kind: "legacy-learn" });
    }
  });
});
