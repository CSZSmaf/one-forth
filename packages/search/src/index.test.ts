import { conceptCatalog, contentRepository, curriculumRepository } from "@one-forth/content";
import { describe, expect, it } from "vitest";
import {
  createConceptSearchDocuments,
  createCurriculumSearchDocuments,
  createPublicSearchKey,
  createSearchCurriculumLocation,
  searchDocuments,
  segmentSearchText,
  type SearchDocument,
} from "./index";

const documents: readonly SearchDocument[] = [
  {
    key: "concept:/zh-CN/learn/gradient",
    kind: "concept",
    title: "导数、方向导数与梯度",
    summary: "理解最陡上升方向",
    domain: "mathematics",
    difficulty: 2,
    locale: "zh-CN",
    url: "/zh-CN/learn/gradient",
    keywords: ["nabla", "∇", "gradient"],
  },
  {
    key: "article:/zh-CN/learn/attention",
    kind: "article",
    title: "注意力机制",
    summary: "从加权平均到自注意力",
    domain: "machine-learning",
    difficulty: 3,
    locale: "zh-CN",
    url: "/zh-CN/learn/attention",
    keywords: ["attention", "self-attention"],
  },
];

const forbiddenPublicKeys = new Set([
  "id",
  "conceptId",
  "chapterId",
  "bookId",
  "partId",
  "seriesId",
  "publicationStatus",
  "editorialStatus",
  "isPreview",
  "maturity",
  "status",
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

describe("local search", () => {
  it("segments Chinese text with a fallback-safe interface", () => {
    expect(segmentSearchText("梯度 descent").length).toBeGreaterThan(1);
  });

  it("matches aliases and symbols", () => {
    expect(searchDocuments(documents, "nabla")[0]?.document.key).toBe(
      "concept:/zh-CN/learn/gradient",
    );
  });

  it("requires every term in a multi-word query", () => {
    const related: readonly SearchDocument[] = [
      {
        key: "article:/zh-CN/linear-models",
        kind: "article",
        title: "线性模型",
        summary: "从线性关系开始",
        locale: "zh-CN",
        url: "/zh-CN/linear-models",
        keywords: ["linear"],
      },
      {
        key: "article:/zh-CN/linear-regression",
        kind: "article",
        title: "线性回归",
        summary: "用平方损失拟合连续目标",
        locale: "zh-CN",
        url: "/zh-CN/linear-regression",
        keywords: ["linear regression"],
      },
    ];

    expect(searchDocuments(related, "线性 回归").map(({ document }) => document.url)).toEqual([
      "/zh-CN/linear-regression",
    ]);
  });

  it("keeps preview concepts opt-in without serializing editorial state", async () => {
    const authoredDocuments = await contentRepository.listDocuments({ locale: "zh-CN" });
    const authoredDocument = authoredDocuments.find(
      (document) => document.frontmatter.conceptId === "random-variables-distributions",
    );
    expect(authoredDocument).toBeDefined();
    if (!authoredDocument) return;

    const previewDocument = {
      ...authoredDocument,
      frontmatter: { ...authoredDocument.frontmatter, publicationStatus: "preview" as const },
    };

    const previewCatalog = createConceptSearchDocuments(conceptCatalog, {
      documents: [previewDocument],
    });
    expect(previewCatalog).toHaveLength(0);
    const readerCatalog = createConceptSearchDocuments(conceptCatalog, {
      documents: [previewDocument],
      includePreview: true,
    });
    expect(readerCatalog).toEqual([
      expect.objectContaining({
        key: createPublicSearchKey("article", authoredDocument.url),
      }),
    ]);
    expect(collectKeys(readerCatalog).has("isPreview")).toBe(false);

    const publishedDocument = {
      ...previewDocument,
      frontmatter: { ...previewDocument.frontmatter, publicationStatus: "published" as const },
    };
    const catalog = createConceptSearchDocuments(conceptCatalog, {
      documents: [publishedDocument],
    });
    expect(catalog).toEqual([
      expect.objectContaining({
        key: createPublicSearchKey("article", authoredDocument.url),
        kind: "article",
        url: authoredDocument.url,
      }),
    ]);
    expect(collectKeys(catalog).has("isPreview")).toBe(false);
  });

  it("keeps public search DTOs free of registry and editorial keys", async () => {
    const authoredDocuments = await contentRepository.listDocuments({ locale: "zh-CN" });
    const publishedDocuments = authoredDocuments.slice(0, 2).map((document) => ({
      ...document,
      frontmatter: { ...document.frontmatter, publicationStatus: "published" as const },
    }));
    const catalog = createConceptSearchDocuments(conceptCatalog, {
      documents: publishedDocuments,
    });
    const exposedKeys = collectKeys(catalog);
    for (const forbidden of forbiddenPublicKeys) {
      expect(exposedKeys.has(forbidden), forbidden).toBe(false);
    }
  });

  it("projects curriculum context without registry identifiers", () => {
    const chapter = curriculumRepository.listChapters()[0];
    expect(chapter).toBeDefined();
    if (!chapter) return;
    const context = curriculumRepository.getChapterContext(chapter.id, "zh-CN");
    expect(context).toBeDefined();
    if (!context) return;
    const location = createSearchCurriculumLocation(context, "zh-CN");
    expect(location.chapterTitle).toBeTruthy();
    expect(Object.keys(location)).not.toEqual(
      expect.arrayContaining(["seriesId", "bookId", "partId", "chapterId"]),
    );
  });

  it("keeps preview curriculum chapters opt-in and hidden chapters excluded", () => {
    const fixtureChapters = curriculumRepository.listChapters().slice(0, 3);
    expect(fixtureChapters).toHaveLength(3);
    const [publishedChapter, previewChapter, hiddenChapter] = fixtureChapters;
    if (!publishedChapter || !previewChapter || !hiddenChapter) return;

    const fixtureRepository = new Proxy(curriculumRepository, {
      get(target, property) {
        if (property === "listChapters") {
          return () => [
            { ...publishedChapter, publicationStatus: "published" as const },
            { ...previewChapter, publicationStatus: "preview" as const },
            { ...hiddenChapter, publicationStatus: "hidden" as const },
          ];
        }
        const value: unknown = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const publishedUrl = fixtureRepository.getChapterContext(
      publishedChapter.id,
      "zh-CN",
    )?.canonicalPath;
    const previewUrl = fixtureRepository.getChapterContext(
      previewChapter.id,
      "zh-CN",
    )?.canonicalPath;
    const hiddenUrl = fixtureRepository.getChapterContext(hiddenChapter.id, "zh-CN")?.canonicalPath;
    expect(publishedUrl).toBeTruthy();
    expect(previewUrl).toBeTruthy();
    expect(hiddenUrl).toBeTruthy();

    const catalog = createCurriculumSearchDocuments(fixtureRepository);
    expect(catalog.map((document) => document.url)).toEqual([publishedUrl]);

    const readerCatalog = createCurriculumSearchDocuments(fixtureRepository, {
      includePreview: true,
    });
    expect(readerCatalog.map((document) => document.url)).toEqual([publishedUrl, previewUrl]);
    expect(readerCatalog.some((document) => document.url === hiddenUrl)).toBe(false);
    expect(collectKeys(readerCatalog).has("isPreview")).toBe(false);
  });

  it("ranks an exact authored title above a related experiment", () => {
    const related: readonly SearchDocument[] = [
      {
        key: "article:/zh-CN/learn/gradient-descent",
        kind: "article",
        title: "梯度下降",
        summary: "优化轨迹与步长",
        locale: "zh-CN",
        url: "/zh-CN/learn/gradient-descent",
        keywords: ["gradient descent"],
      },
      {
        key: "experiment:/zh-CN/playground?figure=gradient-descent",
        kind: "experiment",
        title: "梯度下降",
        summary: "交互优化轨迹",
        locale: "zh-CN",
        url: "/zh-CN/playground?figure=gradient-descent",
        keywords: ["梯度下降"],
      },
    ];

    expect(searchDocuments(related, "梯度下降")[0]?.document.kind).toBe("article");
  });
});
