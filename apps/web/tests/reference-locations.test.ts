import { equations, readerCurriculumRepository, symbols } from "@one-forth/content";
import { listToolIndexEntries } from "@one-forth/content/tool-index";
import { describe, expect, it } from "vitest";
import {
  listPublicEquationReferences,
  listPublicSymbolReferences,
  resolveConceptReferenceLocation,
  resolveEquationReferenceLocation,
  resolveSymbolReferenceLocation,
} from "@/lib/reference-locations";

describe("reader reference locations", () => {
  it("resolves every indexed concept to a reader Chapter", () => {
    const concepts = listToolIndexEntries({ locale: "zh-CN", kind: "concept" });
    expect(concepts.length).toBeGreaterThan(0);

    for (const concept of concepts) {
      const location = resolveConceptReferenceLocation(concept.sourceId, "zh-CN");
      expect(location, concept.sourceId).not.toBeNull();
      expect(location?.url, concept.sourceId).toMatch(
        /^\/zh-CN\/books\/[^/]+\/[^/]+\/[^/#]+(?:#[^#]+)?$/,
      );
      expect(readerCurriculumRepository.getChapter(location?.chapterId ?? "")).not.toBeNull();
    }
    expect(resolveConceptReferenceLocation("not-an-indexed-concept", "zh-CN")).toBeNull();
  });

  it("lists all registered equations with a reader textbook location", async () => {
    const references = await listPublicEquationReferences("zh-CN");
    expect(references).toHaveLength(equations.length);
    expect(references.length).toBeGreaterThan(0);

    for (const { equation, location } of references) {
      expect(resolveEquationReferenceLocation(equation, [], "zh-CN"), equation.id).toEqual(
        location,
      );
      expect(readerCurriculumRepository.getChapter(location.chapterId), equation.id).not.toBeNull();
    }
    expect(resolveEquationReferenceLocation("not-an-indexed-equation", [], "zh-CN")).toBeNull();
  });

  it("lists every authored symbol location at a real reader anchor", async () => {
    const references = await listPublicSymbolReferences("zh-CN");
    expect(references).toHaveLength(symbols.length);
    expect(references.length).toBeGreaterThan(0);

    for (const { symbol, location, locations } of references) {
      expect(resolveSymbolReferenceLocation(symbol, [], "zh-CN"), symbol.id).toEqual(location);
      expect(locations).toHaveLength(
        new Set(symbol.locations.map((source) => `${source.documentId}\0${source.anchorId}`)).size,
      );
      for (const sourceLocation of locations) {
        expect(
          readerCurriculumRepository.getChapter(sourceLocation.chapterId),
          `${symbol.id}/${sourceLocation.url}`,
        ).not.toBeNull();
        expect(sourceLocation.url, symbol.id).toMatch(
          /^\/zh-CN\/books\/[^/]+\/[^/]+\/[^/#]+#[^#]+$/,
        );
      }
    }
    expect(resolveSymbolReferenceLocation("not-an-indexed-symbol", [], "zh-CN")).toBeNull();
  });
});
