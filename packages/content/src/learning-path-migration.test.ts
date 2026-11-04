import { describe, expect, it } from "vitest";
import { migrateLearningPathV2ToV3 } from "./learning-path-migration";
import type { LegacyLearningPathV2 } from "./learning-paths";

const legacyPath: LegacyLearningPathV2 = {
  schemaVersion: 2,
  id: "migration-fixture",
  title: { "zh-CN": "迁移样例" },
  summary: { "zh-CN": "用于验证迁移行为。" },
  audience: { "zh-CN": "测试" },
  prerequisites: ["prerequisite"],
  stageGoals: [{ "zh-CN": "保持顺序和语义。" }],
  conceptIds: ["alpha", "alpha-detail", "beta"],
  estimatedHours: 2,
  checkpoints: [
    {
      id: "checkpoint-alpha",
      afterConceptId: "alpha-detail",
      prompt: { "zh-CN": "检查第一章。" },
    },
  ],
  exercises: [
    {
      id: "exercise-alpha-beta",
      title: { "zh-CN": "跨章练习" },
      conceptIds: ["alpha", "alpha-detail", "beta"],
      difficulty: 2,
      prompt: { "zh-CN": "完成跨章练习。" },
      hint: { "zh-CN": "先处理第一章。" },
      workedSolution: { "zh-CN": "再处理第二章。" },
      verification: { "zh-CN": "逐项复算。" },
    },
  ],
};

const chapterByConcept: Readonly<Record<string, string>> = {
  prerequisite: "chapter-prerequisite",
  alpha: "chapter-alpha",
  "alpha-detail": "chapter-alpha",
  beta: "chapter-beta",
};

describe("learning path schema v2 to v3 migration", () => {
  it("replaces ordered concepts with de-duplicated canonical Chapter IDs", () => {
    const snapshot = structuredClone(legacyPath);
    const migrated = migrateLearningPathV2ToV3(
      legacyPath,
      (conceptId) => chapterByConcept[conceptId],
    );

    expect(migrated).toMatchObject({
      schemaVersion: 3,
      chapterIds: ["chapter-alpha", "chapter-beta"],
      prerequisiteChapterIds: ["chapter-prerequisite"],
      checkpoints: [{ afterChapterId: "chapter-alpha" }],
      exercises: [{ chapterIds: ["chapter-alpha", "chapter-beta"] }],
    });
    expect(legacyPath).toEqual(snapshot);
    expect("conceptIds" in migrated).toBe(false);
  });

  it("fails with path and field context when a concept lacks a canonical chapter", () => {
    expect(() => migrateLearningPathV2ToV3(legacyPath, () => undefined)).toThrow(
      'Cannot migrate learning path "migration-fixture": conceptIds concept "alpha" has no canonical Chapter ID',
    );
  });
});
