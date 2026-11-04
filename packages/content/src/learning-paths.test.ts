import { describe, expect, it } from "vitest";
import { conceptCatalog } from "./concepts";
import { curriculumRepository } from "./index";
import {
  learningPathAliases,
  learningPathById,
  learningPaths,
  legacyLearningPathsV2,
  requiredRoundTwoLearningPathIds,
  requiredSeriesLearningPathIds,
  requiredTopicalLearningPathIds,
} from "./learning-paths";
import { seriesLearningExerciseByBookId } from "./series-learning-exercises";

describe("learning path schema v4", () => {
  it("keeps the complete v2 catalog as migration input", () => {
    expect(legacyLearningPathsV2.map((path) => path.id)).toEqual([
      ...requiredRoundTwoLearningPathIds,
    ]);
    expect(legacyLearningPathsV2.every((path) => path.schemaVersion === 2)).toBe(true);
  });

  it("publishes topical and complete-series routes with canonical Chapter IDs", () => {
    expect(learningPaths.map((path) => path.id)).toEqual([
      ...requiredTopicalLearningPathIds,
      ...requiredSeriesLearningPathIds,
    ]);
    expect(learningPaths.every((path) => path.schemaVersion === 4)).toBe(true);
    expect([...learningPathById.keys()]).toEqual(learningPaths.map((path) => path.id));
    expect([...learningPathById.values()].every((path) => path.schemaVersion === 4)).toBe(true);

    for (const path of learningPaths) {
      expect(path.routeKind, path.id).toMatch(/^(?:topic|series)$/);
      expect(path.sections.length, path.id).toBeGreaterThan(0);
      expect(
        path.sections.flatMap((section) => section.chapterIds),
        path.id,
      ).toEqual(path.chapterIds);
      expect(path.chapterIds.length, path.id).toBeGreaterThan(0);
      expect(new Set(path.chapterIds).size, path.id).toBe(path.chapterIds.length);
      for (const chapterId of [...path.prerequisiteChapterIds, ...path.chapterIds]) {
        expect(
          curriculumRepository.getChapter(chapterId),
          `${path.id}: ${chapterId}`,
        ).not.toBeNull();
      }
      for (const checkpoint of path.checkpoints) {
        expect(path.chapterIds, `${path.id}: ${checkpoint.id}`).toContain(
          checkpoint.afterChapterId,
        );
      }
    }
  });

  it("covers every registered book and chapter exactly once across required series routes", () => {
    const seriesRoutes = learningPaths.filter((path) => path.routeKind === "series");
    const expectedBooks = curriculumRepository.listBooks();
    const expectedChapters = curriculumRepository.listChapters();
    expect(seriesRoutes.map((path) => path.id)).toEqual([...requiredSeriesLearningPathIds]);
    const sections = seriesRoutes.flatMap((path) => path.sections);
    expect(sections).toHaveLength(expectedBooks.length);
    expect(new Set(sections.map((section) => section.bookId))).toEqual(
      new Set(expectedBooks.map((book) => book.id)),
    );
    expect(sections.flatMap((section) => section.chapterIds)).toHaveLength(expectedChapters.length);
    expect(new Set(sections.flatMap((section) => section.chapterIds))).toEqual(
      new Set(expectedChapters.map((chapter) => chapter.id)),
    );
    for (const section of sections) {
      expect(section.bookId, section.id).toBeDefined();
      expect(section.chapterIds, section.id).toEqual(
        curriculumRepository.listChapters(section.bookId).map((chapter) => chapter.id),
      );
    }
  });

  it("uses one authored, reproducible synthesis problem for every curriculum book", () => {
    const expectedBooks = curriculumRepository.listBooks();
    expect(Object.keys(seriesLearningExerciseByBookId).sort()).toEqual(
      expectedBooks.map((book) => book.id).sort(),
    );

    const seriesRoutes = learningPaths.filter((path) => path.routeKind === "series");
    const exercises = seriesRoutes.flatMap((path) => path.exercises);
    expect(exercises).toHaveLength(expectedBooks.length);
    expect(new Set(exercises.map((exercise) => exercise.prompt["zh-CN"])).size).toBe(
      expectedBooks.length,
    );
    expect(new Set(exercises.map((exercise) => exercise.workedSolution["zh-CN"])).size).toBe(
      expectedBooks.length,
    );

    for (const book of expectedBooks) {
      const spec = seriesLearningExerciseByBookId[book.id];
      const route = seriesRoutes.find((candidate) =>
        candidate.sections.some((section) => section.bookId === book.id),
      );
      const exercise = route?.exercises.find((candidate) => candidate.id.includes(`-${book.id}-`));
      expect(spec, book.id).toBeDefined();
      expect(spec?.sourceChapterId, book.id).toBe(book.reviewChapterId);
      expect(spec?.chapterIds, book.id).toContain(book.reviewChapterId);
      expect(spec?.chapterIds.length, book.id).toBeGreaterThanOrEqual(2);
      expect(new Set(spec?.chapterIds).size, book.id).toBe(spec?.chapterIds.length);
      expect(
        spec?.chapterIds.some((chapterId) => chapterId !== book.reviewChapterId),
        `${book.id}: synthesis must combine the review with another chapter`,
      ).toBe(true);
      for (const chapterId of spec?.chapterIds ?? []) {
        expect(curriculumRepository.getChapter(chapterId)?.bookId, `${book.id}: ${chapterId}`).toBe(
          book.id,
        );
      }
      expect(exercise?.chapterIds, book.id).toEqual(spec?.chapterIds);
      expect(exercise?.prompt["zh-CN"], book.id).toBe(spec?.prompt);
      expect(exercise?.workedSolution["zh-CN"], book.id).toBe(spec?.workedSolution);
      expect(`${spec?.prompt ?? ""}${spec?.workedSolution ?? ""}`, book.id).toMatch(
        /[0-9=<>≤≥+*\/]|∀|∫|证明|算法|轨迹/u,
      );
      expect(spec?.workedSolution, book.id).not.toMatch(/完整解答应包含|选择《|四部分/u);
    }
  });

  it("derives a non-sequential concept projection instead of maintaining a second order", () => {
    for (const path of learningPaths) {
      const chapterIds = new Set(path.chapterIds);
      const expected = conceptCatalog
        .filter((concept) => chapterIds.has(concept.canonicalLocation.chapterId))
        .map((concept) => concept.id)
        .sort();
      expect(path.conceptIds, path.id).toEqual(expected);
      expect(path.conceptIds, path.id).toEqual([...path.conceptIds].sort());
    }
  });

  it("keeps canonical chapter prerequisites earlier or declares them at the route boundary", () => {
    for (const path of learningPaths) {
      const available = new Set(path.prerequisiteChapterIds);
      for (const chapterId of path.chapterIds) {
        const chapter = curriculumRepository.getChapter(chapterId);
        expect(chapter, `${path.id}: ${chapterId}`).not.toBeNull();
        for (const prerequisiteId of chapter?.prerequisiteChapterIds ?? []) {
          expect(
            available.has(prerequisiteId),
            `${path.id}: ${chapterId} <- ${prerequisiteId}`,
          ).toBe(true);
        }
        available.add(chapterId);
      }
    }
  });

  it("turns foundation-course legacy routes into one-hop Book aliases", () => {
    expect(learningPathAliases).toEqual([
      expect.objectContaining({ id: "calculus-foundations", targetBookId: "m02" }),
      expect.objectContaining({ id: "linear-algebra-foundations", targetBookId: "m04" }),
      expect.objectContaining({ id: "probability-statistics-foundations", targetBookId: "m05" }),
    ]);
    for (const alias of learningPathAliases) {
      expect(curriculumRepository.getBook(alias.targetBookId), alias.id).not.toBeNull();
      expect(
        learningPaths.some((path) => path.id === alias.id),
        alias.id,
      ).toBe(false);
      expect(
        legacyLearningPathsV2.some((path) => path.id === alias.id),
        alias.id,
      ).toBe(true);
    }
  });

  it("provides globally stable, chapter-linked exercises for every route", () => {
    const exerciseIds = learningPaths.flatMap((path) =>
      path.exercises.map((exercise) => exercise.id),
    );
    expect(new Set(exerciseIds).size).toBe(exerciseIds.length);

    for (const path of learningPaths) {
      expect(path.exercises.length, path.id).toBeGreaterThanOrEqual(2);
      for (const exercise of path.exercises) {
        expect(exercise.id, path.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(exercise.title["zh-CN"].trim().length, exercise.id).toBeGreaterThan(5);
        expect(exercise.prompt["zh-CN"].trim().length, exercise.id).toBeGreaterThan(35);
        expect(exercise.hint["zh-CN"].trim().length, exercise.id).toBeGreaterThan(15);
        expect(exercise.workedSolution["zh-CN"].trim().length, exercise.id).toBeGreaterThan(30);
        expect(exercise.verification["zh-CN"].trim().length, exercise.id).toBeGreaterThan(20);
        expect(exercise.chapterIds.length, exercise.id).toBeGreaterThan(0);
        for (const chapterId of exercise.chapterIds) {
          expect(
            curriculumRepository.getChapter(chapterId),
            `${exercise.id}: ${chapterId}`,
          ).not.toBeNull();
          expect(path.chapterIds, `${exercise.id}: ${chapterId}`).toContain(chapterId);
        }
      }
    }
  });

  it("uses real M09, M10, A04 and A14 chapters for scientific machine learning", () => {
    const path = learningPaths.find((candidate) => candidate.id === "scientific-machine-learning");
    expect(path?.chapterIds).toEqual(
      expect.arrayContaining([
        "m09-heat-wave-laplace",
        "m10-ode-pde-numerics",
        "a04-computation-graphs",
        "a14-differentiable-physics",
        "a14-pinn",
        "a14-neural-operators",
      ]),
    );
  });

  it("keeps sampled deterministic answer checks internally consistent", () => {
    const calculusDirection = 1 * (3 / 5) + -3 * (4 / 5);
    expect(calculusDirection).toBeCloseTo(-9 / 5);

    const covariance = 0.4 - 0.7 * 0.6;
    expect(covariance).toBeCloseTo(-0.02);

    const scoreUpdate = 2 + 0.4 * (-2 / 4);
    expect(scoreUpdate).toBeCloseTo(1.8);

    const heatModeAmplitude = Math.exp(-0.2 * Math.PI ** 2);
    expect(heatModeAmplitude).toBeCloseTo(0.139, 3);
  });
});
