import { describe, expect, it } from "vitest";
import {
  calculateBookProgress,
  getChapterLearningState,
  getExerciseLearningState,
  getPathLearningState,
  learningStateStorageKey,
  readLearningState,
  writeChapterLearningState,
  writeExerciseLearningState,
  writePathLearningState,
} from "@/lib/learning-state";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("learning state", () => {
  it("keeps completed progress and anchors when a subject URL changes", () => {
    const storage = memoryStorage();
    const oldPath =
      "/zh-CN/books/computing-ai/programming-scientific-computing-foundations/programs-types-control";
    const newPath = oldPath.replace("/computing-ai/", "/computer-science/");
    storage.setItem(
      learningStateStorageKey,
      JSON.stringify({
        version: 3,
        chapters: {
          [oldPath]: {
            chapterId: oldPath,
            status: "completed",
            progress: 100,
            readingProgress: 72,
            lastAnchor: "example-programs-bisection",
            updatedAt: "2026-10-20T00:00:00Z",
            completedAt: "2026-10-20T00:00:00Z",
          },
          [newPath]: {
            chapterId: newPath,
            status: "in-progress",
            progress: 20,
            readingProgress: 20,
            updatedAt: "2026-10-25T00:00:00Z",
          },
        },
        legacyConcepts: {},
        exercises: {},
        paths: {
          saved: { pathId: "saved", currentChapterId: oldPath, updatedAt: "2026-10-20T00:00:00Z" },
        },
      }),
    );
    const state = readLearningState(storage);
    expect(Object.keys(state.chapters)).toEqual([newPath]);
    expect(state.chapters[newPath]).toMatchObject({
      status: "completed",
      readingProgress: 72,
      lastAnchor: "example-programs-bisection",
    });
    expect(state.paths.saved?.currentChapterId).toBe(newPath);
    expect(state.version).toBe(3);
    // Reading never rewrites browser storage. Normalization remains compatible with old records.
    expect(storage.getItem(learningStateStorageKey)).toContain(oldPath);
  });
  it("keeps reading position separate from explicit chapter completion", () => {
    const storage = memoryStorage();
    writeChapterLearningState(
      storage,
      "m04-vectors",
      { progress: 38 },
      {
        now: new Date("2026-07-11"),
      },
    );
    expect(getChapterLearningState(storage, "m04-vectors")).toMatchObject({
      status: "in-progress",
      progress: 38,
      readingProgress: 38,
    });
    writeChapterLearningState(storage, "m04-vectors", { status: "completed" });
    expect(getChapterLearningState(storage, "m04-vectors")).toMatchObject({
      status: "completed",
      progress: 100,
      readingProgress: 38,
    });

    writeChapterLearningState(storage, "m04-vectors", {
      readingProgress: 72,
      lastAnchor: "projection",
    });
    expect(getChapterLearningState(storage, "m04-vectors")).toMatchObject({
      status: "completed",
      progress: 100,
      readingProgress: 72,
      lastAnchor: "projection",
    });
    expect(storage.getItem(learningStateStorageKey)).toContain('"version":3');
  });

  it("migrates v1 concept and exercise records without losing completion", () => {
    const storage = memoryStorage();
    storage.setItem(
      learningStateStorageKey,
      JSON.stringify({
        version: 1,
        concepts: {
          vectors: {
            conceptId: "vectors",
            status: "completed",
            progress: 100,
            updatedAt: "2026-07-10T10:00:00.000Z",
          },
          matrices: {
            conceptId: "matrices",
            status: "in-progress",
            progress: 45,
            updatedAt: "2026-07-10T11:00:00.000Z",
          },
        },
        exercises: {
          exercise: {
            exerciseId: "exercise",
            completed: true,
            updatedAt: "2026-07-10T12:00:00.000Z",
          },
        },
      }),
    );

    expect(
      readLearningState(storage, {
        vectors: "m04-vectors",
        matrices: "m04-matrices",
      }),
    ).toMatchObject({
      version: 3,
      chapters: {
        "m04-vectors": { status: "completed", progress: 100, readingProgress: 100 },
        "m04-matrices": { status: "in-progress", progress: 45, readingProgress: 45 },
      },
      legacyConcepts: {},
      exercises: { exercise: { completed: true } },
      paths: {},
    });

    writeChapterLearningState(
      storage,
      "m04-matrices",
      {
        readingProgress: 55,
        pathId: "linear-algebra-foundations",
      },
      { legacyConceptIds: ["matrices"] },
    );
    expect(getChapterLearningState(storage, "m04-vectors", ["vectors"])).toMatchObject({
      status: "completed",
    });
    expect(getExerciseLearningState(storage, "exercise")).toMatchObject({ completed: true });
    expect(getPathLearningState(storage, "linear-algebra-foundations")).toMatchObject({
      currentChapterId: "m04-matrices",
    });
  });

  it("calculates book completion without treating partial reading as complete", () => {
    const storage = memoryStorage();
    writeChapterLearningState(storage, "m04-vectors", { status: "completed" });
    writeChapterLearningState(storage, "m04-matrices", { progress: 70 });
    expect(
      calculateBookProgress(storage, ["m04-vectors", "m04-matrices", "m04-determinants"]),
    ).toEqual({
      completed: 1,
      total: 3,
      percent: 33,
    });
  });

  it("persists exercise completion without overwriting article progress", () => {
    const storage = memoryStorage();
    writeChapterLearningState(storage, "m04-vectors", { progress: 52 });
    writeExerciseLearningState(storage, "/zh-CN/learn/vectors#exercise-1", true);
    writeExerciseLearningState(storage, "m04-vectors#exercise-1", true, new Date(), [
      "/zh-CN/learn/vectors#exercise-1",
    ]);
    expect(getExerciseLearningState(storage, "m04-vectors#exercise-1")).toMatchObject({
      completed: true,
    });
    expect(getChapterLearningState(storage, "m04-vectors")).toMatchObject({ progress: 52 });
  });

  it("stores an explicit current chapter for a learning path", () => {
    const storage = memoryStorage();
    writePathLearningState(
      storage,
      "linear-algebra-foundations",
      "vector-operations",
      new Date("2026-07-11T08:00:00.000Z"),
    );
    expect(getPathLearningState(storage, "linear-algebra-foundations")).toEqual({
      pathId: "linear-algebra-foundations",
      currentChapterId: "vector-operations",
      updatedAt: "2026-07-11T08:00:00.000Z",
    });
  });
});
