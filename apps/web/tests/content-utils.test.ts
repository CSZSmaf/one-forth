import rehypeSlug from "rehype-slug";
import { describe, expect, it } from "vitest";

import { extractTableOfContents } from "@/lib/content-utils";

describe("article heading anchors", () => {
  it("keeps legacy anchor markup out of renamed table of contents entries", () => {
    const toc = extractTableOfContents(
      '## <span id="legacy-heading" data-heading-alias="" aria-hidden="true" />有限集与可数集',
    );
    expect(toc).toEqual([{ id: "有限集与可数集", title: "有限集与可数集", level: 2 }]);
  });

  it("matches rehype-slug for inline TeX subscripts without exposing raw TeX in the TOC", () => {
    const markdown = ["## 为什么除以 $\\sqrt{d_k}$", "", "## 为什么除以 $\\sqrt{d_k}$"].join("\n");
    const toc = extractTableOfContents(markdown);

    const transform = rehypeSlug();
    const tree: Parameters<typeof transform>[0] = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h2",
          properties: {},
          children: [
            { type: "text", value: "为什么除以 " },
            {
              type: "element",
              tagName: "code",
              properties: { className: ["language-math", "math-inline"] },
              children: [{ type: "text", value: "\\sqrt{d_k}" }],
            },
          ],
        },
        {
          type: "element",
          tagName: "h2",
          properties: {},
          children: [
            { type: "text", value: "为什么除以 " },
            {
              type: "element",
              tagName: "code",
              properties: { className: ["language-math", "math-inline"] },
              children: [{ type: "text", value: "\\sqrt{d_k}" }],
            },
          ],
        },
      ],
    };
    transform(tree);
    const rehypeIds = tree.children.map((heading) =>
      heading.type === "element" ? String(heading.properties.id) : "",
    );

    expect(toc.map(({ id }) => id)).toEqual(rehypeIds);
    expect(toc.map(({ title }) => title)).toEqual(["为什么除以 √(d_k)", "为什么除以 √(d_k)"]);
    expect(toc.every(({ title }) => !title.includes("$") && !title.includes("\\sqrt"))).toBe(true);
    expect(toc[0]?.id).toContain("d_k");
    expect(toc[1]?.id).toBe(`${toc[0]?.id}-1`);
  });
});
