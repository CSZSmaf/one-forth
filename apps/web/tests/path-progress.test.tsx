import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PathProgressSummary, PathStepStatus } from "@/components/path-progress";
import { learningStateStorageKey } from "@/lib/learning-state";

describe("topical route chapter progress", () => {
  it("reads current Chapter IDs while preserving legacy concept completion", async () => {
    localStorage.setItem(
      learningStateStorageKey,
      JSON.stringify({
        version: 1,
        concepts: {
          gradient: {
            conceptId: "gradient",
            status: "completed",
            progress: 100,
            updatedAt: "2026-07-10T10:00:00.000Z",
          },
        },
      }),
    );

    render(
      <>
        <PathProgressSummary
          chapterIds={["m03-partials-gradient", "m11-gradient-descent"]}
          conceptChapterMap={{ gradient: "m03-partials-gradient" }}
        />
        <PathStepStatus chapterId="m03-partials-gradient" legacyConceptIds={["gradient"]} />
      </>,
    );

    await waitFor(() => expect(screen.getByText("1/2 章完成")).toBeVisible());
    expect(screen.getByText("已完成")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "学习路线完成进度" })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });
});
