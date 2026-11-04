import type {
  SearchCurriculumLocation,
  SearchDocument,
  SearchDocumentKind,
} from "@one-forth/search/client";
import { publicSearchSchemaVersion } from "@one-forth/search/client";

const searchDocumentKinds = new Set<SearchDocumentKind>([
  "concept",
  "article",
  "chapter",
  "theorem",
  "equation",
  "symbol",
  "paper",
  "book",
  "experiment",
  "learning-path",
  "biography",
  "dataset",
]);

const searchDocumentKeys = new Set([
  "key",
  "kind",
  "title",
  "summary",
  "domain",
  "subject",
  "difficulty",
  "curriculum",
  "locale",
  "url",
  "keywords",
]);

const curriculumKeys = new Set([
  "seriesTitle",
  "bookCode",
  "bookTitle",
  "partTitle",
  "chapterTitle",
  "chapterNumber",
]);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function hasOnlyKeys(value: Readonly<Record<string, unknown>>, allowed: ReadonlySet<string>) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isSearchCurriculumLocation(value: unknown): value is SearchCurriculumLocation {
  if (!isRecord(value) || !hasOnlyKeys(value, curriculumKeys)) return false;
  return (
    typeof value.seriesTitle === "string" &&
    typeof value.bookCode === "string" &&
    typeof value.bookTitle === "string" &&
    typeof value.partTitle === "string" &&
    typeof value.chapterTitle === "string" &&
    typeof value.chapterNumber === "number"
  );
}

/** Strict validator for the public search transport boundary. */
export function isSearchDocument(value: unknown): value is SearchDocument {
  if (!isRecord(value) || !hasOnlyKeys(value, searchDocumentKeys)) return false;
  const kind = value.kind;
  const keywords = value.keywords;
  return (
    typeof value.key === "string" &&
    typeof kind === "string" &&
    searchDocumentKinds.has(kind as SearchDocumentKind) &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    (value.domain === undefined || typeof value.domain === "string") &&
    (value.subject === undefined || typeof value.subject === "string") &&
    (value.difficulty === undefined || typeof value.difficulty === "number") &&
    typeof value.locale === "string" &&
    typeof value.url === "string" &&
    value.url.startsWith("/") &&
    value.key === `${kind}:${value.url}` &&
    Array.isArray(keywords) &&
    keywords.every((keyword) => typeof keyword === "string") &&
    (value.curriculum === undefined || isSearchCurriculumLocation(value.curriculum))
  );
}

export async function fetchBaseSearchCatalog(locale: string): Promise<readonly SearchDocument[]> {
  const url = `/${locale}/search/base-catalog?schema=${publicSearchSchemaVersion}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Search catalog request failed for ${url}: ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every(isSearchDocument)) {
    throw new Error(`Search catalog response did not match the public schema for ${url}`);
  }
  return payload;
}
