import { describe, expect, it } from "vitest";
import {
  conceptCatalog,
  curriculumData,
  equations,
  learningPaths,
  readerContentRepository,
  resources,
  symbols,
} from "./index";
import {
  findToolIndexEntry,
  getToolIndexEntries,
  listToolIndexEntries,
  type ToolIndexKind,
} from "./tool-index";
import { getToolCoverageSummary } from "./tool-summary";
import { supplementalResources } from "./supplemental-resources";

describe("reader tool index", () => {
  it("keeps the first document-scoped match and isolates lookup locales", () => {
    const firstEntries = new Map<string, ReturnType<typeof getToolIndexEntries>[number]>();
    let repeated = 0;
    for (const entry of getToolIndexEntries()) {
      const key = JSON.stringify([entry.kind, entry.sourceId, entry.locale]);
      const first = firstEntries.get(key);
      if (first) {
        if (repeated < 10) {
          expect(findToolIndexEntry(entry.kind, entry.sourceId, entry.locale)).toEqual(first);
        }
        repeated += 1;
      } else {
        firstEntries.set(key, entry);
      }
    }
    expect(repeated).toBeGreaterThan(0);
    expect(findToolIndexEntry("equation", "not-an-equation", "zh-CN")).toBeNull();
    const equation = listToolIndexEntries({ kind: "equation", locale: "zh-CN" })[0];
    expect(equation).toBeDefined();
    if (equation) {
      expect(findToolIndexEntry("equation", equation.sourceId, "zh-CN")).toEqual(equation);
      expect(findToolIndexEntry("equation", equation.sourceId, "unsupported-locale")).toBeNull();
    }
  });

  it("makes verified further reading discoverable without inventing chapter citations", () => {
    const catalog = listToolIndexEntries({ locale: "zh-CN", kind: "resource" });
    const citations = listToolIndexEntries({ locale: "zh-CN", kind: "resource-usage" });
    for (const resource of supplementalResources) {
      expect(
        catalog.some((entry) => entry.sourceId === resource.id),
        resource.id,
      ).toBe(true);
      expect(
        citations.some((entry) => entry.sourceId === resource.id),
        resource.id,
      ).toBe(false);
      expect(
        resource.topics.every((id) => conceptCatalog.some((concept) => concept.id === id)),
        resource.id,
      ).toBe(true);
    }
  });
  it("covers the complete reader-facing reference system", async () => {
    const count = (kind: ToolIndexKind): number =>
      listToolIndexEntries({ locale: "zh-CN", kind }).length;
    const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
    const referencedVisualizations = new Set(
      documents.flatMap((document) => document.frontmatter.visualizations),
    );

    expect(count("concept")).toBe(conceptCatalog.length);
    expect(count("equation")).toBe(equations.length);
    expect(count("symbol")).toBe(symbols.length);
    expect(count("visualization")).toBe(referencedVisualizations.size);
    expect(count("resource")).toBe(resources.length);
    expect(count("learning-path")).toBe(learningPaths.length);
    expect(count("definition")).toBeGreaterThanOrEqual(288);
    expect(count("example")).toBeGreaterThanOrEqual(576);
    expect(count("exercise")).toBeGreaterThanOrEqual(864);

    const glossaryBookIds = new Set(
      listToolIndexEntries({ locale: "zh-CN", kind: ["concept", "definition"] })
        .map((entry) => entry.bookId)
        .filter((bookId): bookId is string => Boolean(bookId)),
    );
    expect(
      curriculumData.books.map((book) => book.id).filter((bookId) => !glossaryBookIds.has(bookId)),
    ).toEqual([]);

    const summary = getToolCoverageSummary("zh-CN");
    const publicUpdateCount = listToolIndexEntries({ locale: "zh-CN", kind: "revision" }).filter(
      (entry) =>
        entry.revisionType === "substantive" ||
        entry.revisionType === "mathematical-correction" ||
        entry.revisionType === "citation-update",
    ).length;
    expect(summary).toMatchObject({
      visualizations: count("visualization"),
      nodes: count("concept"),
      relations: count("relation"),
      learningPaths: count("learning-path"),
      glossaryEntries: count("concept") + count("definition"),
      symbols: count("symbol"),
      equations: count("equation"),
      resources: count("resource"),
      updates: publicUpdateCount,
    });
  });

  it("uses globally unique IDs instead of canonical URLs as identity", () => {
    const toolIndexEntries = getToolIndexEntries();
    const ids = toolIndexEntries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(toolIndexEntries.every((entry) => entry.id.startsWith(`${entry.kind}:`))).toBe(true);

    const locationCounts = new Map<string, number>();
    for (const entry of toolIndexEntries) {
      locationCounts.set(entry.canonicalUrl, (locationCounts.get(entry.canonicalUrl) ?? 0) + 1);
    }
    const entriesSharingLocations = toolIndexEntries.filter(
      (entry) => (locationCounts.get(entry.canonicalUrl) ?? 0) > 1,
    );
    expect(entriesSharingLocations.length).toBeGreaterThan(0);
    expect(new Set(entriesSharingLocations.map((entry) => entry.id)).size).toBe(
      entriesSharingLocations.length,
    );
  });

  it("keeps every concept connected and every equation at a textbook anchor", () => {
    const conceptIds = new Set(
      listToolIndexEntries({ locale: "zh-CN", kind: "concept" }).map((entry) => entry.sourceId),
    );
    const relations = listToolIndexEntries({ locale: "zh-CN", kind: "relation" });
    const connected = new Set(
      relations.flatMap((entry) => [entry.fromId, entry.toId]).filter((id): id is string => !!id),
    );
    expect([...conceptIds].filter((conceptId) => !connected.has(conceptId))).toEqual([]);

    const equationEntries = listToolIndexEntries({ locale: "zh-CN", kind: "equation" });
    expect(equationEntries).toHaveLength(equations.length);
    expect(
      equationEntries.every((entry) => entry.anchorId && entry.canonicalUrl.includes("#")),
    ).toBe(true);
  });

  it("deduplicates identical reader update records", () => {
    const updates = listToolIndexEntries({ locale: "zh-CN", kind: "revision" });
    const identities = updates.map((entry) =>
      JSON.stringify([
        entry.documentId,
        entry.date,
        entry.revisionType,
        entry.summary?.normalize("NFC"),
      ]),
    );
    expect(new Set(identities).size).toBe(identities.length);
  });

  it("indexes every public chapter-resource usage with an explicit authored claim", async () => {
    const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
    const documentById = new Map(documents.map((document) => [document.documentId, document]));
    const expectedUsages = documents.reduce(
      (total, document) => total + new Set(document.frontmatter.resources).size,
      0,
    );
    const usages = listToolIndexEntries({ locale: "zh-CN", kind: "resource-usage" });

    expect(usages).toHaveLength(expectedUsages);
    for (const usage of usages) {
      const document = usage.documentId ? documentById.get(usage.documentId) : undefined;
      const claim = usage.usageClaim?.trim() ?? "";
      expect(document, usage.id).toBeDefined();
      expect(claim.length, usage.id).toBeGreaterThan(0);
      expect(claim, usage.id).not.toBe(document?.frontmatter.summary);
      expect(claim, usage.id).not.toContain(usage.sourceId);
      if (document) expect(claim, usage.id).not.toContain(document.frontmatter.id);
      if (usage.chapterId) expect(claim, usage.id).not.toContain(usage.chapterId);
      expect(usage.summary, usage.id).toBe(claim);
    }
  });
});
