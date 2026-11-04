import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BookCurriculumAction,
  resolveBookCurriculumAction,
  type BookCurriculumChapterDto,
} from "@/components/book-curriculum-action";
import { learningStateStorageKey, writeChapterLearningState } from "@/lib/learning-state";

const firstChapter: BookCurriculumChapterDto = {
  chapterId: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions",
  chapterNumber: 1,
  title: "命题、量词与逻辑联结词",
  href: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions",
};

const secondChapter: BookCurriculumChapterDto = {
  chapterId: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/sets-mappings",
  chapterNumber: 2,
  title: "集合、映射与关系",
  href: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/sets-mappings",
};

const chapters = [firstChapter, secondChapter] as const;

describe("book curriculum action", () => {
  it("starts at the registered first chapter when this book has no local progress", () => {
    writeChapterLearningState(
      localStorage,
      "m01-equations-inequalities",
      { readingProgress: 90 },
      { now: new Date("2026-07-13T03:00:00.000Z") },
    );

    expect(resolveBookCurriculumAction("zh-CN", firstChapter, chapters, localStorage)).toEqual({
      mode: "start",
      href: firstChapter.href,
      label: "开始本册",
      chapterId: firstChapter.chapterId,
    });
  });

  it("continues the most recently updated chapter in this book at its precise anchor", () => {
    writeChapterLearningState(
      localStorage,
      firstChapter.chapterId,
      { readingProgress: 72, lastAnchor: "theorem-logic-1" },
      { now: new Date("2026-07-13T01:00:00.000Z") },
    );
    writeChapterLearningState(
      localStorage,
      secondChapter.chapterId,
      { readingProgress: 35, lastAnchor: "definition-mapping" },
      { now: new Date("2026-07-13T02:00:00.000Z") },
    );

    expect(resolveBookCurriculumAction("zh-CN", firstChapter, chapters, localStorage)).toEqual({
      mode: "continue",
      href: `${secondChapter.href}#definition-mapping`,
      label: "继续本册 · 第 2 章 集合、映射与关系",
      chapterId: secondChapter.chapterId,
    });

    render(<BookCurriculumAction locale="zh-CN" startChapter={firstChapter} chapters={chapters} />);
    expect(
      screen.getByRole("link", { name: "继续本册 · 第 2 章 集合、映射与关系" }),
    ).toHaveAttribute("href", `${secondChapter.href}#definition-mapping`);
  });

  it("does not serialize a private legacy concept map into the book action", () => {
    localStorage.setItem(
      learningStateStorageKey,
      JSON.stringify({
        version: 2,
        concepts: {
          "sets-and-mappings": {
            conceptId: "sets-and-mappings",
            status: "in-progress",
            progress: 28,
            lastAnchor: "example-image-preimage",
            updatedAt: "2026-07-11T08:00:00.000Z",
          },
        },
        exercises: {},
        paths: {},
      }),
    );

    expect(
      resolveBookCurriculumAction("zh-CN", firstChapter, chapters, localStorage),
    ).toMatchObject({
      mode: "start",
      chapterId: firstChapter.chapterId,
      href: firstChapter.href,
    });
  });
});
