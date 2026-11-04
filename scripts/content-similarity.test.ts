import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeSimilarityDocuments,
  contentSimilarityConfig,
  exitCodeForSimilarityReport,
  extractSimilarityFeatures,
  headingSequenceSimilarity,
  textSimilarity,
  type ContentSimilarityConfig,
  type SimilarityDocument,
} from "./content-similarity.ts";

function document(
  file: string,
  title: string,
  domain: string,
  subject: string,
  body: string,
): SimilarityDocument {
  return { file, title, domain, subject, body, bodyStartLine: 10 };
}

function config(overrides: Partial<ContentSimilarityConfig> = {}): ContentSimilarityConfig {
  return {
    ...contentSimilarityConfig,
    minimumFeatureHan: 5,
    paragraphOpeningHan: 24,
    ngramSize: 8,
    minimumSharedNgrams: 5,
    featureSimilarity: 0.8,
    headingSequenceSimilarity: 0.7,
    severeFeatureSimilarity: 0.94,
    severeFeatureCount: 3,
    ...overrides,
  };
}

const templateBody = [
  "先从一个可以逐项复核的具体问题开始，再说明对象之间的约束。",
  "",
  "## 对象与记号",
  "",
  "这一节固定讨论对象、记号和允许使用的基本运算。",
  "",
  "## 推导与边界",
  "",
  "接下来逐步比较条件变化时结论是否仍然成立。",
  "",
  '<Example id="example-one" title="示例">先列出输入，再逐项计算输出，最后代回定义复核。</Example>',
  "",
  "## 练习与复算",
  "",
  '<Exercise id="exercise-one">先独立写出判断，再用反例检查遗漏的条件。</Exercise>',
  "",
  "最后回到开头的问题：当前结论只在已经列明的边界内成立。",
].join("\n");

describe("content similarity audit", () => {
  it("provides deterministic pure text and heading-sequence similarity", () => {
    assert.equal(textSimilarity("同一段中文文本", "同一段中文文本"), 1);
    assert.equal(textSimilarity("同一段中文文本", "完全不同的对象"), 0);
    assert.equal(headingSequenceSimilarity(["对象", "推导", "练习"], ["对象", "推导", "练习"]), 1);
    assert.equal(
      headingSequenceSimilarity(["对象", "推导", "练习"], ["练习", "推导", "对象"]),
      1 / 3,
    );
  });

  it("extracts every requested comparable content family", () => {
    const features = extractSimilarityFeatures(
      document("a.mdx", "标题甲", "mathematics", "foundations", templateBody),
      config(),
    );
    assert.deepEqual(features.headings, ["对象与记号", "推导与边界", "练习与复算"]);
    assert.ok(features.paragraphOpenings.length >= 3);
    assert.ok(features.introduction.length > 0);
    assert.ok(features.conclusion.length > 0);
    assert.ok(features.examples.length > 0);
    assert.ok(features.exercises.length > 0);
    assert.ok(features.transitions.length > 0);
    assert.ok(features.ngrams.size > 0);
  });

  it("fails only when unrelated articles repeat a strong multi-feature template", () => {
    const report = analyzeSimilarityDocuments(
      [
        document("a.mdx", "有限集合", "mathematics", "foundations", templateBody),
        document("b.mdx", "机械振动", "physics", "waves", templateBody),
      ],
      config(),
      [],
      "2026-07-13T00:00:00.000Z",
    );
    const features = new Set(report.pairs[0]?.findings.map((finding) => finding.feature));
    assert.equal(features.has("heading-sequence"), true);
    assert.equal(features.has("paragraph-opening"), true);
    assert.equal(features.has("introduction"), true);
    assert.equal(features.has("conclusion"), true);
    assert.equal(features.has("example-instruction"), true);
    assert.equal(features.has("exercise-instruction"), true);
    assert.equal(features.has("transition"), true);
    assert.equal(features.has("frequent-ngram"), true);
    assert.equal(features.has("severe-template-repetition"), true);
    assert.equal(report.summary.severeUnrelatedPairs, 1);
    assert.equal(exitCodeForSimilarityReport(report), 1);
  });

  it("keeps strong repetition advisory when topic classification is related", () => {
    const report = analyzeSimilarityDocuments(
      [
        document("a.mdx", "集合定义", "mathematics", "foundations", templateBody),
        document("b.mdx", "映射定义", "mathematics", "foundations", templateBody),
      ],
      config(),
    );
    assert.equal(report.summary.severeUnrelatedPairs, 0);
    assert.equal(exitCodeForSimilarityReport(report), 0);
  });

  it("reserves non-zero status for severe repetition or fatal input errors", () => {
    const report = analyzeSimilarityDocuments([], config(), [
      { file: "content/broken.mdx", message: "frontmatter parse failed" },
    ]);
    assert.equal(report.summary.fatalErrors, 1);
    assert.equal(exitCodeForSimilarityReport(report), 1);
  });
});
