"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface ChapterLearningContextValue {
  readonly chapterId: string;
  readonly legacyDocumentPath?: string;
}

const ChapterLearningContext = createContext<ChapterLearningContextValue | null>(null);

export function ChapterLearningProvider({
  value,
  children,
}: Readonly<{ value: ChapterLearningContextValue; children: ReactNode }>) {
  return (
    <ChapterLearningContext.Provider value={value}>{children}</ChapterLearningContext.Provider>
  );
}

export function useChapterLearningContext(): ChapterLearningContextValue | null {
  return useContext(ChapterLearningContext);
}
