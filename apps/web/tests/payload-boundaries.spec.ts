import { expect, test } from "@playwright/test";

const retiredPlanningCatalogPath = "/zh-CN/search/catalog";
const baseCatalogPath = "/zh-CN/search/base-catalog?schema=2";
const forbiddenKeys = new Set([
  "id",
  "conceptId",
  "chapterId",
  "bookId",
  "partId",
  "seriesId",
  "publicationStatus",
  "editorialStatus",
  "translationEditorialStatus",
  "mathematicalStatus",
  "numericalStatus",
  "sourceStatus",
  "accessibilityStatus",
  "humanReviewer",
  "isPreview",
  "maturity",
  "status",
  "hasDocument",
]);

function collectKeys(value: unknown, keys = new Set<string>()): ReadonlySet<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (typeof value !== "object" || value === null) return keys;
  for (const [key, nested] of Object.entries(value)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
  return keys;
}

function requestPath(url: string): string {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}

test.describe("public payload boundaries", () => {
  test("global search loads only the base catalog after opening", async ({ page }) => {
    const catalogRequests: string[] = [];
    page.on("request", (request) => {
      const path = requestPath(request.url());
      if (path === baseCatalogPath || path === retiredPlanningCatalogPath) {
        catalogRequests.push(path);
      }
    });

    const response = await page.goto("/zh-CN", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(400);
    await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
    expect(catalogRequests).toEqual([]);

    const baseResponse = page.waitForResponse(
      (candidate) => requestPath(candidate.url()) === baseCatalogPath,
    );
    await page.locator(".site-header .search-trigger").click();
    expect((await baseResponse).status()).toBe(200);
    expect(catalogRequests).toEqual([baseCatalogPath]);
    await expect(page.getByRole("checkbox", { name: /规划/ })).toHaveCount(0);
  });

  test("retired planning catalog is not public", async ({ request }) => {
    const response = await request.get(retiredPlanningCatalogPath);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  test("base catalog has no registry or editorial keys", async ({ request }) => {
    const response = await request.get(baseCatalogPath);
    expect(response.status()).toBe(200);
    const payload: unknown = await response.json();
    expect(Array.isArray(payload)).toBe(true);
    const keys = collectKeys(payload);
    for (const forbidden of forbiddenKeys) {
      expect(keys.has(forbidden), forbidden).toBe(false);
    }
    expect(JSON.stringify(payload)).not.toMatch(/待人工审阅|待人工审校|草稿|预览稿|pending/i);
  });

  test("search page lazy-loads its reader catalog and exposes no editorial state", async ({
    page,
  }) => {
    const catalogRequests: string[] = [];
    page.on("request", (request) => {
      if (requestPath(request.url()) === baseCatalogPath) {
        catalogRequests.push(baseCatalogPath);
      }
    });
    const response = await page.goto("/zh-CN/search", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(400);
    await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
    expect(catalogRequests).toEqual([]);
    await expect(page.getByRole("heading", { name: "输入关键词开始搜索" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /规划/ })).toHaveCount(0);
    await expect(page.getByText(/包含规划章节|课程规划|编辑状态|内部状态/)).toHaveCount(0);

    const baseResponse = page.waitForResponse(
      (candidate) => requestPath(candidate.url()) === baseCatalogPath,
    );
    await page.getByRole("textbox", { name: "搜索全部知识" }).fill("wave equation");
    expect((await baseResponse).status()).toBe(200);
    expect(catalogRequests).toEqual([baseCatalogPath]);
  });
});
