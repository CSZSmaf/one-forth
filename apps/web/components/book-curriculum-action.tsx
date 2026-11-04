"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  learningStateEvent,
  learningStateStorageKey,
  readLearningState,
} from "@/lib/learning-state";

export interface BookCurriculumChapterDto {
  readonly chapterId: string;
  readonly chapterNumber: number;
  readonly title: string;
  readonly href: string;
}

export interface BookCurriculumActionState {
  readonly mode: "start" | "continue";
  readonly href: string;
  readonly label: string;
  readonly chapterId: string;
}

interface BookCurriculumActionProps {
  readonly locale: "zh-CN" | "en";
  readonly startChapter: BookCurriculumChapterDto;
  readonly chapters: readonly BookCurriculumChapterDto[];
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

export function resolveBookCurriculumAction(
  locale: "zh-CN" | "en",
  startChapter: BookCurriculumChapterDto,
  chapters: readonly BookCurriculumChapterDto[],
  storage: Pick<Storage, "getItem">,
): BookCurriculumActionState {
  const learningState = readLearningState(storage);
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
      href: startChapter.href,
      label: locale === "en" ? "Start this book" : "开始本册",
      chapterId: startChapter.chapterId,
    };
  }

  return {
    mode: "continue",
    href: appendAnchor(recentChapter.chapter.href, recentChapter.state.lastAnchor),
    label:
      locale === "en"
        ? `Continue this book · Chapter ${recentChapter.chapter.chapterNumber} ${recentChapter.chapter.title}`
        : `继续本册 · 第 ${recentChapter.chapter.chapterNumber} 章 ${recentChapter.chapter.title}`,
    chapterId: recentChapter.chapter.chapterId,
  };
}

export function BookCurriculumAction({
  locale,
  startChapter,
  chapters,
}: BookCurriculumActionProps) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const action = resolveBookCurriculumAction(locale, startChapter, chapters, {
    getItem: (key) => (key === learningStateStorageKey && snapshot ? snapshot : null),
  });

  return (
    <Link
      className="button"
      data-learning-action={action.mode}
      data-chapter-id={action.chapterId}
      href={action.href}
    >
      {action.label}
    </Link>
  );
}
