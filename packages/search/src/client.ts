import { normalizeMathSearchText } from "./math-text";

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
/** Changes when catalog coverage changes while the transport shape remains compatible. */
export const publicSearchCatalogRevision = 2 as const;

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
  const normalized = normalizeMathSearchText(text, locale);
  if (!normalized) return [];
  const mathTerms: string[] = [];
  const prose = normalized.replace(/\\[a-z]+|[\p{Sm}]/gu, (token) => {
    mathTerms.push(token);
    return " ";
  });
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
    const words = [...segmenter.segment(prose)]
      .filter((entry) => entry.isWordLike ?? /[\p{L}\p{N}]/u.test(entry.segment))
      .map((entry) => entry.segment);
    return [...words, ...mathTerms];
  }
  const words = prose.match(/[\p{Script=Han}]|[\p{L}\p{N}]+(?:[_.-][\p{L}\p{N}]+)*/gu) ?? [];
  return [...words, ...mathTerms];
}

const preparedDocuments = new WeakMap<
  SearchDocument,
  { readonly terms: readonly string[]; readonly title: string }
>();

function prepareDocument(document: SearchDocument) {
  const cached = preparedDocuments.get(document);
  if (cached) return cached;
  const prepared = {
    terms: segmentSearchText(
      [document.title, document.summary, ...document.keywords].join(" "),
      document.locale,
    ),
    title: normalizeMathSearchText(document.title, document.locale),
  };
  preparedDocuments.set(document, prepared);
  return prepared;
}

export function searchDocuments(
  documents: readonly SearchDocument[],
  query: string,
  filters: SearchFilters = {},
): readonly RankedSearchResult[] {
  const queryTerms = segmentSearchText(query);
  const normalizedQuery = normalizeMathSearchText(query, "zh-CN");
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
      const { terms, title: normalizedTitle } = prepareDocument(document);
      const matchedTerms = queryTerms.filter((term) =>
        terms.some((candidate) =>
          term.startsWith("\\") ? candidate === term : candidate.includes(term),
        ),
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
