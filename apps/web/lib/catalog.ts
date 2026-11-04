import {
  readerContentRepository,
  readerCurriculumRepository,
  resources,
  type ContentDocument,
} from "@one-forth/content";
import { listToolIndexEntries, type ToolIndexEntry } from "@one-forth/content/tool-index";
import {
  createPublicSearchKey,
  createSearchCurriculumLocation,
  type SearchDocument,
  type SearchDocumentKind,
} from "@one-forth/search";

const searchableToolIndexKinds = [
  "concept",
  "theorem",
  "learning-path",
  "resource",
  "equation",
  "symbol",
  "visualization",
] as const;

function uniqueKeywords(values: readonly (string | undefined)[]): readonly string[] {
  return [
    ...new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value)),
  ];
}

function resourceSearchKind(sourceId: string): SearchDocumentKind {
  const resource = resources.find((candidate) => candidate.id === sourceId);
  if (!resource) {
    throw new Error(`Tool index resource ${sourceId} is missing registry metadata`);
  }
  return resource.kind === "paper" ? "paper" : resource.kind === "book" ? "book" : "article";
}

function toolSearchKind(entry: ToolIndexEntry, isPrimaryConcept: boolean): SearchDocumentKind {
  switch (entry.kind) {
    case "concept":
      return isPrimaryConcept ? "article" : "concept";
    case "theorem":
      return "theorem";
    case "learning-path":
      return "learning-path";
    case "resource":
      return resourceSearchKind(entry.sourceId);
    case "equation":
      return "equation";
    case "symbol":
      return "symbol";
    case "visualization":
      return "experiment";
    default:
      throw new Error(`Unsupported search tool index kind: ${entry.kind}`);
  }
}

function toolSearchUrl(
  entry: ToolIndexEntry,
  locale: "zh-CN" | "en",
  isPrimaryConcept: boolean,
): string {
  if (entry.kind === "concept" && !isPrimaryConcept) {
    return `/${locale}/glossary?entry=${encodeURIComponent(entry.id)}#glossary-${entry.id}`;
  }
  if (entry.kind === "equation") {
    return `/${locale}/equations?equation=${encodeURIComponent(entry.sourceId)}#${entry.sourceId}`;
  }
  if (entry.kind === "symbol") {
    return `/${locale}/symbols?symbol=${encodeURIComponent(entry.sourceId)}#symbol-${entry.sourceId}`;
  }
  return entry.canonicalUrl;
}

function toolCurriculum(entry: ToolIndexEntry, locale: "zh-CN" | "en") {
  if (!entry.chapterId) return undefined;
  const context = readerCurriculumRepository.getChapterContext(entry.chapterId, locale);
  return context ? createSearchCurriculumLocation(context, locale) : undefined;
}

function toolIndexSearchDocuments(
  locale: "zh-CN" | "en",
  documents: readonly ContentDocument[],
  concepts: Awaited<ReturnType<typeof readerContentRepository.listConcepts>>,
): readonly SearchDocument[] {
  const documentsByToolId = new Map<string, ContentDocument>(
    documents.map((document) => [`${locale}/${document.frontmatter.id}`, document] as const),
  );
  const conceptsById = new Map(concepts.map((concept) => [concept.id, concept] as const));
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource] as const));

  return listToolIndexEntries({ locale, kind: searchableToolIndexKinds }).map((entry) => {
    const document = entry.documentId ? documentsByToolId.get(entry.documentId) : undefined;
    const concept = conceptsById.get(entry.sourceId);
    const resource = entry.kind === "resource" ? resourcesById.get(entry.sourceId) : undefined;
    const isPrimaryConcept =
      entry.kind === "concept" && document?.frontmatter.conceptId === entry.sourceId;
    const kind = toolSearchKind(entry, isPrimaryConcept);
    const url = toolSearchUrl(entry, locale, isPrimaryConcept);
    const curriculum = toolCurriculum(entry, locale);
    const keywords = uniqueKeywords([
      entry.sourceId,
      ...(document?.frontmatter.tags ?? []),
      ...(document?.frontmatter.aliases ?? []),
      ...(concept?.aliases.flatMap((alias) => Object.values(alias)) ?? []),
      ...(resource?.authors ?? []),
      resource?.publisher,
      curriculum?.seriesTitle,
      curriculum?.bookCode,
      curriculum?.bookTitle,
      curriculum?.partTitle,
      curriculum?.chapterTitle,
    ]);
    return {
      key: createPublicSearchKey(kind, url),
      kind,
      title: entry.title,
      summary: entry.summary ?? entry.title,
      ...(entry.domain ? { domain: entry.domain } : {}),
      ...(entry.subject ? { subject: entry.subject } : {}),
      ...(entry.difficulty === undefined ? {} : { difficulty: entry.difficulty }),
      ...(curriculum ? { curriculum } : {}),
      locale,
      url,
      keywords,
    } satisfies SearchDocument;
  });
}

/** Builds the reader-facing catalog without exposing raw editorial state. */
export async function createSearchCatalog(locale = "zh-CN"): Promise<readonly SearchDocument[]> {
  const normalizedLocale = locale === "en" ? "en" : "zh-CN";
  const [readerDocuments, readerConcepts] = await Promise.all([
    readerContentRepository.listDocuments({ locale: normalizedLocale }),
    readerContentRepository.listConcepts(),
  ]);
  const indexedDocuments = toolIndexSearchDocuments(
    normalizedLocale,
    readerDocuments,
    readerConcepts,
  );

  const catalog = new Map<string, SearchDocument>();
  for (const document of indexedDocuments) {
    catalog.set(document.key, document);
  }
  return [...catalog.values()];
}
