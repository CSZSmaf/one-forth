"use client";

import { BookOpenCheck, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export const pathExerciseStorageKey = "one-forth:path-exercises:v1";
export const pathExerciseProgressEvent = "one-forth:path-exercises-updated";

interface StoredPathExerciseProgress {
  readonly version: 1;
  readonly completedExerciseIds: readonly string[];
}

export interface PathExerciseChapterDto {
  readonly label: string;
  readonly href: string;
}

export interface PathExerciseDto {
  readonly id: string;
  readonly title: string;
  readonly prompt: string;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly hint: string;
  readonly workedSolution: string;
  readonly verification: string;
  readonly chapters: readonly PathExerciseChapterDto[];
}

interface PathExerciseListProps {
  readonly exercises: readonly PathExerciseDto[];
  readonly locale: "zh-CN" | "en";
}

export function readCompletedPathExerciseIds(
  storage: Pick<Storage, "getItem">,
): ReadonlySet<string> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(pathExerciseStorageKey) ?? "null");
    if (!parsed || typeof parsed !== "object") return new Set();
    const candidate = parsed as Partial<StoredPathExerciseProgress>;
    if (candidate.version !== 1 || !Array.isArray(candidate.completedExerciseIds)) {
      return new Set();
    }
    return new Set(
      candidate.completedExerciseIds.filter((id): id is string => typeof id === "string"),
    );
  } catch {
    return new Set();
  }
}

export function writePathExerciseCompletion(
  storage: Pick<Storage, "getItem" | "setItem">,
  exerciseId: string,
  completed: boolean,
): ReadonlySet<string> {
  const next = new Set(readCompletedPathExerciseIds(storage));
  if (completed) next.add(exerciseId);
  else next.delete(exerciseId);
  const snapshot: StoredPathExerciseProgress = {
    version: 1,
    completedExerciseIds: [...next].sort(),
  };
  storage.setItem(pathExerciseStorageKey, JSON.stringify(snapshot));
  return next;
}

export function PathExerciseList({ exercises, locale }: PathExerciseListProps) {
  const [completedIds, setCompletedIds] = useState<ReadonlySet<string>>(new Set());
  const copy = useMemo(
    () =>
      locale === "en"
        ? {
            completed: "Completed",
            notCompleted: "Mark complete",
            progress: "Exercise progress",
            difficulty: "Difficulty",
            chapters: "Related chapters",
            hint: "Show hint",
            solution: "Show worked solution",
            verification: "Result check",
          }
        : {
            completed: "已完成",
            notCompleted: "标记完成",
            progress: "练习完成进度",
            difficulty: "难度",
            chapters: "关联章节",
            hint: "查看提示",
            solution: "展开分步解答",
            verification: "结果核验",
          },
    [locale],
  );

  useEffect(() => {
    const refresh = () => setCompletedIds(readCompletedPathExerciseIds(localStorage));
    const onStorage = (event: StorageEvent) => {
      if (event.key === pathExerciseStorageKey) refresh();
    };
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(pathExerciseProgressEvent, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(pathExerciseProgressEvent, refresh);
    };
  }, []);

  const completedCount = exercises.filter((exercise) => completedIds.has(exercise.id)).length;

  return (
    <div>
      <output aria-live="polite">
        {copy.progress}：{completedCount}/{exercises.length}
      </output>
      {exercises.map((exercise) => {
        const completed = completedIds.has(exercise.id);
        return (
          <article key={exercise.id}>
            <BookOpenCheck aria-hidden="true" size={18} />
            <div>
              <header>
                <p>
                  {copy.difficulty} {exercise.difficulty}/5
                </p>
                <h3>{exercise.title}</h3>
              </header>
              <p>{exercise.prompt}</p>
              <nav aria-label={`${exercise.title} · ${copy.chapters}`}>
                {exercise.chapters.map((chapter) => (
                  <Link key={chapter.href} href={chapter.href}>
                    {chapter.label}
                  </Link>
                ))}
              </nav>
              <details>
                <summary>{copy.hint}</summary>
                <p>{exercise.hint}</p>
              </details>
              <details>
                <summary>{copy.solution}</summary>
                <p>{exercise.workedSolution}</p>
                <p>
                  <strong>{copy.verification}：</strong>
                  {exercise.verification}
                </p>
              </details>
              <button
                type="button"
                aria-pressed={completed}
                aria-label={`${completed ? copy.completed : copy.notCompleted}：${exercise.title}`}
                onClick={() => {
                  const next = writePathExerciseCompletion(localStorage, exercise.id, !completed);
                  setCompletedIds(next);
                  window.dispatchEvent(new Event(pathExerciseProgressEvent));
                }}
              >
                {completed ? (
                  <CheckCircle2 aria-hidden="true" size={16} />
                ) : (
                  <Circle aria-hidden="true" size={16} />
                )}
                {completed ? copy.completed : copy.notCompleted}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
