export type SearchDocumentKind =
  | "concept"
  | "article"
  | "chapter"
  | "theorem"
  | "equation"
  | "symbol"
  | "paper"
  | "book"
  | "experiment"
  | "learning-path"
  | "biography"
  | "dataset";

/** Cache-keyed schema version for the public search transport. */
export const publicSearchSchemaVersion = 2 as const;

/** Reader-facing curriculum context with no internal registry identifiers. */
export interface SearchCurriculumLocation {
  readonly seriesTitle: string;
  readonly bookCode: string;
  readonly bookTitle: string;
  readonly partTitle: string;
  readonly chapterTitle: string;
  readonly chapterNumber: number;
}

/** Public search data. Editorial workflow state must not cross this boundary. */
export interface SearchDocument {
  readonly key: string;
  readonly kind: SearchDocumentKind;
  readonly title: string;
  readonly summary: string;
  readonly domain?: string;
  readonly subject?: string;
  readonly difficulty?: number;
  readonly curriculum?: SearchCurriculumLocation;
  readonly locale: string;
  readonly url: string;
  readonly keywords: readonly string[];
}

export interface SearchFilters {
  readonly domain?: string;
  readonly kind?: SearchDocumentKind;
  readonly maximumDifficulty?: number;
}

export interface RankedSearchResult {
  readonly document: SearchDocument;
  readonly score: number;
  readonly matchedTerms: readonly string[];
}

export function createPublicSearchKey(kind: SearchDocumentKind, url: string): string {
  return `${kind}:${url}`;
}

export function segmentSearchText(text: string, locale = "zh-CN"): readonly string[] {
  const normalized = text.normalize("NFKC").toLocaleLowerCase(locale).trim();
  if (!normalized) return [];
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
    return [...segmenter.segment(normalized)]
      .filter((entry) => entry.isWordLike ?? /[\p{L}\p{N}]/u.test(entry.segment))
      .map((entry) => entry.segment);
  }
  return normalized.match(/[\p{Script=Han}]|[\p{L}\p{N}_.+\\-]+/gu) ?? [];
}

function normalizedTerms(document: SearchDocument): readonly string[] {
  return segmentSearchText(
    [document.title, document.summary, ...document.keywords].join(" "),
    document.locale,
  );
}

export function searchDocuments(
  documents: readonly SearchDocument[],
  query: string,
  filters: SearchFilters = {},
): readonly RankedSearchResult[] {
  const queryTerms = segmentSearchText(query);
  const normalizedQuery = query.normalize("NFKC").toLocaleLowerCase("zh-CN").trim();
  if (queryTerms.length === 0) return [];
  const rankedResults = documents
    .filter((document) => {
      if (filters.domain && document.domain !== filters.domain) return false;
      if (filters.kind && document.kind !== filters.kind) return false;
      if (filters.maximumDifficulty && (document.difficulty ?? 1) > filters.maximumDifficulty)
        return false;
      return true;
    })
    .map((document) => {
      const terms = normalizedTerms(document);
      const normalizedTitle = document.title.normalize("NFKC").toLocaleLowerCase(document.locale);
      const matchedTerms = queryTerms.filter((term) =>
        terms.some((candidate) => candidate.includes(term)),
      );
      const titleMatches = queryTerms.filter((term) => normalizedTitle.includes(term)).length;
      const kindPriority =
        document.kind === "article"
          ? 28
          : document.kind === "theorem"
            ? 16
            : document.kind === "concept"
              ? 12
              : document.kind === "experiment"
                ? 6
                : 0;
      const exactTitleBonus = normalizedTitle === normalizedQuery ? 32 : 0;
      const titlePrefixBonus =
        exactTitleBonus === 0 && normalizedTitle.startsWith(normalizedQuery) ? 16 : 0;
      const relevance =
        matchedTerms.length * 3 + titleMatches * 7 + exactTitleBonus + titlePrefixBonus;
      const score = relevance === 0 ? 0 : Math.max(1, relevance + kindPriority);
      return { document, score, matchedTerms };
    })
    .filter((result) => result.score > 0 && result.matchedTerms.length === queryTerms.length)
    .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title));
  const seenUrls = new Set<string>();
  return rankedResults.filter((result) => {
    if (seenUrls.has(result.document.url)) return false;
    seenUrls.add(result.document.url);
    return true;
  });
}
