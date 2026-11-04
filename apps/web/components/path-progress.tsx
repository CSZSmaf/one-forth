"use client";

import { ArrowRight, CheckCircle2, Circle, LoaderCircle } from "lucide-react";
import { readerDirectoryText, type SupportedLocale } from "@one-forth/config";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  calculateBookProgress,
  getChapterLearningState,
  learningStateEvent,
  learningStateStorageKey,
  readLearningState,
  type ConceptChapterMigrationMap,
  type LearningStatus,
} from "@/lib/learning-state";

const emptyConceptChapterMap: ConceptChapterMigrationMap = {};

interface PathProgressSummaryProps {
  readonly chapterIds: readonly string[];
  readonly chapters?: readonly { readonly href: string; readonly title: string }[];
  readonly locale?: SupportedLocale;
  readonly conceptChapterMap?: ConceptChapterMigrationMap;
}

export function PathProgressSummary({
  chapterIds,
  chapters,
  locale = "zh-CN",
  conceptChapterMap = emptyConceptChapterMap,
}: PathProgressSummaryProps) {
  const [progress, setProgress] = useState({ completed: 0, total: chapterIds.length, percent: 0 });
  const [target, setTarget] = useState(chapterIds[0]);
  const [started, setStarted] = useState(false);
  const text = readerDirectoryText[locale];

  useEffect(() => {
    const refresh = () => {
      setProgress(calculateBookProgress(localStorage, chapterIds, conceptChapterMap));
      const state = readLearningState(localStorage, conceptChapterMap);
      const inProgress = chapterIds
        .filter((id) => state.chapters[id]?.status === "in-progress")
        .sort((a, b) =>
          (state.chapters[b]?.updatedAt ?? "").localeCompare(state.chapters[a]?.updatedAt ?? ""),
        );
      setTarget(
        inProgress[0] ??
          chapterIds.find((id) => state.chapters[id]?.status !== "completed") ??
          chapterIds[0],
      );
      setStarted(
        chapterIds.some((id) => state.chapters[id] && state.chapters[id]?.status !== "not-started"),
      );
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === learningStateStorageKey || event.key === null) refresh();
    };
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(learningStateEvent, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(learningStateEvent, refresh);
    };
  }, [chapterIds, conceptChapterMap]);

  return (
    <section className="path-progress-summary" aria-label={text.progress}>
      <div>
        <span>{text.progress}</span>
        <strong>
          {text.completedCount
            .replace("{done}", String(progress.completed))
            .replace("{total}", String(progress.total))}
        </strong>
      </div>
      <div
        className="path-progress-summary__bar"
        role="progressbar"
        aria-label={text.progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <output>{progress.percent}%</output>
      {chapters && target ? (
        <div className="path-reading-entry">
          <Link className="button button-primary" href={target}>
            {progress.percent === 100 ? text.revisit : started ? text.resume : text.start}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <span>{chapters.find((chapter) => chapter.href === target)?.title}</span>
        </div>
      ) : null}
    </section>
  );
}

const emptyLegacyConceptIds: readonly string[] = [];

export function PathStepStatus({
  chapterId,
  legacyConceptIds = emptyLegacyConceptIds,
  locale = "zh-CN",
}: {
  readonly chapterId: string;
  readonly legacyConceptIds?: readonly string[];
  readonly locale?: SupportedLocale;
}) {
  const [status, setStatus] = useState<LearningStatus>("not-started");

  useEffect(() => {
    const refresh = () =>
      setStatus(getChapterLearningState(localStorage, chapterId, legacyConceptIds).status);
    const onStorage = (event: StorageEvent) => {
      if (event.key === learningStateStorageKey) refresh();
    };
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(learningStateEvent, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(learningStateEvent, refresh);
    };
  }, [chapterId, legacyConceptIds]);

  const text = readerDirectoryText[locale];
  const label =
    status === "completed"
      ? text.completed
      : status === "in-progress"
        ? text.inProgress
        : text.notStarted;
  return (
    <span className="path-step-status" data-status={status}>
      {status === "completed" ? (
        <CheckCircle2 aria-hidden="true" size={15} />
      ) : status === "in-progress" ? (
        <LoaderCircle aria-hidden="true" size={15} />
      ) : (
        <Circle aria-hidden="true" size={15} />
      )}
      {label}
    </span>
  );
}
