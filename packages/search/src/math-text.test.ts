import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { searchDocuments, segmentSearchText, type SearchDocument } from "./client";

const mathDocuments: readonly SearchDocument[] = [
  {
    key: "partial",
    kind: "symbol",
    title: "∂",
    summary: "偏导数",
    locale: "zh-CN",
    url: "/symbols#partial",
    keywords: ["partial derivative"],
    domain: "mathematics",
    difficulty: 1,
  },
  {
    key: "gradient",
    kind: "equation",
    title: "梯度定义",
    summary: "\\nabla f = (\\partial_x f, \\partial_y f)",
    locale: "zh-CN",
    url: "/equations#gradient",
    keywords: ["gradient"],
    domain: "mathematics",
    difficulty: 2,
  },
  {
    key: "integral",
    kind: "equation",
    title: "定积分",
    summary: "\\int_0^1 f(x)\\,dx",
    locale: "zh-CN",
    url: "/equations#integral",
    keywords: [],
    domain: "mathematics",
    difficulty: 2,
  },
  {
    key: "alpha",
    kind: "symbol",
    title: "\\alpha",
    summary: "学习率",
    locale: "zh-CN",
    url: "/symbols#alpha",
    keywords: [],
  },
  {
    key: "printing",
    kind: "article",
    title: "Introduction to Printing",
    summary: "print, integer, interval",
    locale: "en",
    url: "/printing",
    keywords: ["partial order"],
  },
  {
    key: "infinity",
    kind: "symbol",
    title: "\\infty",
    summary: "无穷",
    locale: "zh-CN",
    url: "/symbols#infinity",
    keywords: [],
  },
];

describe.each(["native", "fallback"] as const)("mathematical search (%s segmentation)", (mode) => {
  const segmenter = Object.getOwnPropertyDescriptor(Intl, "Segmenter");

  beforeEach(() => {
    if (mode === "fallback") {
      Object.defineProperty(Intl, "Segmenter", { configurable: true, value: undefined });
    }
  });
  afterEach(() => {
    if (segmenter) Object.defineProperty(Intl, "Segmenter", segmenter);
  });

  it.each([
    ["∂", "\\partial"],
    ["∇", "\\nabla"],
    ["∫", "\\int"],
    ["α", "\\alpha"],
    ["≤", "\\le"],
    ["φ", "\\varphi"],
  ])("treats %s and %s as the same mathematical token", (symbol, command) => {
    expect(segmentSearchText(symbol)).toEqual(segmentSearchText(command));
    expect(segmentSearchText(symbol)).toHaveLength(1);
  });

  it.each(["∂", "\\partial", "partial"])("finds a partial derivative from %s", (query) => {
    expect(searchDocuments(mathDocuments, query).map(({ document }) => document.key)).toEqual(
      expect.arrayContaining(["partial", "gradient"]),
    );
  });

  it("matches glyphs against TeX and TeX against glyphs", () => {
    expect(searchDocuments(mathDocuments, "\\partial")[0]?.document.key).toBe("partial");
    expect(searchDocuments(mathDocuments, "α")[0]?.document.key).toBe("alpha");
    expect(searchDocuments(mathDocuments, "∇")[0]?.document.key).toBe("gradient");
    expect(segmentSearchText("∂f")).toEqual(expect.arrayContaining(["\\partial", "f"]));
  });

  it("keeps mathematical commands distinct from longer commands and English words", () => {
    expect(searchDocuments(mathDocuments, "\\int").map(({ document }) => document.key)).toEqual([
      "integral",
    ]);
    expect(searchDocuments(mathDocuments, "\\in")).toEqual([]);
    expect(searchDocuments(mathDocuments, "∂").map(({ document }) => document.key)).toEqual([
      "partial",
      "gradient",
    ]);
    expect(searchDocuments(mathDocuments, "∫")).toEqual(searchDocuments(mathDocuments, "\\int"));
  });

  it("preserves AND matching and filters for mathematical queries", () => {
    expect(
      searchDocuments(mathDocuments, "∂ gradient").map(({ document }) => document.key),
    ).toEqual(["gradient"]);
    expect(
      searchDocuments(mathDocuments, "∂", { kind: "equation", domain: "mathematics" }).map(
        ({ document }) => document.key,
      ),
    ).toEqual(["gradient"]);
    expect(
      searchDocuments(mathDocuments, "∂", { maximumDifficulty: 1 }).map(
        ({ document }) => document.key,
      ),
    ).toEqual(["partial"]);
    expect(searchDocuments(mathDocuments, "∂", { domain: "physics" })).toEqual([]);
  });

  it.each(["", "!!!", "---", "\\"])("ignores a non-searchable input: %s", (query) => {
    expect(searchDocuments(mathDocuments, query)).toEqual([]);
  });
});
