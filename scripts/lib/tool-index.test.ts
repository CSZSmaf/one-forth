import assert from "node:assert/strict";
import test from "node:test";
import type { LearningPathV4, RevisionHistoryEntry } from "../../packages/content/src/index.ts";
import {
  createToolIndexTextSummary,
  extractResourceUsageClaimGroups,
  extractResourceUsageClaims,
  learningPathReferencesAreReaderVisible,
  referencedLearningPathChapterIds,
  stableRevisionSourceIds,
} from "./tool-index.ts";

test("resource usage claims follow consecutive card groups and strip link markup", () => {
  const source = [
    "## 参考资源",
    "",
    '<ResourceCard id="source-a" />',
    "",
    '<ResourceCard id="source-b" />',
    "",
    "[权威课程](https://example.test/course) 给出卷积定理的假设、归一化约定与反演条件。",
  ].join("\n");
  const claims = extractResourceUsageClaims(source);
  const groups = extractResourceUsageClaimGroups(source);

  assert.deepEqual(
    groups.map((group) => group.resourceIds),
    [["source-a", "source-b"]],
  );
  assert.equal(claims.get("source-a"), "权威课程 给出卷积定理的假设、归一化约定与反演条件。");
  assert.equal(claims.get("source-b"), claims.get("source-a"));
  assert.doesNotMatch(claims.get("source-a") ?? "", /https?:|\[|\]/u);
});

test("resource usage claims never reuse prose that precedes the card group", () => {
  const claims = extractResourceUsageClaims(
    [
      "## 关系与资源",
      "",
      "本节来源支持能量守恒的适用条件以及开放边界下的通量项。",
      "",
      "- 先修关系：守恒律",
      "",
      '<ResourceCard id="source-c" />',
      "",
      "## 后续学习",
      "",
      "这段文字属于下一节，不能作为引用主张。",
    ].join("\n"),
  );

  assert.equal(claims.has("source-c"), false);
  assert.equal(
    extractResourceUsageClaims('## 资源\n\n<ResourceCard id="unresolved" />').has("unresolved"),
    false,
  );
});

test("resource usage claims skip lists and block components before the first explanatory paragraph", () => {
  const claims = extractResourceUsageClaims(
    [
      "## 资源",
      "",
      '<ResourceCard id="source-after-list" />',
      "",
      "- 这是一项导航关系，不是来源支持的主张。",
      "",
      '<InteractiveFigure id="unrelated-figure" />',
      "",
      "该来源逐步推导稳定性条件，并给出误差上界成立所需的正则性假设。",
    ].join("\n"),
  );

  assert.equal(
    claims.get("source-after-list"),
    "该来源逐步推导稳定性条件，并给出误差上界成立所需的正则性假设。",
  );
});

test("tool index summaries preserve complete inline and display TeX fragments", () => {
  const summary = createToolIndexTextSummary(
    [
      "设 $x_{n+1}=x_n^2$，坐标基为 $\\partial/\\partial x^1,",
      "\\ldots,\\partial/\\partial x^n$，并要求",
      "",
      "$$",
      "\\|Tx\\|_Y\\le C\\|x\\|_X",
      "\\quad\\text{对所有 }x\\in X.",
      "$$",
      "",
      "这两个条件共同给出定义。",
    ].join("\n"),
    "回退标题",
  );

  assert.match(summary, /\$x_\{n\+1\}=x_n\^2\$/u);
  assert.match(summary, /\$\$\\\|Tx\\\|_Y\\le C\\\|x\\\|_X \\quad\\text\{对所有 \}x\\in X\.\$\$/u);
  assert.doesNotMatch(summary, /回退标题/u);
});

test("tool index summary truncation never cuts through a TeX fragment", () => {
  const summary = createToolIndexTextSummary(
    `${"定义背景".repeat(40)}，满足 $$\\sum_{i=1}^{n}x_i=1$$ 后得到结论。${"补充说明".repeat(80)}`,
    "回退标题",
  );

  assert.match(summary, /\$\$\\sum_\{i=1\}\^\{n\}x_i=1\$\$/u);
  assert.equal((summary.match(/\$\$/gu) ?? []).length, 2);
  assert.match(summary, /…$/u);
});

test("revision identities survive reordering and unrelated insertion", () => {
  const first: RevisionHistoryEntry = {
    date: "2026-07-11",
    type: "style",
    summary: "调整正文结构并保留原有数学结论。",
  };
  const second: RevisionHistoryEntry = {
    date: "2026-07-12",
    type: "substantive",
    summary: "补充完整推导、例题以及边界条件说明。",
  };
  const inserted: RevisionHistoryEntry = {
    date: "2026-07-10",
    type: "metadata-migration",
    summary: "迁移内容元数据但不改变正文的数学含义。",
  };

  const originalIds = stableRevisionSourceIds([first, second]);
  const reorderedIds = stableRevisionSourceIds([second, first]);
  const insertedIds = stableRevisionSourceIds([inserted, first, second]);
  assert.equal(originalIds[0], reorderedIds[1]);
  assert.equal(originalIds[1], reorderedIds[0]);
  assert.equal(originalIds[0], insertedIds[1]);
  assert.equal(originalIds[1], insertedIds[2]);

  const duplicateIds = stableRevisionSourceIds([first, first, second]);
  assert.notEqual(duplicateIds[0], duplicateIds[1]);
  assert.equal(originalIds[1], duplicateIds[2]);
});

test("learning path index requires every referenced chapter to be reader-visible", () => {
  const path: LearningPathV4 = {
    schemaVersion: 4,
    id: "test-reader-path",
    title: { "zh-CN": "测试路线" },
    summary: { "zh-CN": "验证所有章节引用都参与公开可见性判断。" },
    audience: { "zh-CN": "测试读者" },
    prerequisiteChapterIds: ["chapter-prerequisite"],
    stageGoals: [{ "zh-CN": "完成可见性核对。" }],
    chapterIds: ["chapter-main"],
    routeKind: "topic",
    sections: [
      {
        id: "test-reader-path-section",
        title: { "zh-CN": "可见性检查" },
        goal: { "zh-CN": "核对公开路径引用的全部章节。" },
        chapterIds: ["chapter-main"],
      },
    ],
    estimatedHours: 1,
    checkpoints: [
      {
        id: "checkpoint-test",
        afterChapterId: "chapter-checkpoint",
        prompt: { "zh-CN": "核对检查点章节。" },
      },
    ],
    exercises: [
      {
        id: "exercise-test",
        title: { "zh-CN": "综合练习" },
        chapterIds: ["chapter-exercise"],
        difficulty: 1,
        prompt: { "zh-CN": "核对练习章节。" },
        hint: { "zh-CN": "逐项检查。" },
        workedSolution: { "zh-CN": "四类章节均需可见。" },
        verification: { "zh-CN": "删除任一章节后路线不可见。" },
      },
    ],
  };
  const referenced = referencedLearningPathChapterIds(path);
  assert.deepEqual(referenced, [
    "chapter-prerequisite",
    "chapter-main",
    "chapter-checkpoint",
    "chapter-exercise",
  ]);
  assert.equal(learningPathReferencesAreReaderVisible(path, new Set(referenced)), true);

  for (const hiddenChapterId of referenced) {
    const visible = new Set(referenced);
    visible.delete(hiddenChapterId);
    assert.equal(
      learningPathReferencesAreReaderVisible(path, visible),
      false,
      `${hiddenChapterId} must participate in reader visibility`,
    );
  }
});
