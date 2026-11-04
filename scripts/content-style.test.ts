import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentStyleConfig, type ContentStyleConfig } from "./content-style.config.ts";
import { analyzeStyleDocuments, exitCodeForReport, type StyleDocument } from "./content-style.ts";

function testConfig(overrides: Partial<ContentStyleConfig> = {}): ContentStyleConfig {
  return {
    ...contentStyleConfig,
    thresholds: {
      ...contentStyleConfig.thresholds,
      minimumArticleHan: 0,
      minimumSectionHan: 0,
      minimumSingleSentenceParagraphHan: 10_000,
      minimumDuplicateSentenceHan: 10_000,
      minimumDuplicateParagraphHan: 20,
    },
    ...overrides,
  };
}

function document(file: string, body: string): StyleDocument {
  return {
    file,
    title: file,
    body,
    bodyStartLine: 10,
    declaredVisualizations: [],
  };
}

describe("content style audit", () => {
  it("keeps advisory findings non-fatal and honors a local next-block ignore", () => {
    const body = [
      "## 引言",
      "",
      "本页先说明第一个问题。",
      "",
      "<!-- content-style-ignore-next ai-phrase -->",
      "",
      "本页这一次命中应被局部忽略。",
    ].join("\n");
    const report = analyzeStyleDocuments(
      [document("content/zh-CN/example.mdx", body)],
      testConfig({
        thresholds: {
          ...testConfig().thresholds,
          minimumExercises: 0,
          minimumResources: 0,
          minimumCompleteExamples: 0,
        },
      }),
      [],
      "2026-07-11T00:00:00.000Z",
    );

    const aiFindings = report.files[0]?.findings.filter(
      (finding) => finding.ruleId === "ai-phrase",
    );
    assert.equal(aiFindings?.length, 1);
    assert.equal(report.summary.fatalErrors, 0);
    assert.equal(report.summary.suppressedFindings, 1);
  });

  it("supports repository allowlist entries", () => {
    const config = testConfig({
      thresholds: {
        ...testConfig().thresholds,
        minimumExercises: 0,
        minimumResources: 0,
        minimumCompleteExamples: 0,
      },
      allowlist: [
        {
          ruleId: "ai-phrase",
          file: "content/zh-CN/**",
          match: "本页",
          reason: "Synthetic reviewed fixture",
        },
      ],
    });
    const report = analyzeStyleDocuments(
      [document("content/zh-CN/example.mdx", "## 引言\n\n本页说明一个定义。")],
      config,
    );
    assert.equal(
      report.files[0]?.findings.some((finding) => finding.ruleId === "ai-phrase"),
      false,
    );
    assert.equal(report.summary.suppressedFindings, 1);
  });

  it("finds exact cross-document repeated paragraphs", () => {
    const repeated =
      "这是一段足够长的测试文字，用来确认跨文档完全重复段落会被稳定发现并分别定位到两个来源文件。";
    const config = testConfig({
      aiPhrases: [],
      thresholds: {
        ...testConfig().thresholds,
        minimumExercises: 0,
        minimumResources: 0,
        minimumCompleteExamples: 0,
      },
    });
    const report = analyzeStyleDocuments(
      [
        document("content/zh-CN/a.mdx", `## A\n\n${repeated}`),
        document("content/zh-CN/b.mdx", `## B\n\n${repeated}`),
      ],
      config,
    );
    const crossFindings = report.files.flatMap((file) =>
      file.findings.filter((finding) => finding.ruleId === "cross-document-duplicate-paragraph"),
    );
    assert.equal(crossFindings.length, 2);
  });

  it("accepts the configured minimum structural counts", () => {
    const body = [
      "## 例题一",
      "",
      "完整推导一。",
      "",
      "## 示例二",
      "",
      "完整推导二。",
      "",
      "<Exercise>练习一。</Exercise>",
      "<Exercise>练习二。</Exercise>",
      "<Exercise>练习三。</Exercise>",
      '<ResourceCard id="one" />',
      '<ResourceCard id="two" />',
    ].join("\n");
    const report = analyzeStyleDocuments(
      [document("content/zh-CN/complete.mdx", body)],
      testConfig({ aiPhrases: [] }),
    );
    const structuralRules = new Set(["exercise-count", "resource-count", "complete-example-count"]);
    assert.equal(
      report.files[0]?.findings.some((finding) => structuralRules.has(finding.ruleId)),
      false,
    );
  });

  it("counts semantic Example components even without example headings", () => {
    const body = [
      "## 图像变换",
      "",
      '<Example title="平移">完整推导一。</Example>',
      '<Example title="缩放">完整推导二。</Example>',
    ].join("\n");
    const report = analyzeStyleDocuments(
      [document("content/zh-CN/examples.mdx", body)],
      testConfig({
        aiPhrases: [],
        thresholds: {
          ...testConfig().thresholds,
          minimumExercises: 0,
          minimumResources: 0,
        },
      }),
    );
    assert.equal(report.files[0]?.metrics.completeExamples, 2);
    assert.equal(
      report.files[0]?.findings.some((finding) => finding.ruleId === "complete-example-count"),
      false,
    );
  });

  it("reports suspected undefined prose terms and repeated math symbols", () => {
    const body = [
      "## 检查",
      "",
      "OmegaTerm 会改变结果，OmegaTerm 也会改变下一步。",
      "",
      "重复使用符号 $p+p+p$，但这里没有给出它的定义。",
    ].join("\n");
    const report = analyzeStyleDocuments(
      [document("content/zh-CN/undefined.mdx", body)],
      testConfig({
        aiPhrases: [],
        thresholds: {
          ...testConfig().thresholds,
          minimumExercises: 0,
          minimumResources: 0,
          minimumCompleteExamples: 0,
        },
      }),
    );
    const rules = new Set(report.files[0]?.findings.map((finding) => finding.ruleId));
    assert.equal(rules.has("suspected-undefined-term"), true);
    assert.equal(rules.has("suspected-undefined-symbol"), true);
  });

  it("keeps content findings exit-zero and reserves non-zero for fatal input errors", () => {
    const advisory = analyzeStyleDocuments(
      [document("content/zh-CN/advisory.mdx", "## 短文\n\n本页很短。")],
      testConfig(),
    );
    const fatal = analyzeStyleDocuments([], testConfig(), [
      { file: "content/broken.mdx", message: "frontmatter parse failed" },
    ]);
    assert.equal(exitCodeForReport(advisory), 0);
    assert.equal(exitCodeForReport(fatal), 1);
  });

  it("reports lexical density and prose-pattern candidates without making them fatal", () => {
    const body = [
      "## 推导",
      "",
      "这个量可以计算，可以比较，可以复核，可以绘图，也可以代回原式。",
      "",
      "通过逐项枚举来验证结论。需要注意边界条件。这意味着定义域不能省略。本质上这只是一个候选概括。",
      "",
      "该结论由前述等式给出。",
    ].join("\n");
    const report = analyzeStyleDocuments(
      [document("content/zh-CN/patterns.mdx", body)],
      testConfig({
        aiPhrases: [],
        thresholds: {
          ...testConfig().thresholds,
          minimumExercises: 0,
          minimumResources: 0,
          minimumCompleteExamples: 0,
          minimumCanOccurrences: 5,
          maximumCanPerThousandHan: 1,
        },
      }),
    );
    const rules = new Set(report.files[0]?.findings.map((finding) => finding.ruleId));
    assert.equal(rules.has("can-frequency"), true);
    assert.equal(rules.has("through-to-construction"), true);
    assert.equal(rules.has("attention-marker"), true);
    assert.equal(rules.has("implication-marker"), true);
    assert.equal(rules.has("essentially-marker"), true);
    assert.equal(rules.has("passive-voice-candidate"), true);
    assert.equal(exitCodeForReport(report), 0);
  });

  it("finds generic framing, unfinished markers, and internal editorial leakage", () => {
    const body = [
      "本文将介绍一个重要概念。",
      "",
      "## 对象",
      "",
      "审阅状态说明：本文仍是 `draft`。TODO：待补证明。",
      "",
      "综上所述，本章介绍了这个概念。",
    ].join("\n");
    const report = analyzeStyleDocuments(
      [document("content/zh-CN/leakage.mdx", body)],
      testConfig({
        aiPhrases: [],
        thresholds: {
          ...testConfig().thresholds,
          minimumExercises: 0,
          minimumResources: 0,
          minimumCompleteExamples: 0,
        },
      }),
    );
    const rules = new Set(report.files[0]?.findings.map((finding) => finding.ruleId));
    assert.equal(rules.has("generic-introduction"), true);
    assert.equal(rules.has("generic-conclusion"), true);
    assert.equal(rules.has("todo-marker"), true);
    assert.equal(rules.has("editorial-term-leakage"), true);
  });

  it("finds repeated, adjacent-similar, and cross-document-similar H2 headings", () => {
    const config = testConfig({
      aiPhrases: [],
      thresholds: {
        ...testConfig().thresholds,
        minimumExercises: 0,
        minimumResources: 0,
        minimumCompleteExamples: 0,
        minimumComparableHeadingCharacters: 4,
        adjacentHeadingSimilarity: 0.6,
        crossDocumentHeadingSimilarity: 0.9,
      },
    });
    const report = analyzeStyleDocuments(
      [
        document(
          "content/zh-CN/a.mdx",
          [
            "## 有限集合的结构分析",
            "",
            "第一节正文。",
            "",
            "## 有限集合的结构解析",
            "",
            "第二节正文。",
            "",
            "## 有限集合的结构分析",
            "",
            "第三节正文。",
            "",
            "## 实验数据的误差分析",
            "",
            "第四节正文。",
          ].join("\n"),
        ),
        document("content/zh-CN/b.mdx", "## 实验数据的误差分析\n\n另一学科的正文。"),
      ],
      config,
    );
    const rules = new Set(
      report.files.flatMap((file) => file.findings.map((finding) => finding.ruleId)),
    );
    assert.equal(rules.has("duplicate-heading"), true);
    assert.equal(rules.has("adjacent-heading-similarity"), true);
    assert.equal(rules.has("cross-document-heading-similarity"), true);
  });
});
