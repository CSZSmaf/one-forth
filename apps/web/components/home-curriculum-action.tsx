"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  learningStateEvent,
  learningStateStorageKey,
  readLearningState,
  type ConceptChapterMigrationMap,
} from "@/lib/learning-state";

export interface HomeCurriculumChapterDto {
  readonly chapterId: string;
  readonly bookTitle: string;
  readonly chapterNumber: number;
  readonly title: string;
  readonly href: string;
}

export interface HomeCurriculumActionDto {
  readonly mode: "start" | "continue";
  readonly contextLabel: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly actionLabel: string;
}

interface HomeCurriculumActionProps {
  readonly conceptChapterMap?: ConceptChapterMigrationMap;
  readonly firstBookTitle: string;
  readonly startChapter: HomeCurriculumChapterDto;
  readonly chapters: readonly HomeCurriculumChapterDto[];
}

function subscribe(callback: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === learningStateStorageKey) callback();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(learningStateEvent, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(learningStateEvent, callback);
  };
}

function getSnapshot(): string {
  return localStorage.getItem(learningStateStorageKey) ?? "";
}

function appendAnchor(href: string, anchor?: string): string {
  return anchor ? `${href}#${anchor.replace(/^#/, "")}` : href;
}

export function resolveHomeCurriculumAction(
  firstBookTitle: string,
  startChapter: HomeCurriculumChapterDto,
  chapters: readonly HomeCurriculumChapterDto[],
  storage: Pick<Storage, "getItem">,
  conceptChapterMap: ConceptChapterMigrationMap = {},
): HomeCurriculumActionDto {
  const learningState = readLearningState(storage, conceptChapterMap);
  const recentChapter = chapters
    .flatMap((chapter) => {
      const state = learningState.chapters[chapter.chapterId];
      return state && state.status !== "not-started" ? [{ chapter, state }] : [];
    })
    .sort(
      (left, right) =>
        right.state.updatedAt.localeCompare(left.state.updatedAt) ||
        left.chapter.chapterId.localeCompare(right.chapter.chapterId),
    )[0];

  if (!recentChapter) {
    return {
      mode: "start",
      contextLabel: "推荐起点",
      title: `${firstBookTitle} · ${startChapter.title}`,
      description: "",
      href: startChapter.href,
      actionLabel: `从《${firstBookTitle}》开始`,
    };
  }

  const readingProgress = Math.max(
    recentChapter.state.readingProgress,
    recentChapter.state.status === "completed" ? 100 : 0,
  );
  return {
    mode: "continue",
    contextLabel: recentChapter.state.status === "completed" ? "最近完成" : "继续上次学习",
    title: `${recentChapter.chapter.bookTitle} · 第 ${recentChapter.chapter.chapterNumber} 章 ${recentChapter.chapter.title}`,
    description: recentChapter.state.status === "completed" ? "" : `已读 ${readingProgress}%`,
    href: appendAnchor(recentChapter.chapter.href, recentChapter.state.lastAnchor),
    actionLabel: recentChapter.state.status === "completed" ? "回到最近章节" : "继续学习",
  };
}

export function HomeCurriculumAction({
  conceptChapterMap,
  firstBookTitle,
  startChapter,
  chapters,
}: HomeCurriculumActionProps) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const action = resolveHomeCurriculumAction(
    firstBookTitle,
    startChapter,
    chapters,
    {
      getItem: () => snapshot || null,
    },
    conceptChapterMap,
  );

  return (
    <div className="home-linear-action" data-mode={action.mode} aria-live="polite">
      <p>{action.contextLabel}</p>
      <strong>{action.title}</strong>
      {action.description ? <span>{action.description}</span> : null}
      <Link className="button button-primary home-linear-primary" href={action.href}>
        {action.actionLabel}
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </div>
  );
}
