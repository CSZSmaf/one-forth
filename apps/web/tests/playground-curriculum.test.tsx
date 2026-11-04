import { readerCurriculumRepository } from "@one-forth/content";
import { listToolIndexEntries } from "@one-forth/content/tool-index";
import { visualizationManifest } from "@one-forth/visualization";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlaygroundPage from "@/app/[locale]/playground/page";

function expectedReaderExperiments() {
  const visualizationById = new Map(
    visualizationManifest.map((visualization) => [visualization.id, visualization] as const),
  );
  return listToolIndexEntries({ locale: "zh-CN", kind: "visualization" })
    .flatMap((entry) => {
      const visualization = visualizationById.get(entry.sourceId);
      const context = entry.chapterId
        ? readerCurriculumRepository.getChapterContext(entry.chapterId, "zh-CN")
        : null;
      return visualization && context ? [{ visualization, context }] : [];
    })
    .sort(
      (left, right) =>
        left.context.series.order - right.context.series.order ||
        left.context.book.order - right.context.book.order ||
        left.context.part.order - right.context.part.order ||
        left.context.chapter.order - right.context.chapter.order ||
        left.visualization.id.localeCompare(right.visualization.id, "en"),
    );
}

describe("reader playground curriculum navigation", () => {
  it("lists all experiments backed by reader Chapters", async () => {
    const expected = expectedReaderExperiments();
    const page = await PlaygroundPage({
      params: Promise.resolve({ locale: "zh-CN" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(page);
    const experimentLinks = [
      ...container.querySelectorAll<HTMLAnchorElement>(".experiment-directory__select"),
    ];

    expect(expected.length).toBeGreaterThan(0);
    expect(experimentLinks).toHaveLength(expected.length);
    expect(experimentLinks.map((link) => new URL(link.href).searchParams.get("figure"))).toEqual(
      expected.map(({ visualization }) => visualization.id),
    );
    for (const { visualization, context } of expected) {
      expect(
        container.querySelector(
          `a.experiment-directory__select[href="/zh-CN/playground?figure=${visualization.id}#figure-${visualization.id}"]`,
        ),
      ).toHaveAttribute(
        "href",
        `/zh-CN/playground?figure=${visualization.id}#figure-${visualization.id}`,
      );
      expect(
        container.querySelector(
          `a.experiment-directory__chapter-link[href="${context.canonicalPath}"]`,
        ),
      ).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/规划|草稿|预览|待审|编辑状态|schema/i);
  });

  it("returns 404 for an experiment outside the reader index", async () => {
    await expect(
      PlaygroundPage({
        params: Promise.resolve({ locale: "zh-CN" }),
        searchParams: Promise.resolve({ figure: "not-a-reader-experiment" }),
      }),
    ).rejects.toThrow(/404/);
  });
});
