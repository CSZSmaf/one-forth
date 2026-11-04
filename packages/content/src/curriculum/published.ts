import { isContentReadable, type PublicationStatus } from "../maturity";
import type { CurriculumBook, CurriculumDataset, CurriculumVisualizationBinding } from "./types";

function compareOrderAndId(
  left: Readonly<{ order: number; id: string }>,
  right: Readonly<{ order: number; id: string }>,
): number {
  return left.order - right.order || left.id.localeCompare(right.id, "en");
}

function selectCurriculum(
  dataset: CurriculumDataset,
  includesChapter: (publicationStatus: PublicationStatus) => boolean,
  projectionLabel: string,
): CurriculumDataset {
  const partOrderById = new Map(dataset.parts.map((part) => [part.id, part.order] as const));
  const selectedChapterIds = new Set(
    dataset.chapters
      .filter((chapter) => includesChapter(chapter.publicationStatus))
      .map((chapter) => chapter.id),
  );
  const chapters = dataset.chapters
    .filter((chapter) => selectedChapterIds.has(chapter.id))
    .map((chapter) => ({
      ...chapter,
      prerequisiteChapterIds: chapter.prerequisiteChapterIds.filter((id) =>
        selectedChapterIds.has(id),
      ),
    }));

  const selectedPartIds = new Set(chapters.map((chapter) => chapter.partId));
  const parts = dataset.parts
    .filter((part) => selectedPartIds.has(part.id))
    .map((part) => ({
      ...part,
      chapterIds: part.chapterIds.filter((id) => selectedChapterIds.has(id)),
    }));

  const selectedBookIds = new Set(chapters.map((chapter) => chapter.bookId));
  const chaptersByBook = new Map<string, typeof chapters>();
  for (const bookId of selectedBookIds) {
    chaptersByBook.set(
      bookId,
      chapters
        .filter((chapter) => chapter.bookId === bookId)
        .sort(
          (left, right) =>
            (partOrderById.get(left.partId) ?? 0) - (partOrderById.get(right.partId) ?? 0) ||
            compareOrderAndId(left, right),
        ),
    );
  }
  const books = dataset.books
    .filter((book) => selectedBookIds.has(book.id))
    .map((book): CurriculumBook => {
      const bookChapters = chaptersByBook.get(book.id) ?? [];
      const firstChapter = bookChapters[0];
      const lastChapter = bookChapters.at(-1);
      if (!firstChapter || !lastChapter) {
        throw new Error(`${projectionLabel} Book ${book.id} has no selected Chapters.`);
      }
      return {
        ...book,
        partIds: book.partIds.filter((id) => selectedPartIds.has(id)),
        startChapterId: firstChapter.id,
        reviewChapterId: lastChapter.id,
        prerequisiteBookIds: book.prerequisiteBookIds.filter((id) => selectedBookIds.has(id)),
        relatedBookIds: book.relatedBookIds.filter((id) => selectedBookIds.has(id)),
        referencePlan: [],
      };
    });

  const selectedSeriesIds = new Set(books.map((book) => book.seriesId));
  const series = dataset.series
    .filter((entry) => selectedSeriesIds.has(entry.id))
    .map((entry) => ({
      ...entry,
      bookIds: entry.bookIds.filter((id) => selectedBookIds.has(id)),
    }));

  return { ...dataset, series, books, parts, chapters };
}

/**
 * Projects the editorial curriculum into the publication-approved dataset.
 * Hidden and preview nodes are removed structurally, including every reverse
 * reference that could otherwise leak an internal ID.
 */
export function selectPublishedCurriculum(dataset: CurriculumDataset): CurriculumDataset {
  return selectCurriculum(
    dataset,
    (publicationStatus) => publicationStatus === "published",
    "Published",
  );
}

/**
 * Projects the editorial curriculum into a reader-facing dataset. Published
 * and preview Chapters remain readable with their original status, while
 * hidden nodes and every reverse reference to them are removed structurally.
 */
export function selectReadableCurriculum(dataset: CurriculumDataset): CurriculumDataset {
  return selectCurriculum(dataset, isContentReadable, "Readable");
}

/** Keeps visualization provenance aligned with the published curriculum. */
export function selectPublishedVisualizationBindings(
  bindings: readonly CurriculumVisualizationBinding[],
  dataset: CurriculumDataset,
): readonly CurriculumVisualizationBinding[] {
  const publishedChapterIds = new Set(dataset.chapters.map((chapter) => chapter.id));
  const chapterById = new Map(dataset.chapters.map((chapter) => [chapter.id, chapter] as const));

  return bindings.flatMap((binding) => {
    const pairs = binding.chapterIds.flatMap((chapterId, index) => {
      const contentId = binding.contentIds[index];
      return publishedChapterIds.has(chapterId) && contentId ? [{ chapterId, contentId }] : [];
    });
    if (pairs.length === 0) return [];
    const primary = pairs.find((pair) => pair.chapterId === binding.primaryChapterId) ?? pairs[0];
    if (!primary) return [];
    const primaryChapter = chapterById.get(primary.chapterId);
    if (!primaryChapter?.contentId || primaryChapter.contentId !== primary.contentId) {
      throw new Error(
        `Curriculum visualization ${binding.visualizationId} has invalid provenance.`,
      );
    }
    return [
      {
        visualizationId: binding.visualizationId,
        primaryChapterId: primary.chapterId,
        primaryContentId: primary.contentId,
        chapterIds: pairs.map((pair) => pair.chapterId),
        contentIds: pairs.map((pair) => pair.contentId),
      },
    ];
  });
}

/** Keeps visualization provenance aligned with the readable curriculum. */
export function selectReadableVisualizationBindings(
  bindings: readonly CurriculumVisualizationBinding[],
  dataset: CurriculumDataset,
): readonly CurriculumVisualizationBinding[] {
  return selectPublishedVisualizationBindings(bindings, dataset);
}
