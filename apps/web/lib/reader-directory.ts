import {
  readerConceptById,
  readerCurriculumRepository,
  type DiscoverableLearningPath,
  type ResourceRecord,
  type CurriculumChapterContext,
} from "@one-forth/content";
import { domainRegistry } from "@one-forth/registry";

export const directoryDomains = domainRegistry
  .list()
  .slice()
  .sort((a, b) => a.order - b.order);

export function resourceDomains(resource: ResourceRecord): readonly string[] {
  return [...new Set(resource.topics.flatMap((id) => readerConceptById.get(id)?.domains ?? []))];
}

export function pathDomain(path: DiscoverableLearningPath): string | undefined {
  const counts = new Map<string, number>();
  for (const id of path.conceptIds) {
    const domain = readerConceptById.get(id)?.domain;
    if (domain) counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function briefResourceSource(resource: ResourceRecord): string {
  return [
    resource.publisher ?? resource.venue ?? resource.authors?.slice(0, 2).join(", "),
    resource.year,
  ]
    .filter(Boolean)
    .join(" · ");
}

const bookOrder = new Map(
  readerCurriculumRepository
    .listSeries()
    .flatMap((series) => series.bookIds)
    .map((id, index) => [id, index] as const),
);

interface ResourcePlacement {
  readonly context: CurriculumChapterContext;
  readonly domain: string;
}
const placementCache = new WeakMap<ResourceRecord, Map<string, ResourcePlacement | undefined>>();

export function resourcePlacement(
  resource: ResourceRecord,
  domain = "",
): ResourcePlacement | undefined {
  const cached = placementCache.get(resource);
  if (cached?.has(domain)) return cached.get(domain);
  const placement = resource.topics
    .flatMap((id) => {
      const concept = readerConceptById.get(id);
      if (!concept || (domain && !concept.domains.includes(domain))) return [];
      const context = readerCurriculumRepository.getChapterContext(
        concept.canonicalLocation.chapterId,
        "zh-CN",
      );
      return context ? [{ context, domain: concept.domain }] : [];
    })
    .sort(
      (a, b) =>
        (domainRegistry.get(a.domain)?.order ?? 999) -
          (domainRegistry.get(b.domain)?.order ?? 999) ||
        (bookOrder.get(a.context.book.id) ?? 999) - (bookOrder.get(b.context.book.id) ?? 999) ||
        a.context.chapterNumber - b.context.chapterNumber,
    )[0];
  const cache = cached ?? new Map<string, ResourcePlacement | undefined>();
  cache.set(domain, placement);
  placementCache.set(resource, cache);
  return placement;
}

export function compareResourceTopics(left: ResourceRecord, right: ResourceRecord, domain = "") {
  const a = resourcePlacement(left, domain),
    b = resourcePlacement(right, domain);
  return (
    (domainRegistry.get(a?.domain ?? "")?.order ?? 999) -
      (domainRegistry.get(b?.domain ?? "")?.order ?? 999) ||
    (bookOrder.get(a?.context.book.id ?? "") ?? 999) -
      (bookOrder.get(b?.context.book.id ?? "") ?? 999)
  );
}

export function compareLearningPaths(a: DiscoverableLearningPath, b: DiscoverableLearningPath) {
  return (
    Number(b.routeKind === "series") - Number(a.routeKind === "series") ||
    (bookOrder.get(a.sections[0]?.bookId ?? "") ?? 999) -
      (bookOrder.get(b.sections[0]?.bookId ?? "") ?? 999) ||
    a.estimatedHours - b.estimatedHours
  );
}
