import { readerCurriculumRepository, teachingFigures, resources } from "@one-forth/content";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import katex from "katex";
import { TeachingFigure } from "@/components/teaching-figure";

describe("textbook teaching figures", () => {
  it("covers every published book with a figure from one of its chapters", () => {
    const covered = new Set(teachingFigures.map((figure) => figure.bookId));
    expect([...covered].sort()).toEqual(
      readerCurriculumRepository
        .listBooks()
        .map((book) => book.id)
        .sort(),
    );
    expect(new Set(teachingFigures.map((figure) => figure.id)).size).toBe(teachingFigures.length);
    for (const figure of teachingFigures) {
      const chapter = readerCurriculumRepository.getChapterForContent(figure.conceptId);
      expect(chapter?.bookId, figure.id).toBe(figure.bookId);
      if (figure.source) {
        expect(
          resources.some((resource) => resource.id === figure.source?.resourceId),
          figure.id,
        ).toBe(true);
        expect(new URL(figure.source.url).protocol).toBe("https:");
      }
    }
  });

  it("keeps finite coordinates, legible labels and valid mathematical notation", () => {
    for (const figure of teachingFigures) {
      expect(figure.panels.length, figure.id).toBeGreaterThan(0);
      expect(figure.caption.length, figure.id).toBeGreaterThan(5);
      for (const panel of figure.panels) {
        expect(panel.width).toBe(320);
        expect(panel.description.length).toBeGreaterThan(10);
        for (const element of panel.elements) {
          for (const value of Object.values(element)) {
            if (typeof value === "number") expect(Number.isFinite(value), figure.id).toBe(true);
          }
          if (element.kind === "math" || element.kind === "text") {
            expect(element.size ?? 20, figure.id).toBeGreaterThanOrEqual(18);
          }
          if (element.kind === "math") {
            expect(
              () => katex.renderToString(element.latex, { throwOnError: true, strict: "error" }),
              `${figure.id}: ${element.latex}`,
            ).not.toThrow();
            expect(element.label.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("renders real SVG and accessible descriptions without scripts or remote assets", () => {
    for (const figure of teachingFigures) {
      const html = renderToStaticMarkup(<TeachingFigure id={figure.id} />);
      expect(html).toContain("<figure");
      expect(html).toContain("<svg");
      expect(html).toContain("<desc");
      expect(html).toContain('role="img"');
      expect(html).not.toMatch(/<script|<image|katex-error|src="https?:\/\//);
    }
    expect(() => renderToStaticMarkup(<TeachingFigure id="missing-figure" />)).toThrow(
      "Unknown teaching figure",
    );
  });
});
