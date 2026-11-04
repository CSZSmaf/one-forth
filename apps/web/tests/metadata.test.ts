import { siteConfig } from "@one-forth/config";
import { describe, expect, it } from "vitest";
import { createPageMetadata, latestRevisionDate, socialImagePath } from "@/lib/metadata";

describe("page metadata", () => {
  it("owns a canonical and matching Open Graph URL", () => {
    const metadata = createPageMetadata({
      title: "知识图谱",
      description: "关系说明",
      path: "/zh-CN/graph",
    });

    expect(metadata).toMatchObject({
      alternates: { canonical: `${siteConfig.url}/zh-CN/graph` },
      openGraph: {
        url: `${siteConfig.url}/zh-CN/graph`,
        images: [
          {
            url: `${siteConfig.url}${socialImagePath}`,
            width: 1200,
            height: 630,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        images: [`${siteConfig.url}${socialImagePath}`],
      },
    });
  });

  it("rejects a path that could resolve outside the canonical route shape", () => {
    expect(() =>
      createPageMetadata({ title: "错误", description: "错误", path: "zh-CN/graph" }),
    ).toThrow(/must be site-relative/);
  });

  it("uses publication status as the only indexability policy", () => {
    const hidden = createPageMetadata({
      title: "隐藏内容",
      description: "不进入公开索引",
      path: "/zh-CN/concepts/transformer",
      publicationStatus: "hidden",
    });
    const preview = createPageMetadata({
      title: "预览内容",
      description: "仅供内部预览",
      path: "/zh-CN/learn/preview",
      publicationStatus: "preview",
    });
    const published = createPageMetadata({
      title: "公开正文",
      description: "进入公开索引",
      path: "/zh-CN/learn/published",
      publicationStatus: "published",
    });

    expect(hidden.robots).toMatchObject({ index: false, follow: true });
    expect(preview.robots).toMatchObject({ index: false, follow: true });
    expect(published.robots).toMatchObject({ index: true, follow: true });
  });

  it("derives modified time from revision history rather than a legacy review date", () => {
    expect(
      latestRevisionDate([{ date: "2026-06-01" }, { date: "2026-07-11" }, { date: "2026-06-20" }]),
    ).toBe("2026-07-11");
    expect(latestRevisionDate([])).toBeUndefined();
  });
});
