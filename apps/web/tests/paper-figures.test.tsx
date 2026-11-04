import { paperFigures, resources, readerCurriculumRepository } from "@one-forth/content";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PaperFigure } from "@/components/paper-figure";

describe("paper architecture figures", () => {
  it("keeps source attribution, registered references and local image assets", () => {
    expect(paperFigures.length).toBeGreaterThan(0);
    expect(new Set(paperFigures.map((figure) => figure.id)).size).toBe(paperFigures.length);
    for (const figure of paperFigures) {
      expect(
        resources.some((resource) => resource.id === figure.resourceId),
        figure.id,
      ).toBe(true);
      expect(
        readerCurriculumRepository.getChapterForContent(figure.conceptId),
        figure.id,
      ).not.toBeNull();
      expect(figure.src).toMatch(/^\/paper-figures\/[a-z0-9-]+\.webp$/);
      expect(existsSync(join(process.cwd(), "public", figure.src)), figure.src).toBe(true);
      expect(figure.width).toBeGreaterThanOrEqual(1400);
      expect(figure.height).toBeGreaterThan(100);
      expect(figure.alt.length).toBeGreaterThan(20);
      expect(figure.credit.length).toBeGreaterThan(8);
      expect(new URL(figure.paperUrl).protocol).toBe("https:");
      expect(new URL(figure.licenseUrl).protocol).toBe("https:");
      expect(figure.licenseName.length).toBeGreaterThan(3);
    }
  });

  it("offers full resolution viewing, paper links and a meaningful image alternative", () => {
    for (const figure of paperFigures) {
      const html = renderToStaticMarkup(<PaperFigure id={figure.id} />);
      expect(html).toContain('loading="lazy"');
      expect(html).toContain("alt=");
      expect(html).toContain("放大图示");
      expect(html).toContain("论文原文");
      expect(html).toContain(figure.paperUrl.replace(/&/g, "&amp;"));
      expect(html).toContain(figure.src);
      expect(html).not.toMatch(/<script|<iframe/);
    }
    expect(() => renderToStaticMarkup(<PaperFigure id="unknown-paper-figure" />)).toThrow(
      "Unknown paper figure",
    );
  });
});
