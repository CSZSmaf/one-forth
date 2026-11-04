import { listToolIndexEntries } from "@one-forth/content/tool-index";
import { describe, expect, it } from "vitest";
import { graphConceptTitle, presentGraphConcepts } from "./presentation";

describe("concept presentation", () => {
  it("excludes teaching schedules without excluding concepts taught in review chapters", () => {
    const entries = listToolIndexEntries({ locale: "zh-CN", kind: "concept" });
    const visible = presentGraphConcepts(entries, "zh-CN");
    expect(entries.length - visible.length).toBe(47);
    expect(visible.some((entry) => /综合复习|综合项目/u.test(entry.title))).toBe(false);
    expect(visible.find((entry) => entry.sourceId === "eigenvalues-eigenvectors")?.title).toBe(
      "特征值与特征向量",
    );
    expect(visible.find((entry) => entry.sourceId === "gradient")?.title).toBe("梯度");
    for (const entry of visible) {
      const original = entries.find((candidate) => candidate.id === entry.id);
      expect(entry.canonicalUrl).toBe(original?.canonicalUrl);
      expect(entry.sourceId).toBe(original?.sourceId);
    }
  });

  it("uses localized labels and preserves names of newly registered concepts", () => {
    expect(graphConceptTitle("computation-graphs", "long chapter title", "en")).toBe(
      "Computation graphs",
    );
    expect(graphConceptTitle("programming-review", "Project", "en")).toBeNull();
    expect(graphConceptTitle("new-concept", "New concept", "en")).toBe("New concept");
  });
});
