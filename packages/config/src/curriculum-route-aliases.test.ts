import { describe, expect, it } from "vitest";
import { normalizeCurriculumPath } from "./curriculum-route-aliases";

describe("curriculum path compatibility", () => {
  it("moves a known book and retains chapter, query and anchor", () => {
    expect(
      normalizeCurriculumPath(
        "/zh-CN/books/computing-ai/neural-networks-backpropagation/activation-functions?view=reading#example",
      ),
    ).toBe(
      "/zh-CN/books/artificial-intelligence/neural-networks-backpropagation/activation-functions?view=reading#example",
    );
    expect(
      normalizeCurriculumPath(
        "/zh-CN/books/computing-ai/programming-scientific-computing-foundations/programs-types-control",
      ),
    ).toBe(
      "/zh-CN/books/computer-science/programming-scientific-computing-foundations/programs-types-control",
    );
  });
  it("leaves unrelated and unknown paths unchanged", () => {
    for (const path of [
      "/zh-CN/books/computing-ai/unknown-book",
      "/zh-CN/books/mathematics/probability",
      "c00-programs-types-control",
      "https://example.org/books/computing-ai",
    ]) {
      expect(normalizeCurriculumPath(path)).toBe(path);
    }
  });
  it("resolves retired directory and learning path entries", () => {
    expect(normalizeCurriculumPath("/zh-CN/books/computing-ai/")).toBe("/zh-CN/books");
    expect(normalizeCurriculumPath("/zh-CN/paths/computing-ai-complete")).toBe(
      "/zh-CN/paths/computer-science-complete",
    );
  });
});
