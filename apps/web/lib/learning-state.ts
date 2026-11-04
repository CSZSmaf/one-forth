import { normalizeCurriculumPath } from "@one-forth/config";

export type LearningStatus = "not-started" | "in-progress" | "completed";

interface ReadingState {
  readonly status: LearningStatus;
  /** Kept for compatibility with the second-generation progress UI. */
  readonly progress: number;
  readonly readingProgress: number;
  readonly lastAnchor?: string;
  readonly updatedAt: string;
  readonly completedAt?: string;
}

export interface ChapterLearningState extends ReadingState {
  readonly chapterId: string;
}

/** @deprecated Use ChapterLearningState and the chapter-based APIs. */
export interface ConceptLearningState extends ReadingState {
  readonly conceptId: string;
}

export interface ExerciseLearningState {
  readonly exerciseId: string;
  readonly completed: boolean;
  readonly updatedAt: string;
}

export interface PathLearningState {
  readonly pathId: string;
  readonly currentChapterId?: string;
  /** Retained only until an old path record can be mapped to a chapter. */
  readonly legacyCurrentConceptId?: string;
  readonly updatedAt: string;
}

export interface LearningStateEnvelope {
  readonly version: 3;
  readonly chapters: Readonly<Record<string, ChapterLearningState>>;
  /** Lossless holding area for v1/v2 records that have not yet been mapped. */
  readonly legacyConcepts: Readonly<Record<string, ConceptLearningState>>;
  readonly exercises: Readonly<Record<string, ExerciseLearningState>>;
  readonly paths: Readonly<Record<string, PathLearningState>>;
}

interface LearningStateCandidate {
  readonly version?: unknown;
  readonly chapters?: unknown;
  readonly concepts?: unknown;
  readonly legacyConcepts?: unknown;
  readonly exercises?: unknown;
  readonly paths?: unknown;
}

interface LegacyPathCandidate {
  readonly currentChapterId?: unknown;
  readonly currentConceptId?: unknown;
  readonly legacyCurrentConceptId?: unknown;
  readonly updatedAt?: unknown;
}

export type ConceptChapterMigrationMap = Readonly<Record<string, string>>;

export const learningStateStorageKey = "one-forth-learning-progress";
export const learningStateEvent = "one-forth:learning-state";

const epoch = new Date(0).toISOString();
const emptyEnvelope: LearningStateEnvelope = {
  version: 3,
  chapters: {},
  legacyConcepts: {},
  exercises: {},
  paths: {},
};

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function normalizeReadingState(value: unknown): ReadingState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<ReadingState>;
  const legacyProgress = clampProgress(Number(state.progress ?? 0));
  const readingProgress = clampProgress(Number(state.readingProgress ?? legacyProgress));
  const status: LearningStatus =
    state.status === "completed" || legacyProgress === 100
      ? "completed"
      : state.status === "in-progress" || readingProgress > 0
        ? "in-progress"
        : "not-started";
  return {
    status,
    progress: status === "completed" ? 100 : Math.min(99, readingProgress),
    readingProgress,
    updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : epoch,
    ...(typeof state.lastAnchor === "string" ? { lastAnchor: state.lastAnchor } : {}),
    ...(status === "completed" && typeof state.completedAt === "string"
      ? { completedAt: state.completedAt }
      : {}),
  };
}

function readingStateRank(state: ReadingState): number {
  return state.status === "completed" ? 2 : state.status === "in-progress" ? 1 : 0;
}

function preferReadingState(left: ReadingState | undefined, right: ReadingState): ReadingState {
  if (!left) return right;
  const rankDifference = readingStateRank(right) - readingStateRank(left);
  if (rankDifference !== 0) return rankDifference > 0 ? right : left;
  return right.updatedAt > left.updatedAt ? right : left;
}

function normalizeState(
  value: unknown,
  conceptChapterMap: ConceptChapterMigrationMap,
): LearningStateEnvelope {
  if (!value || typeof value !== "object") return emptyEnvelope;
  const candidate = value as LearningStateCandidate;
  if (candidate.version !== 1 && candidate.version !== 2 && candidate.version !== 3) {
    return emptyEnvelope;
  }

  const chapters: Record<string, ChapterLearningState> = {};
  if (candidate.version === 3 && candidate.chapters && typeof candidate.chapters === "object") {
    for (const [chapterId, raw] of Object.entries(candidate.chapters)) {
      const state = normalizeReadingState(raw);
      if (state) {
        const canonicalId = normalizeCurriculumPath(chapterId);
        chapters[canonicalId] = {
          chapterId: canonicalId,
          ...preferReadingState(chapters[canonicalId], state),
        };
      }
    }
  }

  const legacyConcepts: Record<string, ConceptLearningState> = {};
  const legacySources = [candidate.concepts, candidate.legacyConcepts];
  for (const source of legacySources) {
    if (!source || typeof source !== "object") continue;
    for (const [conceptId, raw] of Object.entries(source)) {
      const state = normalizeReadingState(raw);
      if (!state) continue;
      const chapterId = conceptChapterMap[conceptId];
      if (chapterId) {
        const preferred = preferReadingState(chapters[chapterId], state);
        chapters[chapterId] = { chapterId, ...preferred };
      } else {
        legacyConcepts[conceptId] = { conceptId, ...state };
      }
    }
  }

  const exercises: Record<string, ExerciseLearningState> = {};
  if (candidate.exercises && typeof candidate.exercises === "object") {
    for (const [exerciseId, raw] of Object.entries(candidate.exercises)) {
      if (!raw || typeof raw !== "object") continue;
      const state = raw as Partial<ExerciseLearningState>;
      exercises[exerciseId] = {
        exerciseId,
        completed: state.completed === true,
        updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : epoch,
      };
    }
  }

  const paths: Record<string, PathLearningState> = {};
  if (candidate.paths && typeof candidate.paths === "object") {
    for (const [pathId, raw] of Object.entries(candidate.paths)) {
      if (!raw || typeof raw !== "object") continue;
      const state = raw as LegacyPathCandidate;
      const legacyConceptId =
        typeof state.legacyCurrentConceptId === "string"
          ? state.legacyCurrentConceptId
          : typeof state.currentConceptId === "string"
            ? state.currentConceptId
            : undefined;
      const mappedChapterId = legacyConceptId ? conceptChapterMap[legacyConceptId] : undefined;
      const currentChapterId =
        typeof state.currentChapterId === "string"
          ? normalizeCurriculumPath(state.currentChapterId)
          : mappedChapterId;
      paths[pathId] = {
        pathId,
        updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : epoch,
        ...(currentChapterId ? { currentChapterId } : {}),
        ...(!currentChapterId && legacyConceptId
          ? { legacyCurrentConceptId: legacyConceptId }
          : {}),
      };
    }
  }

  return { version: 3, chapters, legacyConcepts, exercises, paths };
}

export function readLearningState(
  storage: Pick<Storage, "getItem">,
  conceptChapterMap: ConceptChapterMigrationMap = {},
): LearningStateEnvelope {
  const serialized = storage.getItem(learningStateStorageKey);
  if (!serialized) return emptyEnvelope;
  try {
    return normalizeState(JSON.parse(serialized), conceptChapterMap);
  } catch {
    return emptyEnvelope;
  }
}

function persistLearningState(
  storage: Pick<Storage, "setItem">,
  envelope: LearningStateEnvelope,
): void {
  storage.setItem(learningStateStorageKey, JSON.stringify(envelope));
}

function initialChapterState(chapterId: string): ChapterLearningState {
  return {
    chapterId,
    status: "not-started",
    progress: 0,
    readingProgress: 0,
    updatedAt: epoch,
  };
}

export function getChapterLearningState(
  storage: Pick<Storage, "getItem">,
  chapterId: string,
  legacyConceptIds: readonly string[] = [],
): ChapterLearningState {
  const map = Object.fromEntries(legacyConceptIds.map((conceptId) => [conceptId, chapterId]));
  return readLearningState(storage, map).chapters[chapterId] ?? initialChapterState(chapterId);
}

export function writeChapterLearningState(
  storage: Pick<Storage, "getItem" | "setItem">,
  chapterId: string,
  update: {
    readonly progress?: number;
    readonly readingProgress?: number;
    readonly status?: LearningStatus;
    readonly lastAnchor?: string;
    readonly pathId?: string;
  },
  options: {
    readonly legacyConceptIds?: readonly string[];
    readonly now?: Date;
  } = {},
): ChapterLearningState {
  const legacyConceptIds = options.legacyConceptIds ?? [];
  const conceptChapterMap = Object.fromEntries(
    legacyConceptIds.map((conceptId) => [conceptId, chapterId]),
  );
  const envelope = readLearningState(storage, conceptChapterMap);
  const previous = envelope.chapters[chapterId];
  const requestedReadingProgress = clampProgress(
    update.readingProgress ??
      (update.status === "completed" ? previous?.readingProgress : update.progress) ??
      previous?.readingProgress ??
      previous?.progress ??
      0,
  );
  const status: LearningStatus =
    update.status === "completed"
      ? "completed"
      : update.status === "in-progress" || update.status === "not-started"
        ? update.status
        : previous?.status === "completed"
          ? "completed"
          : requestedReadingProgress > 0
            ? "in-progress"
            : "not-started";
  const readingProgress = status === "not-started" ? 0 : requestedReadingProgress;
  const timestamp = (options.now ?? new Date()).toISOString();
  const next: ChapterLearningState = {
    chapterId,
    status,
    progress: status === "completed" ? 100 : Math.min(99, readingProgress),
    readingProgress,
    updatedAt: timestamp,
    ...(update.lastAnchor
      ? { lastAnchor: update.lastAnchor }
      : previous?.lastAnchor
        ? { lastAnchor: previous.lastAnchor }
        : {}),
    ...(status === "completed" ? { completedAt: previous?.completedAt ?? timestamp } : {}),
  };
  const paths = update.pathId
    ? {
        ...envelope.paths,
        [update.pathId]: {
          pathId: update.pathId,
          currentChapterId: chapterId,
          updatedAt: timestamp,
        },
      }
    : envelope.paths;
  persistLearningState(storage, {
    version: 3,
    chapters: { ...envelope.chapters, [chapterId]: next },
    legacyConcepts: envelope.legacyConcepts,
    exercises: envelope.exercises,
    paths,
  });
  return next;
}

export function getExerciseLearningState(
  storage: Pick<Storage, "getItem">,
  exerciseId: string,
  legacyExerciseIds: readonly string[] = [],
): ExerciseLearningState {
  const exercises = readLearningState(storage).exercises;
  return (
    exercises[exerciseId] ??
    legacyExerciseIds.map((id) => exercises[id]).find(Boolean) ?? {
      exerciseId,
      completed: false,
      updatedAt: epoch,
    }
  );
}

export function writeExerciseLearningState(
  storage: Pick<Storage, "getItem" | "setItem">,
  exerciseId: string,
  completed: boolean,
  now = new Date(),
  legacyExerciseIds: readonly string[] = [],
): ExerciseLearningState {
  const envelope = readLearningState(storage);
  const next: ExerciseLearningState = {
    exerciseId,
    completed,
    updatedAt: now.toISOString(),
  };
  const exercises = { ...envelope.exercises };
  for (const legacyId of legacyExerciseIds) delete exercises[legacyId];
  exercises[exerciseId] = next;
  persistLearningState(storage, { ...envelope, exercises });
  return next;
}

export function getPathLearningState(
  storage: Pick<Storage, "getItem">,
  pathId: string,
  conceptChapterMap: ConceptChapterMigrationMap = {},
): PathLearningState | undefined {
  return readLearningState(storage, conceptChapterMap).paths[pathId];
}

export function writePathLearningState(
  storage: Pick<Storage, "getItem" | "setItem">,
  pathId: string,
  currentChapterId: string | undefined,
  now = new Date(),
): PathLearningState {
  const envelope = readLearningState(storage);
  const next: PathLearningState = {
    pathId,
    updatedAt: now.toISOString(),
    ...(currentChapterId ? { currentChapterId } : {}),
  };
  persistLearningState(storage, {
    ...envelope,
    paths: { ...envelope.paths, [pathId]: next },
  });
  return next;
}

export function calculateBookProgress(
  storage: Pick<Storage, "getItem">,
  chapterIds: readonly string[],
  conceptChapterMap: ConceptChapterMigrationMap = {},
): { readonly completed: number; readonly total: number; readonly percent: number } {
  const chapters = readLearningState(storage, conceptChapterMap).chapters;
  const completed = chapterIds.filter(
    (chapterId) => chapters[chapterId]?.status === "completed",
  ).length;
  return {
    completed,
    total: chapterIds.length,
    percent: chapterIds.length === 0 ? 0 : Math.round((completed / chapterIds.length) * 100),
  };
}

/** @deprecated Compatibility adapter for non-curriculum callers. */
export function getConceptLearningState(
  storage: Pick<Storage, "getItem">,
  conceptId: string,
): ConceptLearningState {
  const state = getChapterLearningState(storage, conceptId, [conceptId]);
  return {
    conceptId,
    status: state.status,
    progress: state.progress,
    readingProgress: state.readingProgress,
    updatedAt: state.updatedAt,
    ...(state.lastAnchor ? { lastAnchor: state.lastAnchor } : {}),
    ...(state.completedAt ? { completedAt: state.completedAt } : {}),
  };
}

/** @deprecated Compatibility adapter for non-curriculum callers. */
export function writeConceptLearningState(
  storage: Pick<Storage, "getItem" | "setItem">,
  conceptId: string,
  update: {
    readonly progress?: number;
    readonly readingProgress?: number;
    readonly status?: LearningStatus;
    readonly lastAnchor?: string;
    readonly pathId?: string;
  },
  now = new Date(),
): ConceptLearningState {
  const state = writeChapterLearningState(storage, conceptId, update, {
    legacyConceptIds: [conceptId],
    now,
  });
  return {
    conceptId,
    status: state.status,
    progress: state.progress,
    readingProgress: state.readingProgress,
    updatedAt: state.updatedAt,
    ...(state.lastAnchor ? { lastAnchor: state.lastAnchor } : {}),
    ...(state.completedAt ? { completedAt: state.completedAt } : {}),
  };
}

/** @deprecated Use calculateBookProgress with Chapter IDs. */
export function calculatePathProgress(
  storage: Pick<Storage, "getItem">,
  conceptIds: readonly string[],
): { readonly completed: number; readonly total: number; readonly percent: number } {
  const conceptMap = Object.fromEntries(conceptIds.map((conceptId) => [conceptId, conceptId]));
  const chapters = readLearningState(storage, conceptMap).chapters;
  const completed = conceptIds.filter(
    (conceptId) => chapters[conceptId]?.status === "completed",
  ).length;
  return {
    completed,
    total: conceptIds.length,
    percent: conceptIds.length === 0 ? 0 : Math.round((completed / conceptIds.length) * 100),
  };
}
