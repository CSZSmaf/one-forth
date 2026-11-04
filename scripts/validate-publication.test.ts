import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resources } from "../packages/content/src/index.ts";
import { visualizationManifest } from "../packages/visualization/src/index.ts";
import { analyzeStyleDocuments } from "./content-style.ts";
import { loadContentDocuments, type LoadedContentDocument } from "./lib/content-files.ts";
import {
  countExplicitSolutions,
  hasNonSpecificChapterTitle,
  hasNonSpecificTopicHeading,
  validatePublishedDocument,
} from "./validate-publication.ts";

describe("publication validation", () => {
  it("accepts concise subject titles and rejects empty or generic titles", () => {
    for (const title of ["熵", "行列式", "正则化", "计算机组成"]) {
      assert.equal(hasNonSpecificChapterTitle(title), false, title);
    }
    for (const title of ["", "  ", "导论", "概述", "基础", "复习"]) {
      assert.equal(hasNonSpecificChapterTitle(title), true, title);
    }
  });
  it("accepts concise, topic-specific level-two headings", () => {
    assert.equal(hasNonSpecificTopicHeading("## 熵\n\n## 证明\n\n## 场"), false);
  });

  it("rejects empty and generic level-two headings", () => {
    for (const heading of ["##", "##   ", "## 正文", "## 内容", "## 其他", "## 更多"]) {
      assert.equal(hasNonSpecificTopicHeading(heading), true, heading);
    }
  });

  it("counts standalone, legacy attribute, and structured exercise solutions", () => {
    const body = [
      '<Exercise solution="legacy answer">Legacy prompt.</Exercise>',
      "<Exercise>",
      "Structured prompt.",
      "<ExerciseSolution>Structured answer.</ExerciseSolution>",
      "</Exercise>",
      "<Solution>Standalone answer.</Solution>",
    ].join("\n");

    assert.equal(countExplicitSolutions(body), 3);
  });

  it("ignores preview documents and enforces readiness when the same draft is published", async () => {
    const loaded = await loadContentDocuments();
    assert.deepEqual(loaded.diagnostics, []);
    const source = loaded.documents.find(
      (document) => document.frontmatter.id === "functions-and-graphs",
    );
    assert.ok(source);
    if (!source) return;
    const style = analyzeStyleDocuments(
      [
        {
          file: source.relativePath,
          title: source.frontmatter.title,
          body: source.body,
          bodyStartLine: source.bodyStartLine,
          declaredVisualizations: source.frontmatter.visualizations,
        },
      ],
      undefined,
      [],
      "test",
    ).files[0];
    assert.ok(style);
    if (!style) return;
    const resourceById = new Map(resources.map((resource) => [resource.id, resource] as const));
    const visualizationIds = new Set(visualizationManifest.map((entry) => entry.id));

    const previewDraft = {
      ...source,
      frontmatter: {
        ...source.frontmatter,
        publicationStatus: "preview" as const,
        editorialStatus: "draft" as const,
      },
    } satisfies LoadedContentDocument;
    assert.deepEqual(
      validatePublishedDocument(previewDraft, style, resourceById, visualizationIds),
      [],
    );

    const falselyPublished = {
      ...previewDraft,
      frontmatter: {
        ...previewDraft.frontmatter,
        publicationStatus: "published" as const,
      },
    } satisfies LoadedContentDocument;
    const rules = validatePublishedDocument(
      falselyPublished,
      style,
      resourceById,
      visualizationIds,
    ).map((failure) => failure.rule);
    assert.ok(rules.includes("editorial-readiness"));
  });
});
