import { describe, expect, it } from "vitest";
import {
  contentRepository,
  publicContentRepository,
  publicCurriculumRepository,
  readerContentRepository,
  readerCurriculumRepository,
} from "../index";
import { curriculumData } from "./data";
import { selectPublishedCurriculum, selectReadableCurriculum } from "./published";

describe("published curriculum projection", () => {
  it("removes every non-published node and reverse reference", () => {
    const sourceChapter = curriculumData.chapters[0];
    expect(sourceChapter).toBeDefined();
    if (!sourceChapter) return;

    const source = {
      ...curriculumData,
      chapters: curriculumData.chapters.map((chapter) =>
        chapter.id === sourceChapter.id
          ? {
              ...chapter,
              publicationStatus: "published" as const,
              editorialStatus: "checked" as const,
            }
          : { ...chapter, publicationStatus: "hidden" as const },
      ),
    };
    const projected = selectPublishedCurriculum(source);

    expect(projected.chapters.map((chapter) => chapter.id)).toEqual([sourceChapter.id]);
    expect(projected.parts).toHaveLength(1);
    expect(projected.parts[0]?.chapterIds).toEqual([sourceChapter.id]);
    expect(projected.books).toHaveLength(1);
    expect(projected.books[0]?.partIds).toEqual([sourceChapter.partId]);
    expect(projected.books[0]?.startChapterId).toBe(sourceChapter.id);
    expect(projected.books[0]?.reviewChapterId).toBe(sourceChapter.id);
    expect(projected.books[0]?.referencePlan).toEqual([]);
    expect(projected.series).toHaveLength(1);
    expect(projected.series[0]?.bookIds).toEqual([sourceChapter.bookId]);
  });

  it("returns an empty public curriculum when nothing is published", () => {
    const projected = selectPublishedCurriculum({
      ...curriculumData,
      chapters: curriculumData.chapters.map((chapter) => ({
        ...chapter,
        publicationStatus: "preview" as const,
      })),
    });

    expect(projected.series).toEqual([]);
    expect(projected.books).toEqual([]);
    expect(projected.parts).toEqual([]);
    expect(projected.chapters).toEqual([]);
  });
});

describe("readable curriculum projection", () => {
  it("keeps preview and published Chapters while removing hidden reverse references", () => {
    const [previewSource, publishedSource] = curriculumData.chapters;
    const previewChapter = previewSource
      ? { ...previewSource, publicationStatus: "preview" as const }
      : undefined;
    const publishedChapter = publishedSource
      ? { ...publishedSource, publicationStatus: "published" as const }
      : undefined;
    expect(previewChapter).toBeDefined();
    expect(publishedChapter).toBeDefined();
    if (!previewChapter || !publishedChapter) return;

    const readableIds = new Set([previewChapter.id, publishedChapter.id]);
    const source = {
      ...curriculumData,
      chapters: curriculumData.chapters.map((chapter) =>
        chapter.id === previewChapter.id
          ? previewChapter
          : chapter.id === publishedChapter.id
            ? publishedChapter
            : { ...chapter, publicationStatus: "hidden" as const },
      ),
    };
    const projected = selectReadableCurriculum(source);

    expect(projected.chapters.map((chapter) => chapter.id)).toEqual(
      source.chapters.filter((chapter) => readableIds.has(chapter.id)).map((chapter) => chapter.id),
    );
    expect(projected.chapters.map((chapter) => chapter.publicationStatus)).toContain("preview");
    expect(projected.chapters.map((chapter) => chapter.publicationStatus)).toContain("published");
    expect(projected.chapters.every((chapter) => chapter.publicationStatus !== "hidden")).toBe(
      true,
    );
    const projectedChapterIds = new Set(projected.chapters.map((chapter) => chapter.id));
    expect(
      projected.parts.every((part) =>
        part.chapterIds.every((chapterId) => projectedChapterIds.has(chapterId)),
      ),
    ).toBe(true);
  });

  it("keeps the published-only and reader facades independent", async () => {
    const [sourceDocuments, publicDocuments, readerDocuments] = await Promise.all([
      contentRepository.listDocuments({ locale: "zh-CN" }),
      publicContentRepository.listDocuments({ locale: "zh-CN" }),
      readerContentRepository.listDocuments({ locale: "zh-CN" }),
    ]);
    const expectedPublished = sourceDocuments.filter(
      (document) => document.frontmatter.publicationStatus === "published",
    );
    const expectedReadable = sourceDocuments.filter(
      (document) => document.frontmatter.publicationStatus !== "hidden",
    );

    expect(publicDocuments.map((document) => document.documentId)).toEqual(
      expectedPublished.map((document) => document.documentId),
    );
    expect(readerDocuments.map((document) => document.documentId)).toEqual(
      expectedReadable.map((document) => document.documentId),
    );
    expect(
      publicCurriculumRepository
        .listChapters()
        .every((chapter) => chapter.publicationStatus === "published"),
    ).toBe(true);
    expect(
      readerCurriculumRepository
        .listChapters()
        .every((chapter) => chapter.publicationStatus !== "hidden"),
    ).toBe(true);
    expect(readerCurriculumRepository.listChapters()).toHaveLength(expectedReadable.length);
  });
});
