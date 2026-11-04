import {
  conceptCatalog,
  isContentSearchable,
  readerCurriculumRepository,
  type ConceptEntity,
  type ContentDocument,
} from "@one-forth/content";
import { graphConceptTitle } from "./presentation";

export { layoutKnowledgeGraph } from "./layout";
export type {
  GraphLayoutEdge,
  GraphLayoutNode,
  GraphLayoutOptions,
  GraphLayoutPoint,
} from "./layout";
import {
  getRelationTypeDefinition,
  type KnowledgeRelationType,
  type RelationDirection,
  type RelationLineStyle,
} from "@one-forth/registry";

/** A reader-facing node keyed by its canonical public landing URL. */
export interface KnowledgeNode {
  readonly key: string;
  readonly title: string;
  readonly domain: string;
  readonly subject: string;
  readonly difficulty: number;
  readonly url: string;
}

export interface KnowledgeEdge {
  readonly source: string;
  readonly target: string;
  readonly type: KnowledgeRelationType;
  readonly strength: "primary" | "secondary";
  readonly direction: RelationDirection;
  readonly lineStyle: RelationLineStyle;
  readonly colorToken: string;
}

export interface KnowledgeGraph {
  readonly nodes: readonly KnowledgeNode[];
  readonly edges: readonly KnowledgeEdge[];
}

export interface KnowledgeGraphOptions {
  /** Include explicitly reader-visible preview documents while still excluding hidden content. */
  readonly includePreview?: boolean;
}

/**
 * Builds a reader-safe graph. Published content is the default; reader
 * surfaces may opt into preview documents without serializing maturity state.
 * Registry identifiers are used only while joining data server-side and never
 * appear in the result.
 */
export function buildKnowledgeGraph(
  documents: readonly ContentDocument[] = [],
  concepts: readonly ConceptEntity[] = conceptCatalog,
  locale?: ContentDocument["locale"],
  options: KnowledgeGraphOptions = {},
): KnowledgeGraph {
  const resolvedLocale = locale ?? documents[0]?.locale ?? "zh-CN";
  const readableDocuments = documents.filter(
    (document) =>
      document.locale === resolvedLocale &&
      isContentSearchable(document.frontmatter.publicationStatus, {
        includePreview: options.includePreview === true,
      }),
  );
  const documentsByConcept = new Map(
    readableDocuments.map((document) => [document.frontmatter.conceptId, document] as const),
  );
  const publicKeyByConcept = new Map<string, string>();
  const nodes: KnowledgeNode[] = [];

  for (const concept of concepts) {
    const document = documentsByConcept.get(concept.id);
    if (!document) continue;
    const title = graphConceptTitle(
      concept.id,
      document.frontmatter.shortTitle ?? concept.title[resolvedLocale] ?? concept.title["zh-CN"],
      resolvedLocale,
    );
    if (title === null) continue;
    const assignedChapter = readerCurriculumRepository.getChapterForContent(
      document.frontmatter.id,
    );
    const canonicalConceptUrl =
      assignedChapter?.id === concept.canonicalLocation.chapterId
        ? readerCurriculumRepository.resolveCanonicalLocation(
            concept.canonicalLocation,
            resolvedLocale,
          )
        : null;
    const url = canonicalConceptUrl ?? document.url;
    const key = url;
    publicKeyByConcept.set(concept.id, key);
    nodes.push({
      key,
      title,
      domain: concept.domain,
      subject: concept.subject,
      difficulty: concept.difficulty,
      url,
    });
  }

  const edges = new Map<string, KnowledgeEdge>();
  const addEdge = (
    sourceConcept: string,
    targetConcept: string,
    relationType: string,
    strength: "primary" | "secondary",
  ): void => {
    const source = publicKeyByConcept.get(sourceConcept);
    const target = publicKeyByConcept.get(targetConcept);
    if (!source || !target || source === target) return;
    const definition = getRelationTypeDefinition(relationType);
    if (!definition) return;
    const endpoints =
      definition.direction === "bidirectional" ? [source, target].sort() : [source, target];
    const edgeKey = `${endpoints[0]}\0${endpoints[1]}\0${definition.id}`;
    const existing = edges.get(edgeKey);
    if (existing?.strength === "primary" && strength === "secondary") return;
    edges.set(edgeKey, {
      source,
      target,
      type: definition.id,
      strength,
      direction: definition.direction,
      lineStyle: definition.lineStyle,
      colorToken: definition.colorToken,
    });
  };

  for (const concept of concepts) {
    if (!publicKeyByConcept.has(concept.id)) continue;
    for (const prerequisite of concept.prerequisites) {
      addEdge(prerequisite, concept.id, "prerequisite", "primary");
    }
    for (const relation of concept.relations) {
      addEdge(relation.from, relation.to, relation.type, relation.strength ?? "secondary");
    }
  }

  for (const document of readableDocuments) {
    const source = document.frontmatter.conceptId;
    for (const prerequisite of document.frontmatter.prerequisites) {
      addEdge(prerequisite, source, "prerequisite", "primary");
    }
    for (const relation of document.frontmatter.relations) {
      addEdge(source, relation.target, relation.type, relation.strength ?? "secondary");
    }
  }

  return { nodes, edges: [...edges.values()] };
}

export function hasPrerequisiteCycle(graph: KnowledgeGraph): boolean {
  const adjacency = new Map<string, string[]>();
  graph.edges
    .filter((edge) => edge.type === "prerequisite")
    .forEach((edge) => {
      adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
    });
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): boolean => {
    if (visiting.has(key)) return true;
    if (visited.has(key)) return false;
    visiting.add(key);
    for (const next of adjacency.get(key) ?? []) if (visit(next)) return true;
    visiting.delete(key);
    visited.add(key);
    return false;
  };
  return graph.nodes.some((node) => visit(node.key));
}
