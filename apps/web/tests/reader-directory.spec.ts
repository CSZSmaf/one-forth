import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function ready(page: Page, path: string) {
  const response = await page.goto(`/zh-CN/${path}`);
  expect(response?.status()).toBe(200);
  await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
}

test("resource subject, type and query filters compose and keep real source links", async ({
  page,
}) => {
  await ready(page, "resources");
  await page
    .getByRole("navigation", { name: "学科", exact: true })
    .getByRole("link", { name: "数学", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "资料类型", exact: true })
    .getByRole("link", { name: /^教材/ })
    .click();
  await page.getByRole("searchbox", { name: "检索", exact: true }).fill("Boyd");
  await page.getByRole("button", { name: "应用筛选" }).click();
  await expect(page.locator(".resource-directory__list > li")).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get("domain")).toBe("mathematics");
  expect(new URL(page.url()).searchParams.get("kind")).toBe("book");
  await expect(
    page.getByRole("link", { name: "查看原文: Convex Optimization", exact: true }),
  ).toHaveAttribute("href", "https://stanford.edu/~boyd/cvxbook/");
  await page.getByRole("link", { name: "Convex Optimization", exact: true }).click();
  await expect(page.getByRole("heading", { name: "相关章节" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "教材中的引用位置" })).toHaveCount(0);
  const chapter = page.locator(".resource-related-chapters a").first();
  await chapter.click();
  await expect(page.locator(".article-main")).toBeVisible();
});

test("path filters, stage disclosure and local continuation reach canonical chapters", async ({
  page,
}) => {
  await ready(page, "paths?domain=computer-science&kind=topic");
  await expect(page.locator(".path-directory__list > li")).toHaveCount(3);
  await expect(page.locator(".path-directory__list h3")).toHaveText([
    "计算机科学基础",
    "计算机系统与操作系统",
    "计算机网络与数据库",
  ]);
  await page.getByRole("link", { name: "计算机系统与操作系统", exact: true }).click();
  const stages = page.locator(".path-section-list details");
  await expect(stages).toHaveCount(2);
  await stages.nth(1).locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(stages.nth(1)).toHaveAttribute("open", "");
  const first = await stages.first().locator("li a").first().getAttribute("href");
  const second = await stages.first().locator("li a").nth(1).getAttribute("href");
  if (!first || !second) throw new Error("Missing chapter entry");
  await page.evaluate(
    ({ first, second }) => {
      localStorage.setItem(
        "one-forth-learning-progress",
        JSON.stringify({
          version: 3,
          chapters: {
            [first]: {
              chapterId: first,
              status: "completed",
              readingProgress: 100,
              progress: 100,
              updatedAt: "2026-10-26T00:00:00.000Z",
            },
            [second]: {
              chapterId: second,
              status: "in-progress",
              readingProgress: 40,
              progress: 40,
              updatedAt: "2026-10-26T01:00:00.000Z",
            },
          },
          legacyConcepts: {},
          exercises: {},
          paths: {},
        }),
      );
      window.dispatchEvent(new Event("one-forth:learning-state"));
    },
    { first, second },
  );
  await expect(page.getByRole("link", { name: "继续学习", exact: true })).toHaveAttribute(
    "href",
    second,
  );
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "8");
  await page.reload();
  await page.getByRole("link", { name: "继续学习", exact: true }).click();
  await expect(page.locator(".article-main")).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`graph reduced-scale nodes remain legible in ${theme}`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem("one-forth-theme", theme), theme);
    await ready(page, "graph");
    await expect(page.locator(".graph-concept__body").first()).toBeVisible();
    const zoomOut = page.getByRole("button", { name: "缩小", exact: true });
    for (let i = 0; i < 8; i++) await zoomOut.click();
    const node = page.locator('.graph-concept[data-compact="true"]').first();
    await expect(node).toHaveCount(1);
    const colors = await node.evaluate((el) => ({
      fill: getComputedStyle(el.querySelector(".graph-concept__body") ?? el).fill,
      surface: getComputedStyle(document.documentElement)
        .getPropertyValue("--surface-subtle")
        .trim(),
      label: getComputedStyle(el.querySelector(".graph-concept__title") ?? el).visibility,
    }));
    expect(colors.fill).not.toBe("rgb(0, 0, 0)");
    expect(colors.fill).not.toBe("none");
    expect(colors.surface).not.toBe("");
    expect(colors.label).toBe("visible");
    await page.getByRole("button", { name: "重置视图", exact: true }).click();
    await expect(page.locator('.graph-concept[data-selected="true"]')).toBeVisible();
  });
  for (const width of [390, 768, 1440]) {
    test(`reader directories ${theme} ${width}px remain accessible without horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((theme) => localStorage.setItem("one-forth-theme", theme), theme);
      for (const path of ["resources", "paths", "paths/computer-systems"]) {
        await ready(page, path);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true);
        const report = await new AxeBuilder({ page }).include("#main-content").analyze();
        expect(
          report.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
        ).toEqual([]);
      }
    });
  }
}
