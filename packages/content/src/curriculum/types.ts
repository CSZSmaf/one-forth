import type { SupportedLocale } from "@one-forth/config";
import type { LocalizedText } from "@one-forth/registry";
import type { EditorialStatus, PublicationStatus } from "../maturity";

export const curriculumSchemaVersion = 2 as const;

export type CurriculumSchemaVersion = typeof curriculumSchemaVersion;
export type CurriculumNodeKind = "series" | "book" | "part" | "chapter";
export type CurriculumLevel = "foundation" | "undergraduate" | "advanced" | "research";

export interface CanonicalLocation {
  readonly chapterId: string;
  readonly anchorId?: string;
}

export interface PlannedSection {
  readonly id: string;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
}

export interface PlannedItem {
  readonly id: string;
  readonly title: LocalizedText;
  readonly purpose: LocalizedText;
}

interface CurriculumNodeBase {
  readonly schemaVersion: CurriculumSchemaVersion;
  readonly id: string;
  readonly kind: CurriculumNodeKind;
  readonly slug: string;
  readonly order: number;
  readonly title: LocalizedText;
  readonly shortTitle?: LocalizedText;
  readonly summary: LocalizedText;
}

export interface CurriculumSeries extends CurriculumNodeBase {
  readonly kind: "series";
  readonly bookIds: readonly string[];
}

export interface CurriculumBook extends CurriculumNodeBase {
  readonly kind: "book";
  readonly code: string;
  readonly seriesId: string;
  readonly level: CurriculumLevel;
  readonly introduction: LocalizedText;
  readonly audience: LocalizedText;
  readonly prerequisiteBookIds: readonly string[];
  readonly symbolConventions: readonly LocalizedText[];
  readonly partIds: readonly string[];
  readonly startChapterId: string;
  readonly reviewChapterId: string;
  readonly integratedExercisePlan: readonly LocalizedText[];
  readonly referencePlan: readonly LocalizedText[];
  readonly relatedBookIds: readonly string[];
}

export interface CurriculumPart extends CurriculumNodeBase {
  readonly kind: "part";
  readonly bookId: string;
  readonly chapterIds: readonly string[];
}

export interface CurriculumChapter extends CurriculumNodeBase {
  readonly kind: "chapter";
  readonly bookId: string;
  readonly partId: string;
  readonly level: CurriculumLevel;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly estimatedMinutes: number;
  readonly publicationStatus: PublicationStatus;
  readonly editorialStatus: EditorialStatus;
  readonly contentId?: string;
  readonly prerequisiteChapterIds: readonly string[];
  readonly conceptIds: readonly string[];
  readonly visualizationIds: readonly string[];
  readonly resourceIds: readonly string[];
  readonly learningObjectives: readonly LocalizedText[];
  readonly plannedSections: readonly PlannedSection[];
  readonly keyTerms: readonly string[];
  readonly plannedDefinitions: readonly PlannedItem[];
  readonly plannedEquations: readonly PlannedItem[];
  readonly plannedExamples: readonly PlannedItem[];
  readonly plannedExercises: readonly PlannedItem[];
}

export type CurriculumNode = CurriculumSeries | CurriculumBook | CurriculumPart | CurriculumChapter;

export interface CurriculumDataset {
  readonly schemaVersion: CurriculumSchemaVersion;
  readonly series: readonly CurriculumSeries[];
  readonly books: readonly CurriculumBook[];
  readonly parts: readonly CurriculumPart[];
  readonly chapters: readonly CurriculumChapter[];
}

export interface CurriculumBreadcrumbItem {
  readonly id: string;
  readonly kind: "series" | "book" | "part" | "chapter";
  readonly title: LocalizedText;
  readonly href: string;
}

export interface CurriculumChapterContext {
  readonly series: CurriculumSeries;
  readonly book: CurriculumBook;
  readonly part: CurriculumPart;
  readonly chapter: CurriculumChapter;
  readonly chapterNumber: number;
  readonly chapterCount: number;
  readonly previousChapter?: CurriculumChapter;
  readonly nextChapter?: CurriculumChapter;
  readonly breadcrumbs: readonly CurriculumBreadcrumbItem[];
  readonly canonicalPath: string;
}

export interface CurriculumProgress {
  readonly bookId: string;
  readonly completedChapters: number;
  readonly totalChapters: number;
  readonly percent: number;
  readonly currentChapterId?: string;
}

export interface CurriculumVisualizationBinding {
  readonly visualizationId: string;
  readonly primaryChapterId: string;
  readonly primaryContentId: string;
  readonly chapterIds: readonly string[];
  readonly contentIds: readonly string[];
}

export interface CurriculumRepository {
  listSeries(): readonly CurriculumSeries[];
  listBooks(seriesId?: string): readonly CurriculumBook[];
  listParts(bookId?: string): readonly CurriculumPart[];
  listChapters(bookId?: string): readonly CurriculumChapter[];
  getSeries(id: string): CurriculumSeries | null;
  getBook(id: string): CurriculumBook | null;
  getPart(id: string): CurriculumPart | null;
  getChapter(id: string): CurriculumChapter | null;
  getSeriesBySlug(slug: string): CurriculumSeries | null;
  getBookByRoute(seriesSlug: string, bookSlug: string): CurriculumBook | null;
  getChapterByRoute(
    seriesSlug: string,
    bookSlug: string,
    chapterSlug: string,
  ): CurriculumChapter | null;
  getChapterForContent(contentId: string): CurriculumChapter | null;
  listVisualizationBindings(): readonly CurriculumVisualizationBinding[];
  getVisualizationBinding(visualizationId: string): CurriculumVisualizationBinding | null;
  getPrimaryChapterForVisualization(visualizationId: string): CurriculumChapter | null;
  getChapterContext(chapterId: string, locale: SupportedLocale): CurriculumChapterContext | null;
  resolveCanonicalLocation(location: CanonicalLocation, locale: SupportedLocale): string | null;
  getBookProgress(
    bookId: string,
    completedChapterIds: ReadonlySet<string>,
    currentChapterId?: string,
  ): CurriculumProgress | null;
}
