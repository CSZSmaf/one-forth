import { describe, expect, it } from "vitest";
import { migrateConceptV1ToV2 } from "./concept-migration";

describe("concept schema v1 to v2 migration", () => {
  it("adds the documented concept location without mutating legacy data", () => {
    const legacy = {
      schemaVersion: 1 as const,
      id: "gradient",
      domain: "mathematics",
      subject: "calculus",
      title: { "zh-CN": "梯度" },
    };
    const snapshot = structuredClone(legacy);

    expect(migrateConceptV1ToV2(legacy)).toEqual({
      id: "gradient",
      domain: "mathematics",
      subject: "calculus",
      title: { "zh-CN": "梯度" },
      schemaVersion: 2,
      canonicalLocation: { chapterId: "m03-partials-gradient" },
    });
    expect(legacy).toEqual(snapshot);
  });

  it("uses the deterministic article overview for a subject fallback", () => {
    const legacy = {
      schemaVersion: 1 as const,
      id: "future-analysis-topic",
      domain: "mathematics",
      subject: "calculus",
    };
    expect(migrateConceptV1ToV2(legacy).canonicalLocation).toEqual({
      chapterId: "m02-sequences-limits",
      anchorId: "article-overview",
    });
  });
});
