import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleProgress } from "@/components/article-progress";
import { learningStateStorageKey } from "@/lib/learning-state";

describe("article progress", () => {
  it("does not let the initial reading-position frame clear stored completion", async () => {
    localStorage.setItem(
      learningStateStorageKey,
      JSON.stringify({
        version: 1,
        concepts: {
          vectors: {
            conceptId: "vectors",
            status: "completed",
            progress: 100,
            updatedAt: "2026-07-10T10:00:00.000Z",
            completedAt: "2026-07-10T10:00:00.000Z",
          },
        },
        exercises: {},
      }),
    );

    const view = render(
      <article className="article-main">
        <ArticleProgress
          chapterId="m04-vectors"
          legacyConceptIds={["vectors"]}
          bookChapterIds={["m04-vectors", "m04-vector-operations"]}
        />
      </article>,
    );
    const article = view.container.querySelector<HTMLElement>(".article-main");
    if (!article) throw new Error("Article test fixture did not render.");
    Object.defineProperty(article, "offsetHeight", { configurable: true, value: 2_000 });
    article.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 800,
        bottom: 2_000,
        width: 800,
        height: 2_000,
        toJSON: () => ({}),
      }) as DOMRect;

    await waitFor(() => expect(screen.getByRole("button", { name: "重新学习" })).toBeVisible());
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(learningStateStorageKey) ?? "null");
      expect(stored).toMatchObject({
        version: 3,
        chapters: {
          "m04-vectors": { status: "completed", progress: 100 },
        },
        paths: {},
      });
    });

    expect(screen.getByRole("progressbar", { name: "页面滚动进度" })).not.toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(screen.getByRole("progressbar", { name: "本册完成进度" })).toHaveValue(50);
    expect(screen.getByText("1/2 章 · 50%")).toBeVisible();

    view.unmount();
    render(
      <article className="article-main">
        <ArticleProgress
          chapterId="m04-vectors"
          legacyConceptIds={["vectors"]}
          bookChapterIds={["m04-vectors", "m04-vector-operations"]}
        />
      </article>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "重新学习" })).toBeVisible());
  });
});
