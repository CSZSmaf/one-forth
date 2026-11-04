import type { SupportedLocale } from "@one-forth/config";
import { curriculumVisualizationBindings } from "./data";
import type {
  CanonicalLocation,
  CurriculumBook,
  CurriculumChapter,
  CurriculumChapterContext,
  CurriculumDataset,
  CurriculumPart,
  CurriculumProgress,
  CurriculumRepository,
  CurriculumSeries,
  CurriculumVisualizationBinding,
} from "./types";

interface LocatedConcept {
  readonly id: string;
  readonly canonicalLocation: CanonicalLocation;
}

function compareOrderAndId(
  left: Readonly<{ order: number; id: string }>,
  right: Readonly<{ order: number; id: string }>,
): number {
  if (left.order !== right.order) return left.order - right.order;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export class InMemoryCurriculumRepository implements CurriculumRepository {
  readonly #series: readonly CurriculumSeries[];
  readonly #books: readonly CurriculumBook[];
  readonly #parts: readonly CurriculumPart[];
  readonly #chapters: readonly CurriculumChapter[];
  readonly #seriesById: ReadonlyMap<string, CurriculumSeries>;
  readonly #bookById: ReadonlyMap<string, CurriculumBook>;
  readonly #partById: ReadonlyMap<string, CurriculumPart>;
  readonly #chapterById: ReadonlyMap<string, CurriculumChapter>;
  readonly #chapterByContentId: ReadonlyMap<string, CurriculumChapter>;
  readonly #visualizationBindings: readonly CurriculumVisualizationBinding[];
  readonly #visualizationBindingById: ReadonlyMap<string, CurriculumVisualizationBinding>;

  constructor(
    dataset: CurriculumDataset,
    concepts: readonly LocatedConcept[] = [],
    visualizationBindings: readonly CurriculumVisualizationBinding[] = curriculumVisualizationBindings,
  ) {
    const conceptsByChapter = new Map<string, string[]>();
    for (const concept of concepts) {
      const current = conceptsByChapter.get(concept.canonicalLocation.chapterId) ?? [];
      current.push(concept.id);
      conceptsByChapter.set(concept.canonicalLocation.chapterId, current);
    }
    this.#series = [...dataset.series].sort(compareOrderAndId);
    this.#books = [...dataset.books].sort(compareOrderAndId);
    this.#parts = [...dataset.parts].sort(compareOrderAndId);
    this.#chapters = dataset.chapters
      .map((chapter) => ({
        ...chapter,
        conceptIds: [
          ...new Set([...chapter.conceptIds, ...(conceptsByChapter.get(chapter.id) ?? [])]),
        ].sort(),
      }))
      .sort(compareOrderAndId);
    this.#seriesById = new Map(this.#series.map((entry) => [entry.id, entry] as const));
    this.#bookById = new Map(this.#books.map((entry) => [entry.id, entry] as const));
    this.#partById = new Map(this.#parts.map((entry) => [entry.id, entry] as const));
    this.#chapterById = new Map(this.#chapters.map((entry) => [entry.id, entry] as const));
    this.#chapterByContentId = new Map(
      this.#chapters.flatMap((entry) =>
        entry.contentId ? ([[entry.contentId, entry]] as const) : [],
      ),
    );
    this.#visualizationBindings = [...visualizationBindings].sort((left, right) =>
      left.visualizationId.localeCompare(right.visualizationId, "en"),
    );
    this.#visualizationBindingById = new Map(
      this.#visualizationBindings.map((entry) => [entry.visualizationId, entry] as const),
    );
  }

  listSeries(): readonly CurriculumSeries[] {
    return this.#series;
  }

  listBooks(seriesId?: string): readonly CurriculumBook[] {
    return this.#books.filter((entry) => !seriesId || entry.seriesId === seriesId);
  }

  listParts(bookId?: string): readonly CurriculumPart[] {
    return this.#parts.filter((entry) => !bookId || entry.bookId === bookId);
  }

  listChapters(bookId?: string): readonly CurriculumChapter[] {
    if (!bookId) return this.#chapters;
    const partOrder = new Map(
      this.listParts(bookId).map((entry, index) => [entry.id, index] as const),
    );
    return this.#chapters
      .filter((entry) => entry.bookId === bookId)
      .sort(
        (left, right) =>
          (partOrder.get(left.partId) ?? 0) - (partOrder.get(right.partId) ?? 0) ||
          compareOrderAndId(left, right),
      );
  }

  getSeries(id: string): CurriculumSeries | null {
    return this.#seriesById.get(id) ?? null;
  }

  getBook(id: string): CurriculumBook | null {
    return this.#bookById.get(id) ?? null;
  }

  getPart(id: string): CurriculumPart | null {
    return this.#partById.get(id) ?? null;
  }

  getChapter(id: string): CurriculumChapter | null {
    return this.#chapterById.get(id) ?? null;
  }

  listVisualizationBindings(): readonly CurriculumVisualizationBinding[] {
    return this.#visualizationBindings;
  }

  getVisualizationBinding(visualizationId: string): CurriculumVisualizationBinding | null {
    return this.#visualizationBindingById.get(visualizationId) ?? null;
  }

  getPrimaryChapterForVisualization(visualizationId: string): CurriculumChapter | null {
    const binding = this.getVisualizationBinding(visualizationId);
    return binding ? this.getChapter(binding.primaryChapterId) : null;
  }

  getSeriesBySlug(slug: string): CurriculumSeries | null {
    return this.#series.find((entry) => entry.slug === slug) ?? null;
  }

  getBookByRoute(seriesSlug: string, bookSlug: string): CurriculumBook | null {
    const series = this.getSeriesBySlug(seriesSlug);
    return series
      ? (this.listBooks(series.id).find((entry) => entry.slug === bookSlug) ?? null)
      : null;
  }

  getChapterByRoute(
    seriesSlug: string,
    bookSlug: string,
    chapterSlug: string,
  ): CurriculumChapter | null {
    const book = this.getBookByRoute(seriesSlug, bookSlug);
    return book
      ? (this.listChapters(book.id).find((entry) => entry.slug === chapterSlug) ?? null)
      : null;
  }

  getChapterForContent(contentId: string): CurriculumChapter | null {
    return this.#chapterByContentId.get(contentId) ?? null;
  }

  getChapterContext(chapterId: string, locale: SupportedLocale): CurriculumChapterContext | null {
    const chapter = this.getChapter(chapterId);
    if (!chapter) return null;
    const part = this.getPart(chapter.partId);
    const book = this.getBook(chapter.bookId);
    if (!part || !book) return null;
    const series = this.getSeries(book.seriesId);
    if (!series) return null;
    const orderedChapters = this.listChapters(book.id);
    const chapterIndex = orderedChapters.findIndex((entry) => entry.id === chapter.id);
    if (chapterIndex < 0) return null;
    const canonicalPath = `/${locale}/books/${series.slug}/${book.slug}/${chapter.slug}`;
    return {
      series,
      book,
      part,
      chapter,
      chapterNumber: chapterIndex + 1,
      chapterCount: orderedChapters.length,
      ...(chapterIndex > 0 ? { previousChapter: orderedChapters[chapterIndex - 1] } : {}),
      ...(chapterIndex < orderedChapters.length - 1
        ? { nextChapter: orderedChapters[chapterIndex + 1] }
        : {}),
      canonicalPath,
      breadcrumbs: [
        {
          id: series.id,
          kind: "series",
          title: series.title,
          href: `/${locale}/books/${series.slug}`,
        },
        {
          id: book.id,
          kind: "book",
          title: book.title,
          href: `/${locale}/books/${series.slug}/${book.slug}`,
        },
        {
          id: part.id,
          kind: "part",
          title: part.title,
          href: `/${locale}/books/${series.slug}/${book.slug}#${part.id}`,
        },
        {
          id: chapter.id,
          kind: "chapter",
          title: chapter.title,
          href: canonicalPath,
        },
      ],
    };
  }

  resolveCanonicalLocation(location: CanonicalLocation, locale: SupportedLocale): string | null {
    const context = this.getChapterContext(location.chapterId, locale);
    if (!context) return null;
    return `${context.canonicalPath}${location.anchorId ? `#${location.anchorId}` : ""}`;
  }

  getBookProgress(
    bookId: string,
    completedChapterIds: ReadonlySet<string>,
    currentChapterId?: string,
  ): CurriculumProgress | null {
    if (!this.getBook(bookId)) return null;
    const chapters = this.listChapters(bookId);
    const completedChapters = chapters.filter((entry) => completedChapterIds.has(entry.id)).length;
    const totalChapters = chapters.length;
    return {
      bookId,
      completedChapters,
      totalChapters,
      percent: totalChapters === 0 ? 0 : Math.round((completedChapters / totalChapters) * 100),
      ...(currentChapterId && chapters.some((entry) => entry.id === currentChapterId)
        ? { currentChapterId }
        : {}),
    };
  }
}
