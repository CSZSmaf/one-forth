import { resources } from "@one-forth/content";
import { listToolIndexEntries } from "@one-forth/content/tool-index";
import { MathLabel, SvgMath, parseMathRichText } from "@one-forth/ui";
import { visualizationManifest } from "@one-forth/visualization";
import { cleanup, render, screen } from "@testing-library/react";
import katex from "katex";
import { afterEach, describe, expect, it } from "vitest";
import { serializeSvg } from "@/features/visualizations/export";
import { getBookReferences } from "@/lib/book-references";
import { listPublicResourceUsages, listPublicResources } from "@/lib/reference-locations";

afterEach(cleanup);

describe("references and compact mathematics", () => {
  it("publishes verified sources with chapter citations and links", async () => {
    const visible = await listPublicResources("zh-CN");
    const additions = resources.filter((entry) => entry.verifiedAt === "2026-10-25");
    expect(additions.length).toBeGreaterThanOrEqual(46);
    for (const source of additions) {
      expect(visible.some((entry) => entry.id === source.id)).toBe(true);
      expect(source.links.official).toMatch(/^https:\/\//);
      expect(await listPublicResourceUsages(source.id, "zh-CN")).not.toHaveLength(0);
    }
  });

  it("derives book reference links from its chapters", async () => {
    // Resolve a real book through the index rather than relying on a display code.
    const chapter = listToolIndexEntries({ locale: "zh-CN", kind: "resource-usage" }).find(
      (entry) => entry.sourceId === "harvard-cs50x-2026",
    );
    expect(chapter?.bookId).toBeTruthy();
    if (!chapter?.bookId) throw new Error("Missing CS50 book reference");
    const programming = await getBookReferences(chapter.bookId, "zh-CN");
    expect(programming.some((entry) => entry.id === "harvard-cs50x-2026")).toBe(true);
    expect(new Set(programming.map((entry) => entry.id)).size).toBe(programming.length);
  });

  it("compiles all experiment model formulas with strict KaTeX", () => {
    for (const experiment of visualizationManifest) {
      const fragments = parseMathRichText(
        experiment.scientificReview.mathematicalModel["zh-CN"],
      ).filter((segment) => segment.kind === "math");
      expect(fragments.length, experiment.id).toBeGreaterThan(0);
      for (const fragment of fragments) {
        expect(() =>
          katex.renderToString(fragment.latex, { strict: "error", throwOnError: true }),
        ).not.toThrow();
      }
    }
  });

  it("retains the control name and a native export equivalent for typeset formulas", () => {
    const view = render(
      <>
        <label>
          <MathLabel label="学习率 η" value={"学习率 $\\eta$"} />
          <input type="range" />
        </label>
        <svg>
          <SvgMath x={10} y={4} width={250} latex={"\\partial L/\\partial w"} label="∂L/∂w" />
        </svg>
      </>,
    );
    expect(screen.getByRole("slider", { name: "学习率 η" })).toBeInTheDocument();
    expect(view.container.querySelector("foreignObject .katex")).not.toBeNull();
    const svg = view.container.querySelector("svg");
    if (!svg) throw new Error("Missing test SVG");
    const exported = serializeSvg(svg);
    expect(exported).not.toContain("foreignObject");
    expect(exported).toContain("∂L/∂w");
    expect(exported).toContain("<text");
  });

  it("keeps editorial notes and personal data out of public revisions", () => {
    const entries = listToolIndexEntries({ locale: "zh-CN", kind: "revision" });
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.revisionType).not.toMatch(/style|metadata-migration/);
      expect(entry.summary).not.toMatch(
        /frontmatter|资源\s*ID|注册表|用户要求|提示词原文|Codex|[A-Z]:[\\/]|AppData|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i,
      );
    }
  });
});
