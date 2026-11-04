import {
  equations,
  readerCurriculumRepository,
  resources,
  symbols,
  type ContentDocument,
  type EquationRecord,
  type ResourceRecord,
  type SymbolDefinition,
} from "@one-forth/content";
import {
  findToolIndexEntry,
  listToolIndexEntries,
  type ToolIndexEntry,
} from "@one-forth/content/tool-index";
import type { SupportedLocale } from "@one-forth/config";
import { localize } from "@one-forth/registry";

export interface ReferenceLocation {
  readonly url: string;
  readonly label: string;
  readonly chapterId: string;
  readonly precision: "equation" | "concept" | "chapter";
}

export interface PublicEquationReference {
  readonly equation: EquationRecord;
  readonly location: ReferenceLocation;
}

export interface PublicSymbolReference {
  readonly symbol: SymbolDefinition;
  readonly location: ReferenceLocation;
  readonly locations: readonly ReferenceLocation[];
  readonly domain?: string;
  readonly subject?: string;
}

export interface PublicResourceUsage {
  readonly chapterId: string;
  readonly url: string;
  readonly label: string;
  readonly claim: string;
  readonly domain: string;
  readonly subject: string;
}

function entryLocation(
  entry: ToolIndexEntry,
  locale: SupportedLocale,
  precision: ReferenceLocation["precision"],
): ReferenceLocation | null {
  if (!entry.chapterId) return null;
  const context = readerCurriculumRepository.getChapterContext(entry.chapterId, locale);
  if (!context) return null;
  return {
    url: entry.canonicalUrl,
    label: `${context.book.code} · ${localize(context.chapter.title, locale)}`,
    chapterId: entry.chapterId,
    precision,
  };
}

export function resolveConceptReferenceLocation(
  conceptId: string,
  locale: SupportedLocale,
): ReferenceLocation | null {
  const entry = findToolIndexEntry("concept", conceptId, locale);
  return entry ? entryLocation(entry, locale, "concept") : null;
}

export function resolveEquationReferenceLocation(
  equationOrId: EquationRecord | string,
  _documents: readonly ContentDocument[],
  locale: SupportedLocale,
): ReferenceLocation | null {
  const id = typeof equationOrId === "string" ? equationOrId : equationOrId.id;
  const entry = findToolIndexEntry("equation", id, locale);
  return entry ? entryLocation(entry, locale, entry.anchorId ? "equation" : "concept") : null;
}

export function resolveSymbolReferenceLocation(
  symbolOrId: SymbolDefinition | string,
  _documents: readonly ContentDocument[],
  locale: SupportedLocale,
): ReferenceLocation | null {
  const id = typeof symbolOrId === "string" ? symbolOrId : symbolOrId.id;
  const entry = findToolIndexEntry("symbol", id, locale);
  return entry ? entryLocation(entry, locale, entry.anchorId ? "equation" : "chapter") : null;
}

export async function listPublicEquationReferences(
  locale: SupportedLocale,
): Promise<readonly PublicEquationReference[]> {
  const equationById = new Map(equations.map((equation) => [equation.id, equation] as const));
  return listToolIndexEntries({ locale, kind: "equation" }).flatMap((entry) => {
    const equation = equationById.get(entry.sourceId);
    const location = entryLocation(entry, locale, entry.anchorId ? "equation" : "concept");
    return equation && location ? [{ equation, location }] : [];
  });
}

export async function listPublicSymbolReferences(
  locale: SupportedLocale,
): Promise<readonly PublicSymbolReference[]> {
  const symbolById = new Map(symbols.map((symbol) => [symbol.id, symbol] as const));
  const anchorByDocumentAndId = new Map(
    listToolIndexEntries({ locale, kind: "chapter-anchor" }).flatMap((entry) =>
      entry.documentId ? ([[`${entry.documentId}\0${entry.sourceId}`, entry]] as const) : [],
    ),
  );
  return listToolIndexEntries({ locale, kind: "symbol" }).flatMap((entry) => {
    const symbol = symbolById.get(entry.sourceId);
    const authoredLocations = symbol
      ? [
          ...new Map(
            symbol.locations.map(
              (source) => [`${source.documentId}\0${source.anchorId}`, source] as const,
            ),
          ).values(),
        ]
      : [];
    const locations = symbol
      ? authoredLocations
          .flatMap((source) => {
            const anchor = anchorByDocumentAndId.get(`${source.documentId}\0${source.anchorId}`);
            const location =
              anchor && anchor.chapterId === source.chapterId
                ? entryLocation(anchor, locale, "equation")
                : null;
            return location ? [location] : [];
          })
          .filter(
            (location, index, candidates) =>
              candidates.findIndex((candidate) => candidate.url === location.url) === index,
          )
      : [];
    if (symbol && locations.length !== authoredLocations.length) {
      throw new Error(
        `Symbol ${symbol.id} has ${authoredLocations.length - locations.length} public source location(s) that could not be resolved to a real chapter anchor.`,
      );
    }
    const fallbackLocation = entryLocation(entry, locale, entry.anchorId ? "equation" : "chapter");
    const publicLocations =
      authoredLocations.length > 0 ? locations : fallbackLocation ? [fallbackLocation] : [];
    const location = publicLocations[0];
    return symbol && location
      ? [
          {
            symbol,
            location,
            locations: publicLocations,
            ...(entry.domain ? { domain: entry.domain } : {}),
            ...(entry.subject ? { subject: entry.subject } : {}),
          },
        ]
      : [];
  });
}

export async function listPublicResources(
  locale: SupportedLocale,
): Promise<readonly ResourceRecord[]> {
  const indexedIds = new Set(
    listToolIndexEntries({ locale, kind: "resource" }).map((entry) => entry.sourceId),
  );
  return resources.filter((resource) => indexedIds.has(resource.id));
}

export async function findPublicResource(
  id: string,
  locale: SupportedLocale,
): Promise<ResourceRecord | null> {
  if (!findToolIndexEntry("resource", id, locale)) return null;
  return resources.find((resource) => resource.id === id) ?? null;
}

export async function listPublicResourceUsages(
  id: string,
  locale: SupportedLocale,
): Promise<readonly PublicResourceUsage[]> {
  if (!findToolIndexEntry("resource", id, locale)) return [];
  return listToolIndexEntries({ locale, kind: "resource-usage", sourceId: id })
    .map((entry) => {
      const context = entry.chapterId
        ? readerCurriculumRepository.getChapterContext(entry.chapterId, locale)
        : null;
      if (!context || !entry.usageClaim || !entry.domain || !entry.subject) {
        throw new Error(`Resource usage ${entry.id} is missing its public chapter or claim data.`);
      }
      return {
        chapterId: context.chapter.id,
        url: entry.canonicalUrl,
        label: `${context.book.code} · 第 ${context.chapterNumber} 章 ${localize(context.chapter.title, locale)}`,
        claim: entry.usageClaim,
        domain: entry.domain,
        subject: entry.subject,
      } satisfies PublicResourceUsage;
    })
    .sort((left, right) => left.label.localeCompare(right.label, locale));
}
