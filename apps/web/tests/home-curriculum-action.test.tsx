import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HomeCurriculumAction,
  resolveHomeCurriculumAction,
  type HomeCurriculumChapterDto,
} from "@/components/home-curriculum-action";
import { learningStateStorageKey, writeChapterLearningState } from "@/lib/learning-state";

const startChapter: HomeCurriculumChapterDto = {
  chapterId: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions",
  bookTitle: "数学语言、集合与证明",
  chapterNumber: 1,
  title: "命题、量词与逻辑联结词",
  href: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions",
};

const setsChapter: HomeCurriculumChapterDto = {
  chapterId: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/sets-mappings",
  bookTitle: "数学语言、集合与证明",
  chapterNumber: 2,
  title: "集合、映射与关系",
  href: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/sets-mappings",
};

const chapters: readonly HomeCurriculumChapterDto[] = [startChapter, setsChapter];

describe("home curriculum action", () => {
  it("starts at the registered first chapter when there is no local chapter state", () => {
    const action = resolveHomeCurriculumAction(
      "数学语言、集合与证明",
      startChapter,
      chapters,
      localStorage,
    );

    expect(action).toMatchObject({
      mode: "start",
      href: startChapter.href,
      actionLabel: "从《数学语言、集合与证明》开始",
    });
  });

  it("continues the most recently read chapter at its precise anchor", () => {
    writeChapterLearningState(
      localStorage,
      setsChapter.chapterId,
      {
        readingProgress: 44,
        lastAnchor: "definition-set",
      },
      { now: new Date("2026-07-13T02:00:00.000Z") },
    );

    const action = resolveHomeCurriculumAction(
      "数学语言、集合与证明",
      startChapter,
      chapters,
      localStorage,
    );

    expect(action).toMatchObject({
      mode: "continue",
      contextLabel: "继续上次学习",
      title: "数学语言、集合与证明 · 第 2 章 集合、映射与关系",
      description: "已读 44%",
      href: `${setsChapter.href}#definition-set`,
      actionLabel: "继续学习",
    });

    render(
      <HomeCurriculumAction
        firstBookTitle="数学语言、集合与证明"
        startChapter={startChapter}
        chapters={chapters}
      />,
    );
    expect(screen.getByRole("link", { name: "继续学习" })).toHaveAttribute(
      "href",
      `${setsChapter.href}#definition-set`,
    );
    expect(screen.getByText("已读 44%")).toBeVisible();
  });

  it("continues an authored chapter outside the first book", () => {
    const linearAlgebraChapter: HomeCurriculumChapterDto = {
      chapterId: "/zh-CN/books/mathematics/linear-algebra/vectors-coordinates",
      bookTitle: "线性代数",
      chapterNumber: 1,
      title: "向量、坐标与线性组合",
      href: "/zh-CN/books/mathematics/linear-algebra/vectors-coordinates",
    };
    writeChapterLearningState(
      localStorage,
      linearAlgebraChapter.chapterId,
      { readingProgress: 61, lastAnchor: "definition-linear-combination" },
      { now: new Date("2026-07-13T03:00:00.000Z") },
    );

    expect(
      resolveHomeCurriculumAction(
        "数学语言、集合与证明",
        startChapter,
        [...chapters, linearAlgebraChapter],
        localStorage,
      ),
    ).toMatchObject({
      mode: "continue",
      title: "线性代数 · 第 1 章 向量、坐标与线性组合",
      href: `${linearAlgebraChapter.href}#definition-linear-combination`,
    });
  });

  it("does not send an internal concept-to-chapter map to the public client", () => {
    localStorage.setItem(
      learningStateStorageKey,
      JSON.stringify({
        version: 2,
        concepts: {
          "sets-and-mappings": {
            conceptId: "sets-and-mappings",
            status: "in-progress",
            progress: 28,
            readingProgress: 28,
            lastAnchor: "example-image-preimage",
            updatedAt: "2026-07-11T08:00:00.000Z",
          },
        },
        exercises: {},
        paths: {},
      }),
    );

    expect(
      resolveHomeCurriculumAction("数学语言、集合与证明", startChapter, chapters, localStorage),
    ).toMatchObject({
      mode: "start",
      href: startChapter.href,
    });
  });
});
