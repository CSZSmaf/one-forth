import { describe, expect, it } from "vitest";
import {
  conceptById,
  conceptCatalog,
  contentRepository,
  learningPathAliases,
  learningPaths,
  legacyLearningPathsV2,
  requiredRoundTwoConceptIds,
  requiredRoundTwoLearningPathIds,
  requiredSeriesLearningPathIds,
  requiredTopicalLearningPathIds,
} from "./index";

function hasPrerequisiteCycle(): boolean {
  const state = new Map<string, "visiting" | "complete">();
  const visit = (id: string): boolean => {
    if (state.get(id) === "visiting") return true;
    if (state.get(id) === "complete") return false;
    state.set(id, "visiting");
    const concept = conceptById.get(id);
    for (const prerequisite of concept?.prerequisites ?? []) {
      if (visit(prerequisite)) return true;
    }
    state.set(id, "complete");
    return false;
  };
  return conceptCatalog.some((concept) => visit(concept.id));
}

describe("independent concept catalog", () => {
  it("provides at least 120 concrete concepts and all required round-two topics", () => {
    expect(conceptCatalog.length).toBeGreaterThanOrEqual(120);
    const ids = new Set(conceptCatalog.map((concept) => concept.id));
    requiredRoundTwoConceptIds.forEach((id) => expect(ids.has(id), id).toBe(true));
    conceptCatalog.forEach((concept) => {
      expect(concept.title["zh-CN"].trim(), concept.id).not.toBe("");
      expect(concept.summary["zh-CN"].trim().length, concept.id).toBeGreaterThanOrEqual(20);
      expect(concept.domain, concept.id).not.toBe("");
      expect(concept.subject, concept.id).not.toBe("");
      expect(concept.estimatedMinutes, concept.id).toBeGreaterThan(0);
      expect(concept.maturity, concept.id).toBe("checked");
      expect(concept.documents.length, concept.id).toBeGreaterThan(0);
      expect(concept.title["zh-CN"], concept.id).not.toBe(concept.id);
    });
    expect(
      conceptCatalog.some((concept) =>
        (["planned", "outline", "draft"] as const).includes(
          concept.maturity as "planned" | "outline" | "draft",
        ),
      ),
    ).toBe(false);
  });

  it("binds every catalog concept to a real authored textbook chapter", async () => {
    for (const concept of conceptCatalog) {
      for (const reference of concept.documents) {
        const contentId = reference.documentId.replace(`${reference.locale}/`, "");
        expect(
          await contentRepository.getDocument(contentId, reference.locale),
          `${concept.id}:${reference.documentId}`,
        ).not.toBeNull();
      }
    }
  });

  it("gives every secondary concept a stable authored chapter anchor", async () => {
    const documents = await contentRepository.listDocuments({ locale: "zh-CN" });
    const primaryConceptIds = new Set(documents.map((document) => document.frontmatter.conceptId));
    const secondaryConcepts = conceptCatalog.filter(
      (concept) => !primaryConceptIds.has(concept.id),
    );
    expect(secondaryConcepts.length).toBeGreaterThan(0);
    for (const concept of secondaryConcepts) {
      expect(concept.canonicalLocation.anchorId, concept.id).toBeTruthy();
      expect(concept.canonicalLocation.anchorId, concept.id).not.toBe(concept.id);
    }
  });

  it("does not synthesize motivates or applied-to catalog edges", () => {
    expect(
      conceptCatalog.flatMap((concept) =>
        concept.relations.filter(
          (relation) => relation.type === "motivates" || relation.type === "applied-to",
        ),
      ),
    ).toEqual([]);
  });

  it("has valid reciprocal prerequisites and no prerequisite cycle", () => {
    conceptCatalog.forEach((concept) => {
      concept.prerequisites.forEach((prerequisite) => {
        expect(
          conceptById.get(prerequisite)?.followUps,
          `${prerequisite} -> ${concept.id}`,
        ).toContain(concept.id);
      });
    });
    expect(hasPrerequisiteCycle()).toBe(false);
  });

  it("keeps primary concept mappings and the complete published search available", async () => {
    const authoredConcepts = [
      "vectors",
      "linear-transformation",
      "gradient",
      "gradient-descent",
      "backpropagation",
      "attention-mechanism",
      "wave-equation",
    ];
    for (const id of authoredConcepts) {
      expect(await contentRepository.getConcept(id), id).not.toBeNull();
      expect(await contentRepository.getDocumentForConcept(id, "zh-CN"), id).not.toBeNull();
    }
    expect(await contentRepository.getDocumentForConcept("transformer", "zh-CN")).toBeNull();
    expect((await contentRepository.getRelations("transformer")).length).toBeGreaterThan(0);
    expect((await contentRepository.search({ value: "Transformer" })).length).toBeGreaterThan(0);
    expect(
      (await contentRepository.search({ value: "向量", includePreview: true })).map(
        (result) => result.id,
      ),
    ).toContain("zh-CN/vectors");
  });

  it("resolves every catalog document mapping", async () => {
    for (const concept of conceptCatalog) {
      for (const reference of concept.documents) {
        const document = await contentRepository.getDocument(
          reference.documentId.replace(`${reference.locale}/`, ""),
          reference.locale,
        );
        expect(document?.documentId, `${concept.id}/${reference.locale}`).toBe(
          reference.documentId,
        );
      }
    }
  });

  it("models Fourier series as an actual wave-equation prerequisite", () => {
    expect(conceptById.get("wave-equation")?.prerequisites).toContain("fourier-series");
    expect(conceptById.get("fourier-series")?.followUps).toContain("wave-equation");
  });
});

describe("learning path catalog", () => {
  it("keeps all legacy IDs while publishing the topical routes", () => {
    expect(legacyLearningPathsV2.map((path) => path.id)).toEqual([
      ...requiredRoundTwoLearningPathIds,
    ]);
    expect(learningPaths.map((path) => path.id)).toEqual([
      ...requiredTopicalLearningPathIds,
      ...requiredSeriesLearningPathIds,
    ]);
    expect(learningPathAliases.map((alias) => alias.id)).toEqual([
      "calculus-foundations",
      "linear-algebra-foundations",
      "probability-statistics-foundations",
    ]);
    learningPaths.forEach((path) => {
      expect(path.audience["zh-CN"].trim(), path.id).not.toBe("");
      expect(path.stageGoals.length, path.id).toBeGreaterThan(0);
      expect(path.estimatedHours, path.id).toBeGreaterThan(0);
      expect(path.checkpoints.length, path.id).toBeGreaterThan(0);
      expect(path.exercises.length, path.id).toBeGreaterThan(0);
    });
  });

  it("uses canonical Chapter IDs as the sole ordered route sequence", () => {
    learningPaths.forEach((path) => {
      expect(path.chapterIds.every((chapterId) => /^[a-z][0-9]{2}-/.test(chapterId))).toBe(true);
      expect(new Set(path.chapterIds).size).toBe(path.chapterIds.length);
    });
  });
});
