import { requiredSeriesLearningPathIds, requiredTopicalLearningPathIds } from "@one-forth/content";
import { listToolIndexEntries } from "@one-forth/content/tool-index";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ResourcesPage from "@/app/[locale]/resources/page";
import LearningPathsPage from "@/app/[locale]/paths/page";
import UpdatesPage, { deduplicateRecentUpdates } from "@/app/[locale]/updates/page";
import { listPublicResources } from "@/lib/reference-locations";

describe("navigation index pages", () => {
  it("renders every resource cited by reader-facing正文", async () => {
    const publicResources = await listPublicResources("zh-CN");
    const view = render(
      await ResourcesPage({
        params: Promise.resolve({ locale: "zh-CN" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { name: "资源与论文", level: 1 })).toBeVisible();
    expect(screen.queryAllByRole("listitem")).toHaveLength(Math.min(24, publicResources.length));
    const publicIds = new Set(publicResources.map((resource) => resource.id));
    for (const link of view.container.querySelectorAll<HTMLAnchorElement>(
      ".resource-directory__list h3 a",
    )) {
      const id = link.getAttribute("href")?.split("/").at(-1) ?? "";
      expect(publicIds.has(id), id).toBe(true);
    }
  });

  it("keeps resource filters in pagination URLs and limits each page to 24 records", async () => {
    const publicResources = await listPublicResources("zh-CN");
    const query = "e";
    const matchingResources = publicResources.filter((resource) =>
      [
        resource.title,
        resource.authors?.join(" ") ?? "",
        resource.publisher ?? resource.venue ?? "",
        resource.description?.["zh-CN"] ?? "",
      ]
        .join("\n")
        .toLocaleLowerCase("zh-CN")
        .includes(query),
    );
    expect(matchingResources.length).toBeGreaterThan(24);
    const view = render(
      await ResourcesPage({
        params: Promise.resolve({ locale: "zh-CN" }),
        searchParams: Promise.resolve({ q: query, page: "2" }),
      }),
    );

    expect(view.container.querySelectorAll(".resource-directory__list > li")).toHaveLength(
      Math.min(24, matchingResources.length - 24),
    );
    const previous = screen.getByRole("link", { name: "上一页" });
    const previousUrl = new URL(previous.getAttribute("href") ?? "", "https://one-forth.com");
    expect(previousUrl.pathname).toBe("/zh-CN/resources");
    expect(previousUrl.searchParams.get("q")).toBe(query);
    expect(previousUrl.searchParams.has("page")).toBe(false);
  });

  it("derives the update archive from substantive revision history only", async () => {
    const eligibleUpdates = deduplicateRecentUpdates(
      listToolIndexEntries({ locale: "zh-CN", kind: "revision" }),
    );

    render(
      await UpdatesPage({
        params: Promise.resolve({ locale: "zh-CN" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { name: "最近更新", level: 1 })).toBeVisible();
    expect(screen.queryAllByRole("listitem")).toHaveLength(Math.min(40, eligibleUpdates.length));
    expect(screen.queryByText(/草稿|预览|待审|编辑状态/)).not.toBeInTheDocument();
    const firstUpdate = [...eligibleUpdates].sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        left.title.localeCompare(right.title, "zh-CN") ||
        left.revisionType.localeCompare(right.revisionType),
    )[0];
    if (firstUpdate) {
      expect(screen.getAllByRole("link", { name: firstUpdate.title }).length).toBeGreaterThan(0);
    }
  });

  it("publishes the complete learning-path directory", async () => {
    const paths = listToolIndexEntries({ locale: "zh-CN", kind: "learning-path" });
    render(await LearningPathsPage({ params: Promise.resolve({ locale: "zh-CN" }) }));

    expect(screen.getByRole("heading", { name: "学习路径", level: 1 })).toBeVisible();
    expect(paths.map((path) => path.sourceId).sort()).toEqual(
      [...requiredTopicalLearningPathIds, ...requiredSeriesLearningPathIds].sort(),
    );
    for (const path of paths) {
      expect(screen.getByRole("link", { name: path.title })).toHaveAttribute(
        "href",
        path.canonicalUrl,
      );
    }
  });
});
