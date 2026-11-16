import { createHash } from "node:crypto";
import { isRecentUpdateRevision } from "../../packages/content/src/maturity.ts";
import { publicRevisionIssues } from "./public-revision.ts";
import type {
  ConceptEntity,
  EquationRecord,
  LearningPathV4,
  ResourceRecord,
  RevisionHistoryEntry,
  SymbolDefinition,
} from "../../packages/content/src/index.ts";
import { materializeCurriculum } from "../../packages/content/src/curriculum/blueprint.ts";
import {
  computerScienceSeries,
  artificialIntelligenceSeries,
} from "../../packages/content/src/curriculum/data/computer-science.ts";
import { mathematicsSeries } from "../../packages/content/src/curriculum/data/mathematics.ts";
import { physicsSeries } from "../../packages/content/src/curriculum/data/physics.ts";
import { primaryVisualizationContentOverrides } from "../../packages/content/src/curriculum/visualization-bindings.ts";
import type { ToolIndexEntry, ToolIndexKind } from "../../packages/content/src/tool-index.ts";
import type { VisualizationManifestEntry } from "../../packages/visualization/src/index.ts";
import { collectAuthoredAnchors } from "./anchor-validation.ts";
import type { LoadedContentDocument } from "./content-files.ts";

interface OpeningTag {
  readonly source: string;
  readonly start: number;
  readonly end: number;
}

interface ChapterLocation {
  readonly bookId: string;
  readonly chapterId: string;
  readonly canonicalUrl: string;
}

export interface BuildToolIndexInput {
  readonly documents: readonly LoadedContentDocument[];
  readonly concepts: readonly ConceptEntity[];
  readonly equations: readonly EquationRecord[];
  readonly symbols: readonly SymbolDefinition[];
  readonly resources: readonly ResourceRecord[];
  readonly visualizations: readonly VisualizationManifestEntry[];
  readonly learningPaths: readonly LearningPathV4[];
}

const semanticComponents = ["Definition", "Theorem", "Example", "Exercise"] as const;
type SemanticComponent = (typeof semanticComponents)[number];

const semanticKinds: Readonly<Record<SemanticComponent, ToolIndexKind>> = {
  Definition: "definition",
  Theorem: "theorem",
  Example: "example",
  Exercise: "exercise",
};

function readerVisible(document: LoadedContentDocument): boolean {
  return (
    document.frontmatter.publicationStatus === "published" ||
    document.frontmatter.publicationStatus === "preview"
  );
}

function localize(value: Readonly<Record<string, string>> | undefined, locale: string): string {
  return value?.[locale] ?? value?.["zh-CN"] ?? value?.en ?? "";
}

function openingTags(source: string, component: string): readonly OpeningTag[] {
  const tags: OpeningTag[] = [];
  for (const match of source.matchAll(new RegExp(`<${component}\\b`, "gu"))) {
    const start = match.index ?? 0;
    let quote: '"' | "'" | "`" | undefined;
    let escaped = false;
    let braceDepth = 0;
    for (let index = start + match[0].length; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = undefined;
        continue;
      }
      if (character === '"' || character === "'" || character === "`") quote = character;
      else if (character === "{") braceDepth += 1;
      else if (character === "}") braceDepth = Math.max(0, braceDepth - 1);
      else if (character === ">" && braceDepth === 0) {
        tags.push({ source: source.slice(start, index + 1), start, end: index + 1 });
        break;
      }
    }
  }
  return tags;
}

function quotedAttribute(source: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "u").exec(source);
  const value = match?.[2]?.trim();
  return value ? value : null;
}

interface ProtectedMathFragment {
  readonly marker: string;
  readonly latex: string;
  readonly display: boolean;
}

const summaryMathPattern = /\$\$([\s\S]*?)\$\$|(?<!\\)\$((?:\\.|[^$])+?)(?<!\\)\$/gu;
const summaryMathMarkerPattern = /\uE000(\d+)\uE001/gu;
const summaryCharacterBudget = 360;

function protectedMathSummary(source: string): {
  readonly text: string;
  readonly fragments: readonly ProtectedMathFragment[];
} {
  const fragments: ProtectedMathFragment[] = [];
  const text = source.replace(
    summaryMathPattern,
    (_match, displayLatex: string | undefined, inlineLatex: string | undefined) => {
      const latex = (displayLatex ?? inlineLatex ?? "").replace(/\s+/gu, " ").trim();
      if (!latex) return " ";
      const marker = `\uE000${fragments.length}\uE001`;
      fragments.push({ marker, latex, display: displayLatex !== undefined });
      return ` ${marker} `;
    },
  );
  return { text, fragments };
}

function safelyTruncatedText(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  const candidate = value.slice(0, Math.max(0, maximumLength - 1)).trimEnd();
  const lastBoundary = Math.max(
    candidate.lastIndexOf("。"),
    candidate.lastIndexOf("；"),
    candidate.lastIndexOf("，"),
    candidate.lastIndexOf(" "),
  );
  const minimumUsefulBoundary = Math.floor(candidate.length * 0.72);
  const truncated =
    lastBoundary >= minimumUsefulBoundary
      ? candidate.slice(0, lastBoundary + 1).trimEnd()
      : candidate;
  return `${truncated}…`;
}

/**
 * Creates a compact reader excerpt while protecting authored TeX as an atomic
 * unit. Display equations remain delimited so the glossary can render every
 * formula through the same accessible KaTeX/MathML primitive as article pages.
 */
export function createToolIndexTextSummary(source: string, fallback: string): string {
  const withoutCodeFences = source.replace(/```[\s\S]*?```/gu, " ");
  const protectedSummary = protectedMathSummary(withoutCodeFences);
  const normalized = protectedSummary.text
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/<[^>]+>/gu, " ")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/(^|\s)#{1,6}\s+/gu, "$1")
    .replace(/[*_]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (!normalized) return fallback;

  const tokens = normalized.split(summaryMathMarkerPattern);
  let summary = "";
  let consumed = 0;
  let truncated = false;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";
    if (index % 2 === 1) {
      const fragment = protectedSummary.fragments[Number(token)];
      if (!fragment) continue;
      const delimiter = fragment.display ? "$$" : "$";
      summary += `${delimiter}${fragment.latex}${delimiter}`;
      consumed += Math.min(fragment.latex.length, 96);
      continue;
    }

    const remaining = summaryCharacterBudget - consumed;
    if (remaining <= 0) {
      truncated = token.trim().length > 0 || index < tokens.length - 1;
      break;
    }
    if (token.length > remaining) {
      summary += safelyTruncatedText(token, remaining);
      truncated = true;
      break;
    }
    summary += token;
    consumed += token.length;
  }

  const compact = summary.replace(/\s+/gu, " ").trim();
  if (!compact) return fallback;
  return truncated && !compact.endsWith("…") ? `${compact}…` : compact;
}

interface ResourceCardReference extends OpeningTag {
  readonly resourceId: string;
}

interface ResourceCardGroup {
  readonly cards: readonly ResourceCardReference[];
  readonly start: number;
  readonly end: number;
}

export interface ResourceUsageClaimGroup {
  readonly resourceIds: readonly string[];
  readonly claim: string | null;
}

interface LevelTwoSection {
  readonly contentStart: number;
  readonly end: number;
}

const ignorableParagraphPattern = /^(?:\{\/\*[\s\S]*\*\/\}|<!--[\s\S]*-->\s*)$/u;
const nonExplanatoryParagraphPattern =
  /^(?:#{1,6}\s|[-+*]\s|\d+[.)]\s|>|```|~~~|<(?:ResourceCard|Definition|Theorem|Example|Exercise|ExerciseSolution|InteractiveFigure|TeachingFigure|PaperFigure|Equation|Proof|table)\b)/u;

function levelTwoSections(source: string): readonly LevelTwoSection[] {
  const headings = [...source.matchAll(/^##(?!#)\s+(.+?)\s*$/gmu)].map((match) => ({
    title: match[1]?.trim() ?? "",
    start: match.index ?? 0,
    contentStart: (match.index ?? 0) + match[0].length,
  }));
  return headings.map((heading, index) => ({
    contentStart: heading.contentStart,
    end: headings[index + 1]?.start ?? source.length,
  }));
}

function paragraphBlocks(source: string, start: number, end: number): readonly string[] {
  if (end <= start) return [];
  return source
    .slice(start, end)
    .split(/\r?\n[\t ]*\r?\n/gu)
    .map((block) => block.trim())
    .filter(Boolean);
}

function resourceUsageClaimFromParagraph(paragraph: string): string | null {
  const trimmed = paragraph.trim();
  if (
    !trimmed ||
    ignorableParagraphPattern.test(trimmed) ||
    nonExplanatoryParagraphPattern.test(trimmed) ||
    /<ResourceCard\b/u.test(trimmed)
  ) {
    return null;
  }
  const withoutReferenceLinks = trimmed
    .replace(/\[([^\]]+)\]\[[^\]]+\]/gu, "$1")
    .replace(/https?:\/\/[^\s)>]+/gu, "")
    .replace(/^\s*>\s?/gmu, "");
  const claim = createToolIndexTextSummary(withoutReferenceLinks, "").trim();
  return claim.length >= 6 ? claim : null;
}

function resourceCardGroups(source: string): readonly ResourceCardGroup[] {
  const cards = openingTags(source, "ResourceCard").flatMap((tag) => {
    const resourceId = quotedAttribute(tag.source, "id");
    return resourceId ? [{ ...tag, resourceId }] : [];
  });
  const groups: ResourceCardGroup[] = [];
  let active: ResourceCardReference[] = [];
  for (const card of cards) {
    const previous = active.at(-1);
    if (previous && source.slice(previous.end, card.start).trim() !== "") {
      groups.push({ cards: active, start: active[0]?.start ?? 0, end: previous.end });
      active = [];
    }
    active.push(card);
  }
  const last = active.at(-1);
  if (last) groups.push({ cards: active, start: active[0]?.start ?? 0, end: last.end });
  return groups;
}

function firstForwardUsageClaim(source: string, start: number, end: number): string | null {
  for (const paragraph of paragraphBlocks(source, start, end)) {
    if (ignorableParagraphPattern.test(paragraph)) continue;
    const claim = resourceUsageClaimFromParagraph(paragraph);
    if (claim) return claim;
  }
  return null;
}

/**
 * Extracts an explicit chapter-resource claim from authored prose. Consecutive
 * ResourceCard elements share the first explanatory paragraph that follows the
 * group and remains inside the same level-two section. A preceding paragraph
 * is never reused because it may describe an earlier card group; chapter
 * summaries and registry labels are deliberately not fallbacks.
 */
export function extractResourceUsageClaimGroups(
  source: string,
): readonly ResourceUsageClaimGroup[] {
  const groups = resourceCardGroups(source);
  const sections = levelTwoSections(source);
  return groups.map((group, index) => {
    const section = sections.find(
      (candidate) => candidate.contentStart <= group.start && group.start < candidate.end,
    );
    const forwardEnd = Math.min(
      section?.end ?? source.length,
      groups[index + 1]?.start ?? source.length,
    );
    const claim = firstForwardUsageClaim(source, group.end, forwardEnd);
    return {
      resourceIds: [...new Set(group.cards.map((card) => card.resourceId))],
      claim,
    } satisfies ResourceUsageClaimGroup;
  });
}

export function extractResourceUsageClaims(source: string): ReadonlyMap<string, string> {
  const claims = new Map<string, string>();
  for (const group of extractResourceUsageClaimGroups(source)) {
    if (!group.claim) continue;
    for (const resourceId of group.resourceIds) {
      const existing = claims.get(resourceId);
      claims.set(
        resourceId,
        existing && existing !== group.claim
          ? createToolIndexTextSummary(`${existing} ${group.claim}`, existing)
          : group.claim,
      );
    }
  }
  return claims;
}

function revisionIdentity(revision: RevisionHistoryEntry): string {
  return JSON.stringify([revision.date, revision.type, revision.summary.normalize("NFC")]);
}

/**
 * Derives revision identities from authored fields rather than array position.
 * Only exact duplicate revisions receive a local occurrence suffix, so adding
 * or reordering an unrelated revision cannot rename existing entries.
 */
export function stableRevisionSourceIds(
  revisions: readonly RevisionHistoryEntry[],
): readonly string[] {
  const occurrenceByIdentity = new Map<string, number>();
  return revisions.map((revision) => {
    const identity = revisionIdentity(revision);
    const occurrence = (occurrenceByIdentity.get(identity) ?? 0) + 1;
    occurrenceByIdentity.set(identity, occurrence);
    const digest = createHash("sha256").update(identity, "utf8").digest("hex");
    const base = `${revision.date}:${revision.type}:${digest}`;
    return occurrence === 1 ? base : `${base}:duplicate-${occurrence}`;
  });
}

export function referencedLearningPathChapterIds(path: LearningPathV4): readonly string[] {
  return [
    ...new Set([
      ...path.prerequisiteChapterIds,
      ...path.chapterIds,
      ...path.checkpoints.map((checkpoint) => checkpoint.afterChapterId),
      ...path.exercises.flatMap((exercise) => exercise.chapterIds),
    ]),
  ];
}

export function learningPathReferencesAreReaderVisible(
  path: LearningPathV4,
  readerVisibleChapterIds: ReadonlySet<string>,
): boolean {
  const chapterIds = referencedLearningPathChapterIds(path);
  return (
    chapterIds.length > 0 && chapterIds.every((chapterId) => readerVisibleChapterIds.has(chapterId))
  );
}

function semanticBody(source: string, component: SemanticComponent, tag: OpeningTag): string {
  const close = `</${component}>`;
  const end = source.indexOf(close, tag.end);
  return end < 0 ? "" : source.slice(tag.end, end);
}

function createChapterLocations(
  documents: readonly LoadedContentDocument[],
): ReadonlyMap<string, ChapterLocation> {
  const dataset = materializeCurriculum([
    mathematicsSeries,
    physicsSeries,
    computerScienceSeries,
    artificialIntelligenceSeries,
  ]);
  const seriesById = new Map(dataset.series.map((series) => [series.id, series] as const));
  const booksById = new Map(dataset.books.map((book) => [book.id, book] as const));
  const chaptersByContentId = new Map(
    dataset.chapters.flatMap((chapter) =>
      chapter.contentId ? ([[chapter.contentId, chapter]] as const) : [],
    ),
  );
  const locations = new Map<string, ChapterLocation>();
  for (const document of documents) {
    const chapter = chaptersByContentId.get(document.frontmatter.id);
    const book = chapter ? booksById.get(chapter.bookId) : undefined;
    const series = book ? seriesById.get(book.seriesId) : undefined;
    if (!chapter || !book || !series) {
      throw new Error(`Tool index cannot locate content ${document.frontmatter.id} in curriculum.`);
    }
    locations.set(document.frontmatter.id, {
      bookId: book.id,
      chapterId: chapter.id,
      canonicalUrl: `/${document.locale}/books/${series.slug}/${book.slug}/${chapter.slug}`,
    });
  }
  return locations;
}

function baseEntry(
  document: LoadedContentDocument,
  location: ChapterLocation,
): Pick<
  ToolIndexEntry,
  | "locale"
  | "documentId"
  | "conceptId"
  | "domain"
  | "subject"
  | "difficulty"
  | "estimatedMinutes"
  | "bookId"
  | "chapterId"
> {
  return {
    locale: document.locale,
    documentId: document.documentId,
    conceptId: document.frontmatter.conceptId,
    domain: document.frontmatter.domain,
    subject: document.frontmatter.subject,
    difficulty: document.frontmatter.difficulty,
    estimatedMinutes: document.frontmatter.estimatedMinutes,
    bookId: location.bookId,
    chapterId: location.chapterId,
  };
}

function entryId(
  kind: ToolIndexKind,
  locale: string,
  documentId: string,
  sourceId: string,
): string {
  return `${kind}:${locale}:${documentId}:${sourceId}`;
}

export function buildToolIndex(input: BuildToolIndexInput): readonly ToolIndexEntry[] {
  const documents = input.documents.filter(readerVisible);
  const locations = createChapterLocations(documents);
  const documentsByContentId = new Map(
    documents.map((document) => [document.frontmatter.id, document] as const),
  );
  const documentsByConceptId = new Map(
    documents.map((document) => [document.frontmatter.conceptId, document] as const),
  );
  const documentsByChapterId = new Map(
    documents.flatMap((document) => {
      const location = locations.get(document.frontmatter.id);
      return location ? ([[location.chapterId, document]] as const) : [];
    }),
  );
  const conceptsById = new Map(input.concepts.map((concept) => [concept.id, concept] as const));
  const entries = new Map<string, ToolIndexEntry>();
  const relationEdgeKeys = new Set<string>();

  const add = (entry: ToolIndexEntry): void => {
    if (entries.has(entry.id)) throw new Error(`Duplicate tool index entry ID: ${entry.id}`);
    entries.set(entry.id, entry);
  };

  for (const document of documents) {
    const location = locations.get(document.frontmatter.id);
    if (!location) continue;
    const base = baseEntry(document, location);
    add({
      id: entryId(
        "concept",
        document.locale,
        document.frontmatter.id,
        document.frontmatter.conceptId,
      ),
      kind: "concept",
      sourceId: document.frontmatter.conceptId,
      title: document.frontmatter.title,
      summary: document.frontmatter.summary,
      ...base,
      canonicalUrl: location.canonicalUrl,
    });

    for (const component of semanticComponents) {
      for (const tag of openingTags(document.body, component)) {
        const sourceId = quotedAttribute(tag.source, "id");
        if (!sourceId) continue;
        const authoredTitle = quotedAttribute(tag.source, "title");
        if (component === "Definition" && !authoredTitle?.trim()) {
          throw new Error(
            `${document.documentId} :: <Definition id="${sourceId}"> requires a public title`,
          );
        }
        const title = authoredTitle ?? sourceId;
        const kind = semanticKinds[component];
        add({
          id: entryId(kind, document.locale, document.frontmatter.id, sourceId),
          kind,
          sourceId,
          title,
          summary: createToolIndexTextSummary(semanticBody(document.body, component, tag), title),
          ...base,
          anchorId: sourceId,
          canonicalUrl: `${location.canonicalUrl}#${sourceId}`,
        });
      }
    }

    const authoredAnchors = collectAuthoredAnchors(document.body, document.documentId).anchors;
    for (const anchorId of [...authoredAnchors].sort((left, right) =>
      left.localeCompare(right, "zh-CN"),
    )) {
      add({
        id: entryId("chapter-anchor", document.locale, document.frontmatter.id, anchorId),
        kind: "chapter-anchor",
        sourceId: anchorId,
        title: anchorId,
        ...base,
        anchorId,
        canonicalUrl: `${location.canonicalUrl}#${anchorId}`,
      });
    }

    const revisionSourceIds = stableRevisionSourceIds(document.frontmatter.revisionHistory);
    const indexedRevisionIdentities = new Set<string>();
    document.frontmatter.revisionHistory.forEach((revision, index) => {
      if (!isRecentUpdateRevision(revision)) return;
      const revisionIssues = publicRevisionIssues(revision.summary);
      if (revisionIssues.length) {
        throw new Error(`${document.documentId} revision ${index}: ${revisionIssues.join(", ")}`);
      }
      const identity = revisionIdentity(revision);
      if (indexedRevisionIdentities.has(identity)) return;
      indexedRevisionIdentities.add(identity);
      const sourceId = revisionSourceIds[index];
      if (!sourceId) {
        throw new Error(
          `Tool index could not derive revision identity for ${document.documentId}.`,
        );
      }
      add({
        id: entryId("revision", document.locale, document.frontmatter.id, sourceId),
        kind: "revision",
        sourceId,
        title: document.frontmatter.title,
        summary: revision.summary,
        ...base,
        canonicalUrl: location.canonicalUrl,
        date: revision.date,
        revisionType: revision.type,
      });
    });

    const addRelation = (
      fromId: string,
      toId: string,
      relationType: string,
      strength: "primary" | "secondary",
      summary?: string,
    ): void => {
      const sourceId = `${fromId}:${relationType}:${toId}`;
      const edgeKey = `${fromId}\u0000${relationType}\u0000${toId}`;
      if (relationEdgeKeys.has(edgeKey)) return;
      const id = entryId("relation", document.locale, document.frontmatter.id, sourceId);
      if (entries.has(id)) return;
      relationEdgeKeys.add(edgeKey);
      add({
        id,
        kind: "relation",
        sourceId,
        title: `${fromId} → ${toId}`,
        ...(summary ? { summary } : {}),
        ...base,
        canonicalUrl: location.canonicalUrl,
        relationType,
        relationStrength: strength,
        fromId,
        toId,
      });
    };
    for (const prerequisite of document.frontmatter.prerequisites) {
      addRelation(prerequisite, document.frontmatter.conceptId, "prerequisite", "primary");
    }
    for (const relation of document.frontmatter.relations) {
      addRelation(
        document.frontmatter.conceptId,
        relation.target,
        relation.type,
        relation.strength ?? "secondary",
        relation.note,
      );
    }
  }

  const primaryConceptIds = new Set(documents.map((document) => document.frontmatter.conceptId));
  for (const concept of input.concepts) {
    if (primaryConceptIds.has(concept.id)) continue;
    const document = documentsByChapterId.get(concept.canonicalLocation.chapterId);
    const location = document ? locations.get(document.frontmatter.id) : undefined;
    if (!document || !location) continue;
    const anchorId = concept.canonicalLocation.anchorId;
    add({
      id: entryId("concept", document.locale, document.frontmatter.id, concept.id),
      kind: "concept",
      sourceId: concept.id,
      title: localize(concept.title, document.locale),
      summary: localize(concept.summary, document.locale),
      ...baseEntry(document, location),
      conceptId: concept.id,
      domain: concept.domain,
      subject: concept.subject,
      difficulty: concept.difficulty,
      estimatedMinutes: concept.estimatedMinutes,
      ...(anchorId ? { anchorId } : {}),
      canonicalUrl: `${location.canonicalUrl}${anchorId ? `#${anchorId}` : ""}`,
    });
  }

  // Catalog prerequisites cover secondary concepts that live inside a chapter
  // but are not the chapter's primary frontmatter concept. They are authored
  // relationships, not route-order inference, and keep the public graph from
  // silently dropping the detailed concepts exposed by the glossary.
  for (const concept of input.concepts) {
    const document = documentsByChapterId.get(concept.canonicalLocation.chapterId);
    const location = document ? locations.get(document.frontmatter.id) : undefined;
    if (!document || !location) continue;
    for (const prerequisite of concept.prerequisites) {
      if (!conceptsById.has(prerequisite)) continue;
      const relationType = "prerequisite";
      const sourceId = `${prerequisite}:${relationType}:${concept.id}`;
      const edgeKey = `${prerequisite}\u0000${relationType}\u0000${concept.id}`;
      if (relationEdgeKeys.has(edgeKey)) continue;
      relationEdgeKeys.add(edgeKey);
      add({
        id: `relation:${document.locale}:catalog:${sourceId}`,
        kind: "relation",
        sourceId,
        title: `${prerequisite} → ${concept.id}`,
        summary: "教材概念目录声明的先修关系。",
        ...baseEntry(document, location),
        conceptId: concept.id,
        domain: concept.domain,
        subject: concept.subject,
        canonicalUrl: `${location.canonicalUrl}${concept.canonicalLocation.anchorId ? `#${concept.canonicalLocation.anchorId}` : ""}`,
        relationType,
        relationStrength: "primary",
        fromId: prerequisite,
        toId: concept.id,
      });
    }
  }

  const resourceById = new Map(input.resources.map((resource) => [resource.id, resource] as const));
  const unresolvedResourceUsageClaims: string[] = [];
  const resourceUsageEntries: ToolIndexEntry[] = [];
  for (const document of documents) {
    const location = locations.get(document.frontmatter.id);
    if (!location) continue;
    const declaredResourceIds = new Set(document.frontmatter.resources);
    const claimGroups = extractResourceUsageClaimGroups(document.body);
    const claims = extractResourceUsageClaims(document.body);
    const groupedResourceIds = new Set(claimGroups.flatMap((group) => group.resourceIds));
    claimGroups.forEach((group, index) => {
      const claim = group.claim?.trim();
      let issue: string | null = null;
      const undeclared = group.resourceIds.filter(
        (resourceId) => !declaredResourceIds.has(resourceId),
      );
      if (undeclared.length > 0) {
        issue = `card is not declared in frontmatter: ${undeclared.join(", ")}`;
      } else if (!claim) issue = "no explanatory paragraph could be resolved";
      else if (claim.normalize("NFC") === document.frontmatter.summary.trim().normalize("NFC")) {
        issue = "claim repeats the chapter summary";
      } else if (
        [...group.resourceIds, document.frontmatter.id, location.chapterId].some((internalId) =>
          claim.includes(internalId),
        )
      ) {
        issue = "claim exposes an internal ID";
      }
      if (issue) {
        unresolvedResourceUsageClaims.push(
          `${document.documentId} :: ResourceCard group ${index + 1} [${group.resourceIds.join(", ")}] (${issue})`,
        );
      }
    });
    for (const resourceId of declaredResourceIds) {
      const resource = resourceById.get(resourceId);
      const claim = claims.get(resourceId)?.trim();
      if (!groupedResourceIds.has(resourceId)) {
        unresolvedResourceUsageClaims.push(
          `${document.documentId} :: ResourceCard group [${resourceId}] (frontmatter resource has no ResourceCard)`,
        );
      } else if (!resource) {
        unresolvedResourceUsageClaims.push(
          `${document.documentId} :: ResourceCard group [${resourceId}] (resource record is missing)`,
        );
      }
      if (!resource || !claim) {
        continue;
      }
      resourceUsageEntries.push({
        id: entryId("resource-usage", document.locale, document.frontmatter.id, resourceId),
        kind: "resource-usage",
        sourceId: resourceId,
        title: resource.title,
        summary: claim,
        usageClaim: claim,
        ...baseEntry(document, location),
        canonicalUrl: location.canonicalUrl,
      });
    }
  }
  if (unresolvedResourceUsageClaims.length > 0) {
    throw new Error(
      [
        `Tool index could not resolve ${unresolvedResourceUsageClaims.length} explicit ResourceCard usage group(s):`,
        ...unresolvedResourceUsageClaims.map((item) => `- ${item}`),
      ].join("\n"),
    );
  }
  for (const entry of resourceUsageEntries) add(entry);

  const resourceDocuments = new Map<string, LoadedContentDocument>();
  for (const document of documents) {
    for (const resourceId of document.frontmatter.resources) {
      if (!resourceDocuments.has(resourceId)) resourceDocuments.set(resourceId, document);
    }
  }
  // Verified further reading can be discovered from a published topic without
  // inventing a citation in its chapter. Resource-usage entries above stay citation-only.
  for (const resource of input.resources) {
    if (resourceDocuments.has(resource.id) || !resource.verifiedAt) continue;
    const topicChapterIds = new Set(
      input.concepts
        .filter((concept) => resource.topics.includes(concept.id))
        .map((concept) => concept.canonicalLocation.chapterId),
    );
    const document = documents.find((candidate) =>
      topicChapterIds.has(locations.get(candidate.frontmatter.id)?.chapterId ?? ""),
    );
    if (document) resourceDocuments.set(resource.id, document);
  }
  for (const [resourceId, document] of [...resourceDocuments].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  )) {
    const resource = resourceById.get(resourceId);
    const location = locations.get(document.frontmatter.id);
    if (!resource || !location) continue;
    add({
      id: `resource:${document.locale}:${resourceId}`,
      kind: "resource",
      sourceId: resourceId,
      title: resource.title,
      summary: localize(resource.description, document.locale) || resource.title,
      ...baseEntry(document, location),
      canonicalUrl: `/${document.locale}/resources/${resourceId}`,
    });
  }

  const visualizationById = new Map(
    input.visualizations.map((visualization) => [visualization.id, visualization] as const),
  );
  const visualizationDocuments = new Map<string, LoadedContentDocument[]>();
  for (const document of documents) {
    for (const visualizationId of document.frontmatter.visualizations) {
      visualizationDocuments.set(visualizationId, [
        ...(visualizationDocuments.get(visualizationId) ?? []),
        document,
      ]);
    }
  }
  for (const [visualizationId, candidates] of [...visualizationDocuments].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  )) {
    const visualization = visualizationById.get(visualizationId);
    const override = primaryVisualizationContentOverrides[visualizationId];
    const document =
      candidates.find((candidate) => candidate.frontmatter.id === override) ??
      [...candidates].sort((left, right) =>
        left.frontmatter.id.localeCompare(right.frontmatter.id, "en"),
      )[0];
    if (!visualization || !document) continue;
    const location = locations.get(document.frontmatter.id);
    if (!location) continue;
    add({
      id: `visualization:${document.locale}:${visualizationId}`,
      kind: "visualization",
      sourceId: visualizationId,
      title: localize(visualization.title, document.locale),
      summary: localize(visualization.description, document.locale),
      ...baseEntry(document, location),
      canonicalUrl: `/${document.locale}/playground?figure=${visualizationId}`,
    });
  }

  const equationEntries = new Map<string, ToolIndexEntry>();
  for (const equation of input.equations) {
    let document = equation.source
      ? documents.find((candidate) => candidate.documentId === equation.source?.documentId)
      : undefined;
    let anchorId: string | undefined = equation.source?.anchorId;
    if (!document) {
      document = documents.find((candidate) =>
        openingTags(candidate.body, "Equation").some(
          (tag) => quotedAttribute(tag.source, "id") === equation.id,
        ),
      );
    }
    if (document) anchorId = `equation-${equation.id}`;
    if (equation.source) anchorId = equation.source.anchorId;
    if (!document) {
      for (const topic of equation.relatedTopics) {
        document = documentsByConceptId.get(topic);
        if (document) break;
        const concept = conceptsById.get(topic);
        const contentId = concept
          ? [...locations.entries()].find(
              ([, location]) => location.chapterId === concept.canonicalLocation.chapterId,
            )?.[0]
          : undefined;
        document = contentId ? documentsByContentId.get(contentId) : undefined;
        if (document) {
          anchorId = concept?.canonicalLocation.anchorId;
          break;
        }
      }
    }
    if (!document) continue;
    const location = locations.get(document.frontmatter.id);
    if (!location) continue;
    const canonicalUrl = `${location.canonicalUrl}${anchorId ? `#${anchorId}` : ""}`;
    const entry: ToolIndexEntry = {
      id: `equation:${document.locale}:${equation.id}`,
      kind: "equation",
      sourceId: equation.id,
      title: localize(equation.name, document.locale),
      summary: equation.latex,
      ...baseEntry(document, location),
      ...(anchorId ? { anchorId } : {}),
      canonicalUrl,
    };
    add(entry);
    equationEntries.set(equation.id, entry);
  }

  for (const symbol of input.symbols) {
    const equation = input.equations.find((candidate) =>
      candidate.variables.some((variable) => variable.symbolId === symbol.id),
    );
    const equationEntry = equation ? equationEntries.get(equation.id) : undefined;
    const primarySymbolLocation = symbol.locations[0];
    let document = primarySymbolLocation
      ? documents.find((candidate) => candidate.documentId === primarySymbolLocation.documentId)
      : equationEntry?.documentId
        ? documents.find((candidate) => candidate.documentId === equationEntry.documentId)
        : undefined;
    if (!document) {
      document = documents.find((candidate) =>
        candidate.frontmatter.symbolNamespaces.includes(symbol.namespace),
      );
    }
    if (!document) continue;
    const location = locations.get(document.frontmatter.id);
    if (!location) continue;
    add({
      id: `symbol:${document.locale}:${symbol.id}`,
      kind: "symbol",
      sourceId: symbol.id,
      title: `${symbol.plainText} · ${localize(symbol.meaning, document.locale)}`,
      summary: symbol.latex,
      ...baseEntry(document, location),
      ...(primarySymbolLocation?.anchorId
        ? { anchorId: primarySymbolLocation.anchorId }
        : equationEntry?.anchorId
          ? { anchorId: equationEntry.anchorId }
          : {}),
      canonicalUrl: primarySymbolLocation
        ? `${location.canonicalUrl}#${primarySymbolLocation.anchorId}`
        : (equationEntry?.canonicalUrl ?? location.canonicalUrl),
    });
  }

  const readerVisibleChapterIds = new Set(documentsByChapterId.keys());
  for (const path of input.learningPaths) {
    if (!learningPathReferencesAreReaderVisible(path, readerVisibleChapterIds)) continue;
    const firstChapterId = path.chapterIds[0];
    const first = firstChapterId
      ? [...locations.entries()].find(([, location]) => location.chapterId === firstChapterId)
      : undefined;
    if (!first) continue;
    const [contentId, location] = first;
    const document = documentsByContentId.get(contentId);
    if (!document) continue;
    add({
      id: `learning-path:${document.locale}:${path.id}`,
      kind: "learning-path",
      sourceId: path.id,
      title: localize(path.title, document.locale),
      summary: localize(path.summary, document.locale),
      ...baseEntry(document, location),
      canonicalUrl: `/${document.locale}/paths/${path.id}`,
    });
  }

  return [...entries.values()].sort(
    (left, right) =>
      left.locale.localeCompare(right.locale, "en") ||
      left.kind.localeCompare(right.kind, "en") ||
      left.id.localeCompare(right.id, "en"),
  );
}
