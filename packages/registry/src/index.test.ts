import { describe, expect, it } from "vitest";
import {
  Registry,
  canonicalRelationType,
  domainRegistry,
  knowledgeRelationTypeValues,
  relationTypeDefinitions,
  subjectRegistry,
} from "./index";

describe("registry", () => {
  it("registers every subject through its domain", () => {
    expect(domainRegistry.list().length).toBeGreaterThanOrEqual(5);
    expect(subjectRegistry.get("quantum-mechanics")?.domainId).toBe("physics");
    expect(subjectRegistry.get("discrete-mathematics")?.domainId).toBe("mathematics");
    expect(subjectRegistry.get("differential-equations")?.domainId).toBe("mathematics");
    expect(subjectRegistry.get("numerical-analysis")?.domainId).toBe("mathematics");
    expect(subjectRegistry.get("real-analysis")?.domainId).toBe("mathematics");
    expect(subjectRegistry.get("complex-analysis")?.domainId).toBe("mathematics");
    expect(domainRegistry.get("mathematics")?.symbolNamespaces).toContain("math.foundations");
    expect(domainRegistry.get("mathematics")?.symbolNamespaces).toContain(
      "math.discrete-mathematics",
    );
    expect(domainRegistry.get("mathematics")?.symbolNamespaces).toContain(
      "math.differential-equations",
    );
    expect(domainRegistry.get("mathematics")?.symbolNamespaces).toContain("math.numerical");
    expect(domainRegistry.get("mathematics")?.symbolNamespaces).toContain("math.analysis");
    expect(domainRegistry.get("mathematics")?.symbolNamespaces).toContain("math.complex");
  });

  it("owns the subject namespaces emitted for foundations and discrete mathematics", () => {
    const namespaces = new Set(domainRegistry.get("mathematics")?.symbolNamespaces ?? []);

    for (const subjectId of ["foundations", "discrete-mathematics"]) {
      expect(subjectRegistry.get(subjectId)?.domainId).toBe("mathematics");
      expect(namespaces.has(`math.${subjectId}`)).toBe(true);
    }
    expect(namespaces.has("math.discrete")).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const registry = new Registry<{ id: string }>();
    registry.register({ id: "same" });
    expect(() => registry.register({ id: "same" })).toThrow(/Duplicate/);
  });

  it("defines every canonical relation with presentation and inverse metadata", () => {
    expect(relationTypeDefinitions.map((definition) => definition.id)).toEqual([
      ...knowledgeRelationTypeValues,
    ]);
    relationTypeDefinitions.forEach((definition) => {
      expect(definition.inverseId).not.toBe("");
      expect(definition.label["zh-CN"]).not.toBe("");
      expect(definition.inverseLabel["zh-CN"]).not.toBe("");
      expect(definition.description["zh-CN"]).not.toBe("");
      expect(["directed", "bidirectional"]).toContain(definition.direction);
      expect(definition.colorToken).not.toBe("");
      expect(["solid", "dashed", "dotted"]).toContain(definition.lineStyle);
    });
  });

  it("migrates only the semantically safe used-in alias", () => {
    expect(canonicalRelationType("used-in")).toBe("applied-to");
    expect(canonicalRelationType("depends-on")).toBeUndefined();
    expect(canonicalRelationType("applied-to")).toBe("applied-to");
  });
});
