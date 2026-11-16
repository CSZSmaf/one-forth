import type {
  ConceptEntity,
  ContentDocument,
  CurriculumChapterContext,
  CurriculumRepository,
} from "@one-forth/content";
import { isContentSearchable, type PublicationAccessOptions } from "@one-forth/content/maturity";
import {
  createPublicSearchKey,
  type SearchCurriculumLocation,
  type SearchDocument,
} from "./client";

export {
  createPublicSearchKey,
  searchDocuments,
  segmentSearchText,
  type RankedSearchResult,
  type SearchCurriculumLocation,
  type SearchDocument,
  type SearchDocumentKind,
  type SearchFilters,
} from "./client";

export interface ConceptSearchDocumentOptions {
  readonly locale?: ContentDocument["locale"];
  readonly documents?: readonly ContentDocument[];
  readonly includePreview?: boolean;
}

/**
 * Projects concepts backed by documents admitted by the requested reader
 * publication policy. Hidden content is never searchable.
 */
export function createConceptSearchDocuments(
  concepts: readonly ConceptEntity[],
  options: ConceptSearchDocumentOptions = {},
): readonly SearchDocument[] {
  const locale = options.locale ?? "zh-CN";
  const searchableDocumentsByConcept = new Map<string, ContentDocument>();
  for (const document of options.documents ?? []) {
    if (
      document.locale === locale &&
      isContentSearchable(document.frontmatter.publicationStatus, {
        includePreview: options.includePreview === true,
      })
    ) {
      searchableDocumentsByConcept.set(document.frontmatter.conceptId, document);
    }
  }

  return concepts.flatMap((concept): readonly SearchDocument[] => {
    const document = searchableDocumentsByConcept.get(concept.id);
    if (!document) return [];
    return [
      {
        key: createPublicSearchKey("article", document.url),
        kind: "article",
        title: document.frontmatter.title,
        summary: document.frontmatter.summary,
        domain: concept.domain,
        subject: concept.subject,
        difficulty: concept.difficulty,
        locale,
        url: document.url,
        keywords: [
          ...document.frontmatter.tags,
          ...document.frontmatter.aliases,
          ...concept.aliases.flatMap((alias) => Object.values(alias)),
        ],
      },
    ];
  });
}

function localizeCurriculumText(
  text: CurriculumChapterContext["chapter"]["title"],
  locale: ContentDocument["locale"],
): string {
  return text[locale] ?? text["zh-CN"] ?? text.en ?? "";
}

export function createSearchCurriculumLocation(
  context: CurriculumChapterContext,
  locale: ContentDocument["locale"] = "zh-CN",
): SearchCurriculumLocation {
  return {
    seriesTitle: localizeCurriculumText(context.series.title, locale),
    bookCode: context.book.code,
    bookTitle: localizeCurriculumText(context.book.title, locale),
    partTitle: localizeCurriculumText(context.part.title, locale),
    chapterTitle: localizeCurriculumText(context.chapter.title, locale),
    chapterNumber: context.chapterNumber,
  };
}

export interface CurriculumSearchDocumentOptions {
  readonly documents?: readonly ContentDocument[];
  readonly locale?: ContentDocument["locale"];
  readonly includePreview?: boolean;
}

function searchAccessOptions(includePreview: boolean | undefined): PublicationAccessOptions {
  return { includePreview: includePreview === true };
}

/** Projects curriculum chapters admitted by the requested reader policy. */
export function createCurriculumSearchDocuments(
  repository: CurriculumRepository,
  options: CurriculumSearchDocumentOptions = {},
): readonly SearchDocument[] {
  const locale = options.locale ?? "zh-CN";
  const authoredById = new Map(
    options.documents?.map((document) => [document.frontmatter.id, document]),
  );
  return repository.listChapters().flatMap((chapter): readonly SearchDocument[] => {
    if (
      !isContentSearchable(chapter.publicationStatus, searchAccessOptions(options.includePreview))
    )
      return [];
    const context = repository.getChapterContext(chapter.id, locale);
    if (!context) return [];
    const curriculum = createSearchCurriculumLocation(context, locale);
    const frontmatter = chapter.contentId
      ? authoredById.get(chapter.contentId)?.frontmatter
      : undefined;
    if (
      options.documents &&
      (!frontmatter ||
        !isContentSearchable(
          frontmatter.publicationStatus,
          searchAccessOptions(options.includePreview),
        ))
    )
      return [];
    return [
      {
        key: createPublicSearchKey("chapter", context.canonicalPath),
        kind: "chapter",
        title: curriculum.chapterTitle,
        summary: localizeCurriculumText(chapter.summary, locale),
        difficulty: chapter.difficulty,
        ...(frontmatter ? { domain: frontmatter.domain, subject: frontmatter.subject } : {}),
        locale,
        url: context.canonicalPath,
        curriculum,
        keywords: [
          curriculum.seriesTitle,
          curriculum.bookCode,
          curriculum.bookTitle,
          curriculum.partTitle,
          curriculum.chapterTitle,
          ...chapter.keyTerms,
        ],
      },
    ];
  });
}
