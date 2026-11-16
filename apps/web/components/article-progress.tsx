"use client";

import { Check, Circle, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateBookProgress,
  getChapterLearningState,
  learningStateEvent,
  learningStateStorageKey,
  type ChapterLearningState,
  type ConceptChapterMigrationMap,
  writeChapterLearningState,
} from "@/lib/learning-state";

interface ArticleProgressProps {
  readonly chapterId: string;
  readonly legacyConceptIds?: readonly string[];
  readonly conceptChapterMap?: ConceptChapterMigrationMap;
  readonly bookChapterIds?: readonly string[];
  /** @deprecated Compatibility with the former concept/path progress component. */
  readonly pathConceptIds?: readonly string[];
  /** @deprecated Topical paths no longer define textbook order. */
  readonly pathId?: string;
}

interface PathProgressSnapshot {
  readonly completed: number;
  readonly total: number;
  readonly percent: number;
}

const initialState = (chapterId: string): ChapterLearningState => ({
  chapterId,
  status: "not-started",
  progress: 0,
  readingProgress: 0,
  updatedAt: new Date(0).toISOString(),
});

export function ArticleProgress({
  chapterId,
  legacyConceptIds: explicitLegacyConceptIds,
  conceptChapterMap: explicitConceptChapterMap,
  bookChapterIds: explicitBookChapterIds,
  pathConceptIds,
}: ArticleProgressProps) {
  const legacyConceptIds = useMemo(
    () => explicitLegacyConceptIds ?? [],
    [explicitLegacyConceptIds],
  );
  const bookChapterIds = useMemo(
    () => explicitBookChapterIds ?? pathConceptIds ?? [chapterId],
    [chapterId, explicitBookChapterIds, pathConceptIds],
  );
  const conceptChapterMap = useMemo(
    () =>
      explicitConceptChapterMap ??
      Object.fromEntries(legacyConceptIds.map((legacyId) => [legacyId, chapterId])),
    [chapterId, explicitConceptChapterMap, legacyConceptIds],
  );
  const [state, setState] = useState<ChapterLearningState>(() => initialState(chapterId));
  const [pathProgress, setPathProgress] = useState<PathProgressSnapshot>(() => ({
    completed: 0,
    total: bookChapterIds.length,
    percent: 0,
  }));
  const stateRef = useRef(state);
  const storageReady = useRef(false);
  const lastPersistedReadingProgress = useRef(0);

  const applyState = useCallback((next: ChapterLearningState) => {
    stateRef.current = next;
    lastPersistedReadingProgress.current = next.readingProgress;
    setState(next);
  }, []);

  useEffect(() => {
    const refresh = () => {
      const next = getChapterLearningState(localStorage, chapterId, legacyConceptIds);
      storageReady.current = true;
      applyState(next);
      setPathProgress(calculateBookProgress(localStorage, bookChapterIds, conceptChapterMap));
    };
    refresh();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === learningStateStorageKey) refresh();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(learningStateEvent, refresh);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(learningStateEvent, refresh);
    };
  }, [applyState, bookChapterIds, chapterId, conceptChapterMap, legacyConceptIds]);

  useEffect(() => {
    let scheduled = false;
    let scheduledFrame: number | undefined;
    const persistReadingPosition = () => {
      scheduled = false;
      scheduledFrame = undefined;
      if (!storageReady.current) return;
      const article = document.querySelector<HTMLElement>(".article-main");
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const travelled = Math.max(0, -rect.top + window.innerHeight * 0.4);
      const available = Math.max(1, article.offsetHeight - window.innerHeight * 0.45);
      const readingProgress = Math.min(100, Math.max(1, Math.round((travelled / available) * 100)));
      if (Math.abs(readingProgress - lastPersistedReadingProgress.current) < 5) return;
      const next = writeChapterLearningState(
        localStorage,
        chapterId,
        { readingProgress },
        { legacyConceptIds },
      );
      applyState(next);
    };
    const handleScroll = () => {
      if (scheduled) return;
      scheduled = true;
      scheduledFrame = window.requestAnimationFrame(persistReadingPosition);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scheduledFrame !== undefined) window.cancelAnimationFrame(scheduledFrame);
    };
  }, [applyState, chapterId, legacyConceptIds]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const headings = [
      ...document.querySelectorAll<HTMLElement>(".article-prose h2[id], .article-prose h3[id]"),
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        const id = visible?.target.id;
        if (!id || !storageReady.current) return;
        const next = writeChapterLearningState(
          localStorage,
          chapterId,
          {
            readingProgress: Math.max(1, lastPersistedReadingProgress.current),
            lastAnchor: id,
          },
          { legacyConceptIds },
        );
        applyState(next);
        window.dispatchEvent(new Event(learningStateEvent));
      },
      { rootMargin: "-18% 0px -72% 0px" },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [applyState, chapterId, legacyConceptIds]);

  const updateStatus = () => {
    const completed = stateRef.current.status !== "completed";
    const next = writeChapterLearningState(
      localStorage,
      chapterId,
      {
        status: completed ? "completed" : "in-progress",
        ...(!completed ? { readingProgress: Math.max(1, stateRef.current.readingProgress) } : {}),
      },
      { legacyConceptIds },
    );
    applyState(next);
    window.dispatchEvent(new Event(learningStateEvent));
  };

  const chapterLabel =
    state.status === "completed"
      ? "章节已完成"
      : state.status === "in-progress"
        ? "章节进行中"
        : "章节未开始";

  return (
    <section className="article-learning-progress" aria-label="本地学习进度">
      <div className="article-learning-progress__summary">
        <strong>页面阅读位置</strong>
        <span>{state.readingProgress}%</span>
      </div>
      <div
        className="article-learning-progress__bar"
        role="progressbar"
        aria-label="页面滚动进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={state.readingProgress}
      >
        <span style={{ width: `${state.readingProgress}%` }} />
      </div>
      <div className="article-learning-progress__chapter">
        <span aria-hidden="true">
          {state.status === "completed" ? <Check size={16} /> : <Circle size={14} />}
        </span>
        <strong>{chapterLabel}</strong>
      </div>
      <button type="button" className="button button--secondary" onClick={updateStatus}>
        {state.status === "completed" ? <RotateCcw size={15} /> : <Check size={15} />}
        {state.status === "completed" ? "重新学习" : "标记为完成"}
      </button>
      <div className="article-learning-progress__path">
        <div>
          <strong>本册完成进度</strong>
          <span>
            {pathProgress.completed}/{pathProgress.total} 章 · {pathProgress.percent}%
          </span>
        </div>
        <progress value={pathProgress.percent} max={100} aria-label="本册完成进度" />
      </div>
    </section>
  );
}
