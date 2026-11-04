import type { LearningPathV3, LegacyLearningPathV2 } from "./learning-paths";

export type LearningPathConceptChapterResolver = (conceptId: string) => string | undefined;

function migrateConceptIds(
  pathId: string,
  field: string,
  conceptIds: readonly string[],
  resolveChapterId: LearningPathConceptChapterResolver,
): readonly string[] {
  const chapterIds: string[] = [];
  const seen = new Set<string>();

  for (const conceptId of conceptIds) {
    const chapterId = resolveChapterId(conceptId);
    if (!chapterId) {
      throw new Error(
        `Cannot migrate learning path "${pathId}": ${field} concept "${conceptId}" has no canonical Chapter ID`,
      );
    }
    if (seen.has(chapterId)) continue;
    seen.add(chapterId);
    chapterIds.push(chapterId);
  }

  return chapterIds;
}

/**
 * Converts the legacy concept sequence to canonical curriculum nodes without
 * mutating the source record. Repeated concepts in one chapter collapse to a
 * single node while the first chapter occurrence remains stable.
 */
export function migrateLearningPathV2ToV3(
  legacy: LegacyLearningPathV2,
  resolveChapterId: LearningPathConceptChapterResolver,
): LearningPathV3 {
  const chapterIds = migrateConceptIds(
    legacy.id,
    "conceptIds",
    legacy.conceptIds,
    resolveChapterId,
  );
  const chapterSet = new Set(chapterIds);
  const prerequisiteChapterIds = migrateConceptIds(
    legacy.id,
    "prerequisites",
    legacy.prerequisites,
    resolveChapterId,
  ).filter((chapterId) => !chapterSet.has(chapterId));

  return {
    schemaVersion: 3,
    id: legacy.id,
    title: legacy.title,
    summary: legacy.summary,
    audience: legacy.audience,
    prerequisiteChapterIds,
    stageGoals: legacy.stageGoals,
    chapterIds,
    estimatedHours: legacy.estimatedHours,
    checkpoints: legacy.checkpoints.map((checkpoint) => {
      const [afterChapterId] = migrateConceptIds(
        legacy.id,
        `checkpoint ${checkpoint.id}`,
        [checkpoint.afterConceptId],
        resolveChapterId,
      );
      if (!afterChapterId) {
        throw new Error(`Cannot migrate learning path "${legacy.id}": empty checkpoint`);
      }
      return {
        id: checkpoint.id,
        afterChapterId,
        prompt: checkpoint.prompt,
      };
    }),
    exercises: legacy.exercises.map((exercise) => ({
      id: exercise.id,
      title: exercise.title,
      chapterIds: migrateConceptIds(
        legacy.id,
        `exercise ${exercise.id}`,
        exercise.conceptIds,
        resolveChapterId,
      ),
      difficulty: exercise.difficulty,
      prompt: exercise.prompt,
      hint: exercise.hint,
      workedSolution: exercise.workedSolution,
      verification: exercise.verification,
    })),
    ...(legacy.nextPath ? { nextPath: legacy.nextPath } : {}),
  };
}
