import { getGeneratedGraphLayout } from "@one-forth/content/graph-layout";
import { listToolIndexEntries } from "@one-forth/content/tool-index";
import { siteConfig } from "@one-forth/config";
import { presentGraphConcepts } from "@one-forth/knowledge-graph/presentation";
import type { KnowledgeRelationType } from "@one-forth/registry";
import { getRelationTypeDefinition } from "@one-forth/registry";
import {
  GraphExplorer,
  type GraphExplorerEdgeTuple,
  type GraphExplorerNodeTuple,
} from "@/components/graph-explorer";
import { firstSearchParam, parsePositivePage, type IndexSearchParams } from "@/lib/index-query";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "知识图谱",
  description: `按学科、难度和关系类型探索 ${siteConfig.name} 的知识结构。`,
  path: "/zh-CN/graph",
});

interface GraphPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en" }>;
  readonly searchParams: Promise<IndexSearchParams>;
}

/**
 * Compact, RSC-friendly projection of the public graph. Nodes and edges are
 * tuples; enum-like fields are indices into the lookup tables shipped once
 * alongside them. Node coordinates come from the precomputed deterministic
 * layout (-1 when a node is missing from the generated artifact, in which
 * case the client falls back to its spiral placement).
 */
export interface ToolKnowledgeGraph {
  readonly nodes: readonly GraphExplorerNodeTuple[];
  readonly edges: readonly GraphExplorerEdgeTuple[];
  readonly domains: readonly string[];
  readonly subjects: readonly string[];
  readonly relationTypes: readonly KnowledgeRelationType[];
}

// The graph depends only on the generated content artifacts, which are fixed
// for a deployment, so each locale is assembled at most once per process.
const graphCache = new Map<string, ToolKnowledgeGraph>();

export function buildToolKnowledgeGraph(locale: "zh-CN" | "en"): ToolKnowledgeGraph {
  const cached = graphCache.get(locale);
  if (cached) return cached;

  const conceptEntries = presentGraphConcepts(
    listToolIndexEntries({ locale, kind: "concept" }),
    locale,
  );
  const keyByConceptId = new Map(
    conceptEntries.map((entry) => [entry.sourceId, entry.id] as const),
  );
  const layout = getGeneratedGraphLayout(locale);
  const domains: string[] = [];
  const domainIndexById = new Map<string, number>();
  const subjects: string[] = [];
  const subjectIndexById = new Map<string, number>();
  const indexOf = <T extends string>(value: T, table: T[], indexById: Map<T, number>): number => {
    const existing = indexById.get(value);
    if (existing !== undefined) return existing;
    const index = table.length;
    table.push(value);
    indexById.set(value, index);
    return index;
  };

  const nodes: GraphExplorerNodeTuple[] = conceptEntries.map((entry) => {
    const point = layout?.[entry.id];
    return [
      entry.title,
      indexOf(entry.domain ?? "interdisciplinary", domains, domainIndexById),
      indexOf(entry.subject ?? "general", subjects, subjectIndexById),
      entry.difficulty ?? 1,
      entry.canonicalUrl,
      point?.[0] ?? -1,
      point?.[1] ?? -1,
    ];
  });
  // Node identity on the client is the tuple index, so the long public entry
  // ids never enter the payload; they are still needed here to resolve edge
  // endpoints and join the generated layout.
  const indexByKey = new Map(conceptEntries.map((entry, index) => [entry.id, index] as const));

  const relationTypes: KnowledgeRelationType[] = [];
  const typeIndexById = new Map<KnowledgeRelationType, number>();
  const edgeById = new Map<string, GraphExplorerEdgeTuple>();
  const strengthByEdgeId = new Map<string, "primary" | "secondary">();
  for (const entry of listToolIndexEntries({ locale, kind: "relation" })) {
    const source = entry.fromId ? keyByConceptId.get(entry.fromId) : undefined;
    const target = entry.toId ? keyByConceptId.get(entry.toId) : undefined;
    const definition = entry.relationType
      ? getRelationTypeDefinition(entry.relationType)
      : undefined;
    if (!source || !target || source === target || !definition) continue;
    const endpoints =
      definition.direction === "bidirectional" ? [source, target].sort() : [source, target];
    const edgeId = `${endpoints[0]}\0${endpoints[1]}\0${definition.id}`;
    const sourceIndex = indexByKey.get(source);
    const targetIndex = indexByKey.get(target);
    if (sourceIndex === undefined || targetIndex === undefined) continue;
    // A primary relation already recorded for this endpoint pair wins over a
    // secondary duplicate; mirror the dedupe used for the generated layout.
    if (
      strengthByEdgeId.get(edgeId) === "primary" &&
      (entry.relationStrength ?? "secondary") === "secondary"
    ) {
      continue;
    }
    const typeIndex = indexOf(definition.id, relationTypes, typeIndexById);
    edgeById.set(edgeId, [
      sourceIndex,
      targetIndex,
      typeIndex,
      (entry.relationStrength ?? "secondary") === "primary" ? 1 : 0,
    ]);
    strengthByEdgeId.set(edgeId, entry.relationStrength ?? "secondary");
  }
  const graph: ToolKnowledgeGraph = {
    nodes,
    edges: [...edgeById.values()],
    domains,
    subjects,
    relationTypes,
  };
  graphCache.set(locale, graph);
  return graph;
}

export default async function GraphPage({ params, searchParams }: GraphPageProps) {
  const [{ locale }, queryParams] = await Promise.all([params, searchParams]);
  const graph = buildToolKnowledgeGraph(locale);
  const requestedDifficulty = Number.parseInt(firstSearchParam(queryParams.difficulty), 10);
  const maximumDifficulty =
    Number.isSafeInteger(requestedDifficulty) &&
    requestedDifficulty >= 1 &&
    requestedDifficulty <= 5
      ? requestedDifficulty
      : 5;
  const requestedRelation = firstSearchParam(queryParams.relation);
  const relation = requestedRelation ? getRelationTypeDefinition(requestedRelation)?.id : undefined;
  const requestedDomain = firstSearchParam(queryParams.domain);
  const domain = graph.domains.includes(requestedDomain) ? requestedDomain : "";
  const requestedSubject = firstSearchParam(queryParams.subject);
  const subject =
    graph.subjects.includes(requestedSubject) &&
    graph.nodes.some(
      (node) =>
        graph.subjects[node[2]] === requestedSubject &&
        (!domain || graph.domains[node[1]] === domain),
    )
      ? requestedSubject
      : "";
  return (
    <main id="main-content" className="graph-page">
      <header className="index-page__header">
        <h1>知识图谱</h1>
      </header>
      <GraphExplorer
        nodes={graph.nodes}
        edges={graph.edges}
        domains={graph.domains}
        subjects={graph.subjects}
        relationTypes={graph.relationTypes}
        locale={locale}
        initialFilters={{
          query: firstSearchParam(queryParams.q),
          domain,
          subject,
          ...(relation ? { relation } : {}),
          maximumDifficulty,
          page: parsePositivePage(queryParams.page),
        }}
      />
    </main>
  );
}
