import { conceptCatalog, contentRepository } from "@one-forth/content";
import { describe, expect, it } from "vitest";
import { buildKnowledgeGraph, hasPrerequisiteCycle } from "./index";

const forbiddenPublicKeys = new Set([
  "id",
  "conceptId",
  "chapterId",
  "bookId",
  "partId",
  "seriesId",
  "publicationStatus",
  "editorialStatus",
  "maturity",
  "status",
  "hasDocument",
]);

function collectKeys(value: unknown, keys = new Set<string>()): ReadonlySet<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (typeof value !== "object" || value === null) return keys;
  for (const [key, nested] of Object.entries(value)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
  return keys;
}

describe("knowledge graph", () => {
  it("detects prerequisite cycles using public node keys", () => {
    expect(
      hasPrerequisiteCycle({
        nodes: [
          {
            key: "/a",
            title: "A",
            domain: "math",
            subject: "x",
            difficulty: 1,
            url: "/a",
          },
          {
            key: "/b",
            title: "B",
            domain: "math",
            subject: "x",
            difficulty: 1,
            url: "/b",
          },
        ],
        edges: [
          {
            source: "/a",
            target: "/b",
            type: "prerequisite",
            strength: "primary",
            direction: "directed",
            lineStyle: "solid",
            colorToken: "relation-prerequisite",
          },
          {
            source: "/b",
            target: "/a",
            type: "prerequisite",
            strength: "primary",
            direction: "directed",
            lineStyle: "solid",
            colorToken: "relation-prerequisite",
          },
        ],
      }),
    ).toBe(true);
  });

  it("contains only concepts with published document landings", async () => {
    const documents = await contentRepository.listDocuments({ locale: "zh-CN" });
    const selected = documents
      .filter((document) => ["vectors", "matrices"].includes(document.frontmatter.conceptId))
      .map((document) => ({
        ...document,
        frontmatter: { ...document.frontmatter, publicationStatus: "published" as const },
      }));
    expect(selected).toHaveLength(2);

    const graph = buildKnowledgeGraph(selected, conceptCatalog, "zh-CN");
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.every((node) => node.key === node.url)).toBe(true);
    expect(graph.nodes.some((node) => node.title === "Transformer")).toBe(false);

    const vectorUrl = selected.find(
      (document) => document.frontmatter.conceptId === "vectors",
    )?.url;
    const matrixUrl = selected.find(
      (document) => document.frontmatter.conceptId === "matrices",
    )?.url;
    expect(vectorUrl).toBeTruthy();
    expect(matrixUrl).toBeTruthy();
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        source: vectorUrl,
        target: matrixUrl,
        type: "prerequisite",
      }),
    );
    expect(hasPrerequisiteCycle(graph)).toBe(false);
  });

  it("never serializes registry identifiers or editorial state", async () => {
    const documents = await contentRepository.listDocuments({ locale: "zh-CN" });
    const selected = documents.slice(0, 3).map((document) => ({
      ...document,
      frontmatter: { ...document.frontmatter, publicationStatus: "published" as const },
    }));
    const graph = buildKnowledgeGraph(selected, conceptCatalog, "zh-CN");
    const exposedKeys = collectKeys(graph);
    for (const forbidden of forbiddenPublicKeys) {
      expect(exposedKeys.has(forbidden), forbidden).toBe(false);
    }
  });

  it("returns an empty public graph when no document is published", async () => {
    const documents = await contentRepository.listDocuments({ locale: "zh-CN" });
    const previews = documents.map((document) => ({
      ...document,
      frontmatter: { ...document.frontmatter, publicationStatus: "preview" as const },
    }));
    const graph = buildKnowledgeGraph(previews, conceptCatalog, "zh-CN");
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it("includes preview documents only when a reader surface opts in", async () => {
    const documents = await contentRepository.listDocuments({ locale: "zh-CN" });
    const authoredDocument = documents.find(
      (document) => document.frontmatter.conceptId === "gradient",
    );
    expect(authoredDocument).toBeTruthy();
    if (!authoredDocument) return;
    const preview = {
      ...authoredDocument,
      frontmatter: {
        ...authoredDocument.frontmatter,
        publicationStatus: "preview" as const,
      },
    };

    const defaultGraph = buildKnowledgeGraph([preview], conceptCatalog, "zh-CN");
    const readerGraph = buildKnowledgeGraph([preview], conceptCatalog, "zh-CN", {
      includePreview: true,
    });

    expect(defaultGraph.nodes).toEqual([]);
    expect(readerGraph.nodes).toHaveLength(1);
    expect(readerGraph.nodes[0]?.url).toContain(preview.url);
    expect(collectKeys(readerGraph).has("publicationStatus")).toBe(false);
  });
});
