import { generatedToolContexts, getGeneratedToolRecords } from "./generated-tool-index";
export { getToolCoverageSummary } from "./tool-summary";
export type { ToolCoverageSummary } from "./tool-summary";

export const toolIndexKinds = [
  "concept",
  "definition",
  "theorem",
  "example",
  "exercise",
  "equation",
  "symbol",
  "visualization",
  "resource",
  "chapter-anchor",
  "revision",
  "relation",
  "learning-path",
  "resource-usage",
] as const;

export type ToolIndexKind = (typeof toolIndexKinds)[number];

/**
 * Reader-facing, build-time projection of authored content. Registry IDs are
 * retained only as stable joins; editorial and review state never enters this
 * transport.
 */
export interface ToolIndexEntry {
  readonly id: string;
  readonly kind: ToolIndexKind;
  readonly sourceId: string;
  readonly title: string;
  readonly summary?: string;
  readonly locale: string;
  readonly documentId?: string;
  readonly conceptId?: string;
  readonly domain?: string;
  readonly subject?: string;
  readonly difficulty?: number;
  readonly estimatedMinutes?: number;
  readonly bookId?: string;
  readonly chapterId?: string;
  readonly anchorId?: string;
  readonly canonicalUrl: string;
  readonly date?: string;
  readonly revisionType?: string;
  readonly relationType?: string;
  readonly relationStrength?: "primary" | "secondary";
  readonly fromId?: string;
  readonly toId?: string;
  readonly usageClaim?: string;
}

export type GeneratedToolContext = readonly [
  locale: string,
  documentId: string | null,
  conceptId: string | null,
  domain: string | null,
  subject: string | null,
  difficulty: number | null,
  estimatedMinutes: number | null,
  bookId: string | null,
  chapterId: string | null,
  chapterUrl: string,
];

export type GeneratedToolRecord = readonly [
  kindIndex: number,
  sourceId: string,
  title: string,
  summary: string | null,
  contextIndex: number,
  anchorId: string | null,
  canonicalUrlOverride: string | null,
  date: string | null,
  revisionType: string | null,
  relationType: string | null,
  relationStrength: "primary" | "secondary" | null,
  fromId: string | null,
  toId: string | null,
  usageClaim?: string | null,
];

export interface ToolIndexFilter {
  readonly locale?: string;
  readonly kind?: ToolIndexKind | readonly ToolIndexKind[];
  readonly sourceId?: string;
}

const documentScopedKinds: ReadonlySet<ToolIndexKind> = new Set([
  "concept",
  "definition",
  "theorem",
  "example",
  "exercise",
  "chapter-anchor",
  "revision",
  "relation",
  "resource-usage",
]);

/**
 * Computes the public, document-scoped entry id. Stored document ids carry
 * the locale prefix, which is stripped so public URLs never repeat it. The
 * generation script uses this to predict the ids that readers will see.
 */
export function resolveToolIndexEntryId(
  kind: ToolIndexKind,
  locale: string,
  documentId: string | undefined,
  sourceId: string,
): string {
  const contentId = documentId?.startsWith(`${locale}/`)
    ? documentId.slice(locale.length + 1)
    : documentId;
  return documentScopedKinds.has(kind)
    ? `${kind}:${locale}:${contentId ?? "unknown"}:${sourceId}`
    : `${kind}:${locale}:${sourceId}`;
}

function expandToolIndexRecord(record: GeneratedToolRecord): ToolIndexEntry {
  const [
    kindIndex,
    sourceId,
    title,
    summary,
    contextIndex,
    anchorId,
    canonicalUrlOverride,
    date,
    revisionType,
    relationType,
    relationStrength,
    fromId,
    toId,
    usageClaim,
  ] = record;
  const kind = toolIndexKinds[kindIndex];
  const context = generatedToolContexts[contextIndex];
  if (!kind || !context) {
    throw new Error(`Invalid generated tool record: kind=${kindIndex}, context=${contextIndex}`);
  }
  const [
    locale,
    documentId,
    conceptId,
    domain,
    subject,
    difficulty,
    estimatedMinutes,
    bookId,
    chapterId,
    chapterUrl,
  ] = context;
  const id = resolveToolIndexEntryId(kind, locale, documentId ?? undefined, sourceId);
  return {
    id,
    kind,
    sourceId,
    title,
    ...(summary ? { summary } : {}),
    locale,
    ...(documentId ? { documentId } : {}),
    ...(conceptId ? { conceptId } : {}),
    ...(domain ? { domain } : {}),
    ...(subject ? { subject } : {}),
    ...(difficulty === null ? {} : { difficulty }),
    ...(estimatedMinutes === null ? {} : { estimatedMinutes }),
    ...(bookId ? { bookId } : {}),
    ...(chapterId ? { chapterId } : {}),
    ...(anchorId ? { anchorId } : {}),
    canonicalUrl: canonicalUrlOverride ?? `${chapterUrl}${anchorId ? `#${anchorId}` : ""}`,
    ...(date ? { date } : {}),
    ...(revisionType ? { revisionType } : {}),
    ...(relationType ? { relationType } : {}),
    ...(relationStrength ? { relationStrength } : {}),
    ...(fromId ? { fromId } : {}),
    ...(toId ? { toId } : {}),
    ...(usageClaim ? { usageClaim } : {}),
  } satisfies ToolIndexEntry;
}

let cachedToolIndexEntries: readonly ToolIndexEntry[] | null = null;
let recordsByIdentity: ReadonlyMap<string, GeneratedToolRecord> | null = null;

function getRecordsByIdentity(): ReadonlyMap<string, GeneratedToolRecord> {
  if (recordsByIdentity) return recordsByIdentity;
  const index = new Map<string, GeneratedToolRecord>();
  for (const record of getGeneratedToolRecords()) {
    const context = generatedToolContexts[record[4]];
    if (!context || !toolIndexKinds[record[0]]) {
      throw new Error(`Invalid generated tool record: kind=${record[0]}, context=${record[4]}`);
    }
    const key = JSON.stringify([record[0], record[1], context[0]]);
    // Document-scoped records can share a source id. Preserve the first match.
    if (!index.has(key)) index.set(key, record);
  }
  recordsByIdentity = index;
  return index;
}

/**
 * Expands the complete transport only for audits that explicitly need every
 * record. Public routes should prefer the filtered helpers below so Worker
 * startup never pays the cost of materialising the full index.
 */
export function getToolIndexEntries(): readonly ToolIndexEntry[] {
  cachedToolIndexEntries ??= getGeneratedToolRecords().map(expandToolIndexRecord);
  return cachedToolIndexEntries;
}

export function listToolIndexEntries(filter: ToolIndexFilter = {}): readonly ToolIndexEntry[] {
  const kinds = filter.kind
    ? new Set(Array.isArray(filter.kind) ? filter.kind : [filter.kind])
    : null;
  if (!filter.locale && !kinds && !filter.sourceId) return getToolIndexEntries();

  const matches: ToolIndexEntry[] = [];
  for (const record of getGeneratedToolRecords()) {
    const kind = toolIndexKinds[record[0]];
    const context = generatedToolContexts[record[4]];
    if (!kind || !context) {
      throw new Error(`Invalid generated tool record: kind=${record[0]}, context=${record[4]}`);
    }
    if (filter.locale && context[0] !== filter.locale) continue;
    if (kinds && !kinds.has(kind)) continue;
    if (filter.sourceId && record[1] !== filter.sourceId) continue;
    matches.push(expandToolIndexRecord(record));
  }
  return matches;
}

export function findToolIndexEntry(
  kind: ToolIndexKind,
  sourceId: string,
  locale = "zh-CN",
): ToolIndexEntry | null {
  const kindIndex = toolIndexKinds.indexOf(kind);
  const record = getRecordsByIdentity().get(JSON.stringify([kindIndex, sourceId, locale]));
  return record ? expandToolIndexRecord(record) : null;
}
