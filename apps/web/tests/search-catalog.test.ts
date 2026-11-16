import { readerContentRepository, readerCurriculumRepository } from "@one-forth/content";
import { uiText } from "@one-forth/config";
import { searchDocuments } from "@one-forth/search/client";
import { listToolIndexEntries, type ToolIndexEntry } from "@one-forth/content/tool-index";
import katex from "katex";
import { describe, expect, it } from "vitest";
import { GET as getBaseSearchCatalog } from "@/app/[locale]/search/base-catalog/route";
import { parseMathRichText } from "@/components/math-rich-text";
import { GET as getRetiredPlanningCatalog } from "@/app/[locale]/search/catalog/route";
import { createSearchCatalog } from "@/lib/catalog";
import { isSearchDocument } from "@/lib/planning-search-catalog";

const forbiddenPublicKeys = new Set([
  "id",
  "conceptId",
  "chapterId",
  "bookId",
  "partId",
  "seriesId",
  "publicationStatus",
  "editorialStatus",
  "translationEditorialStatus",
  "mathematicalStatus",
  "numericalStatus",
  "sourceStatus",
  "accessibilityStatus",
  "humanReviewer",
  "isPreview",
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

function expectedToolSearchUrl(
  entry: ToolIndexEntry,
  primaryConceptByDocument: ReadonlyMap<string, string>,
): string {
  const isPrimaryConcept =
    entry.kind === "concept" &&
    !!entry.documentId &&
    primaryConceptByDocument.get(entry.documentId) === entry.sourceId;
  if (entry.kind === "concept" && !isPrimaryConcept) {
    return `/zh-CN/glossary?entry=${encodeURIComponent(entry.id)}#glossary-${entry.id}`;
  }
  if (entry.kind === "equation") {
    return `/zh-CN/equations?equation=${encodeURIComponent(entry.sourceId)}#${entry.sourceId}`;
  }
  if (entry.kind === "symbol") {
    return `/zh-CN/symbols?symbol=${encodeURIComponent(entry.sourceId)}#symbol-${entry.sourceId}`;
  }
  return entry.canonicalUrl;
}

describe("public search catalog", () => {
  it("does not add chapters without a reader document for the requested locale", async () => {
    const catalog = await createSearchCatalog("en");
    expect(catalog.filter((document) => document.kind === "chapter")).toEqual([]);
  });

  it("finds real chapters with domain and subject filters", async () => {
    const catalog = await createSearchCatalog("zh-CN");
    const results = searchDocuments(catalog, "矩阵", { kind: "chapter", domain: "mathematics" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(({ document }) => document.url.endsWith("/matrices-operations"))).toBe(
      true,
    );
    expect(results.every(({ document }) => document.subject && document.curriculum)).toBe(true);
    expect(new Set(searchDocuments(catalog, "矩阵").map(({ document }) => document.url)).size).toBe(
      searchDocuments(catalog, "矩阵").length,
    );
  });

  it.each([...uiText["zh-CN"].searchDialog.examples, "partial", "\\partial", "∇", "∫", "α"])(
    "finds %s in the published catalog",
    async (query) => {
      const catalog = await createSearchCatalog("zh-CN");
      expect(searchDocuments(catalog, query).length).toBeGreaterThan(0);
    },
  );

  it.each([
    ["∂", "\\partial"],
    ["∇", "\\nabla"],
    ["∫", "\\int"],
    ["α", "\\alpha"],
  ])("matches %s and %s consistently", async (glyph, command) => {
    const catalog = await createSearchCatalog("zh-CN");
    expect(searchDocuments(catalog, glyph)).toEqual(searchDocuments(catalog, command));
  });

  it("keeps mathematical commands distinct from ordinary English aliases", async () => {
    const catalog = await createSearchCatalog("zh-CN");
    expect(
      searchDocuments(catalog, "∂", { kind: "equation" }).some(({ document }) =>
        /\\partial/u.test(document.summary),
      ),
    ).toBe(true);
    expect(
      searchDocuments(catalog, "\\int").some(
        ({ document }) => document.title === "CS50x: Introduction to Computer Science",
      ),
    ).toBe(false);
    expect(
      searchDocuments(catalog, "∂").some(({ document }) =>
        document.url.endsWith("/posets-boolean"),
      ),
    ).toBe(false);
  });

  it("indexes all reader-visible正文 without exposing editorial state", async () => {
    const [catalog, readerDocuments] = await Promise.all([
      createSearchCatalog("zh-CN"),
      readerContentRepository.listDocuments({ locale: "zh-CN" }),
    ]);
    expect(readerDocuments).toHaveLength(312);
    const readerUrls = new Set(readerDocuments.map((document) => document.url));
    const textbookRecords = catalog.filter((document) => document.url.startsWith("/zh-CN/books/"));

    expect(
      textbookRecords.every((document) => readerUrls.has(document.url.split("#")[0] ?? "")),
    ).toBe(true);
    expect(
      catalog.some(
        (document) =>
          document.url === "/zh-CN/books/mathematics/linear-algebra/vectors-coordinates",
      ),
    ).toBe(true);
    expect(
      catalog.some(
        (document) => document.url === "/zh-CN/books/mathematics/probability/conditional-bayes",
      ),
    ).toBe(true);
    expect(
      catalog.some(
        (document) =>
          document.url === "/zh-CN/books/mathematics/mathematical-statistics/confidence-intervals",
      ),
    ).toBe(true);
    expect(
      catalog.some(
        (document) =>
          document.url ===
          "/zh-CN/books/mathematics/discrete-mathematics-combinatorics-graphs/graphs-connectivity",
      ),
    ).toBe(true);
    expect(
      catalog.some(
        (document) =>
          document.url ===
          "/zh-CN/books/physics/physical-quantities-measurement-modeling/quantities-dimensions",
      ),
    ).toBe(true);
    expect(
      catalog.some(
        (document) =>
          document.url ===
          "/zh-CN/books/computer-science/programming-scientific-computing-foundations/programs-types-control",
      ),
    ).toBe(true);
    expect(
      catalog.some(
        (document) =>
          document.url === "/zh-CN/books/mathematics/linear-algebra/vectors-coordinates",
      ),
    ).toBe(true);
    expect(readerCurriculumRepository.listChapters()).toHaveLength(readerDocuments.length);
    expect(JSON.stringify(catalog)).not.toMatch(
      /课程规划|待人工审阅|待人工审校|草稿|预览|编辑状态|humanReviewer|pending/i,
    );
  });

  it("projects every searchable title and summary from the reader-safe tool index", async () => {
    const [catalog, readerDocuments] = await Promise.all([
      createSearchCatalog("zh-CN"),
      readerContentRepository.listDocuments({ locale: "zh-CN" }),
    ]);
    const primaryConceptByDocument = new Map(
      readerDocuments.map(
        (document) => [`zh-CN/${document.frontmatter.id}`, document.frontmatter.conceptId] as const,
      ),
    );
    const entries = listToolIndexEntries({
      locale: "zh-CN",
      kind: [
        "concept",
        "theorem",
        "learning-path",
        "resource",
        "equation",
        "symbol",
        "visualization",
      ],
    });

    expect(entries.length).toBeGreaterThan(0);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    for (const entry of entries) {
      const url = expectedToolSearchUrl(entry, primaryConceptByDocument);
      const projected = catalog.find(
        (document) => document.url === url && document.title === entry.title,
      );
      expect(projected, entry.id).toBeDefined();
      expect(projected?.summary, entry.id).toBe(entry.summary ?? entry.title);
    }
  });

  it("keeps all resource, equation, symbol, and experiment records in search", async () => {
    const catalog = await createSearchCatalog("zh-CN");
    const cases = [
      {
        kind: "resource" as const,
        actual: catalog.filter((document) => document.url.startsWith("/zh-CN/resources/")),
        expectedUrl: (entry: ToolIndexEntry) => entry.canonicalUrl,
      },
      {
        kind: "equation" as const,
        actual: catalog.filter((document) => document.kind === "equation"),
        expectedUrl: (entry: ToolIndexEntry) =>
          `/zh-CN/equations?equation=${encodeURIComponent(entry.sourceId)}#${entry.sourceId}`,
      },
      {
        kind: "symbol" as const,
        actual: catalog.filter((document) => document.kind === "symbol"),
        expectedUrl: (entry: ToolIndexEntry) =>
          `/zh-CN/symbols?symbol=${encodeURIComponent(entry.sourceId)}#symbol-${entry.sourceId}`,
      },
      {
        kind: "visualization" as const,
        actual: catalog.filter((document) => document.kind === "experiment"),
        expectedUrl: (entry: ToolIndexEntry) => entry.canonicalUrl,
      },
    ];

    for (const testCase of cases) {
      const entries = listToolIndexEntries({ locale: "zh-CN", kind: testCase.kind });
      expect(entries.length, testCase.kind).toBeGreaterThan(0);
      expect(testCase.actual, testCase.kind).toHaveLength(entries.length);
      expect(new Set(testCase.actual.map((document) => document.url)), testCase.kind).toEqual(
        new Set(entries.map(testCase.expectedUrl)),
      );
    }
    expect(collectKeys(catalog).has("isPreview")).toBe(false);
  });

  it("keeps every search summary free of visible raw TeX and KaTeX errors", async () => {
    const catalog = await createSearchCatalog("zh-CN");

    for (const document of catalog) {
      if (document.kind === "equation" || document.kind === "symbol") {
        expect(
          () =>
            katex.renderToString(document.summary, {
              output: "htmlAndMathml",
              strict: false,
              throwOnError: true,
            }),
          document.key,
        ).not.toThrow();
        continue;
      }

      const segments = parseMathRichText(document.summary);
      const visibleText = segments
        .filter((segment) => segment.kind === "text")
        .map((segment) => segment.text)
        .join("");
      expect(visibleText, document.key).not.toMatch(/\\[A-Za-z]+|(?<!\\)\$/u);
      for (const segment of segments) {
        if (segment.kind !== "math") continue;
        expect(
          () =>
            katex.renderToString(segment.latex, {
              output: "htmlAndMathml",
              strict: false,
              throwOnError: true,
            }),
          document.key,
        ).not.toThrow();
      }
    }
  });

  it("serializes no internal registry key or editorial state", async () => {
    const catalog = await createSearchCatalog("zh-CN");
    expect(catalog.every(isSearchDocument)).toBe(true);
    const exposedKeys = collectKeys(catalog);
    for (const forbidden of forbiddenPublicKeys) {
      expect(exposedKeys.has(forbidden), forbidden).toBe(false);
    }
    expect(catalog.every((document) => document.key === `${document.kind}:${document.url}`)).toBe(
      true,
    );
  });

  it("keeps the retired planning endpoint unavailable", async () => {
    const response = await getRetiredPlanningCatalog();
    const payload: unknown = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(payload).toEqual({ error: "Not found" });
  });

  it("serves a strictly validated base catalog", async () => {
    const response = await getBaseSearchCatalog(
      new Request("https://one-forth.test/zh-CN/search/base-catalog?schema=2"),
      { params: Promise.resolve({ locale: "zh-CN" }) },
    );
    const payload: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(response.headers.get("X-One-Forth-Search-Schema")).toBe("2");
    expect(Array.isArray(payload)).toBe(true);
    if (!Array.isArray(payload)) throw new Error("Base search catalog must be an array");
    expect(payload.length).toBeGreaterThan(0);
    expect(payload.every(isSearchDocument)).toBe(true);
    const exposedKeys = collectKeys(payload);
    for (const forbidden of forbiddenPublicKeys) {
      expect(exposedKeys.has(forbidden), forbidden).toBe(false);
    }
  });

  it("retires unversioned catalog requests without caching their response", async () => {
    const response = await getBaseSearchCatalog(
      new Request("https://one-forth.test/zh-CN/search/base-catalog"),
      { params: Promise.resolve({ locale: "zh-CN" }) },
    );
    const payload: unknown = await response.json();

    expect(response.status).toBe(410);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload).toEqual({
      error: "Search catalog schema version is required",
      currentSchema: 2,
    });
  });

  it("rejects payload records that add a blacklisted field", async () => {
    const catalog = await createSearchCatalog("zh-CN");
    const first = catalog[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(isSearchDocument({ ...first, isPreview: true })).toBe(false);
    expect(isSearchDocument({ ...first, isPreview: "preview" })).toBe(false);
    expect(isSearchDocument({ ...first, conceptId: "internal-concept" })).toBe(false);
    expect(
      isSearchDocument({
        ...first,
        curriculum: {
          seriesTitle: "数学",
          bookCode: "M01",
          bookTitle: "示例",
          partTitle: "第一编",
          chapterTitle: "第一章",
          chapterNumber: 1,
          chapterId: "internal-chapter",
        },
      }),
    ).toBe(false);
  });
});
