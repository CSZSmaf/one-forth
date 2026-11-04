import { readerCurriculumRepository } from "@one-forth/content";
import { expect, test } from "@playwright/test";
import { learningStateStorageKey } from "../lib/learning-state";

test("mobile home keeps four subjects visible with saved reading progress", async ({ page }) => {
  const context = readerCurriculumRepository.getChapterContext(
    "c03-binary-representation",
    "zh-CN",
  );
  if (!context) throw new Error("Missing binary representation chapter");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ({ key, path }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 3,
          chapters: {
            [path]: {
              chapterId: path,
              status: "in-progress",
              progress: 20,
              readingProgress: 20,
              updatedAt: new Date().toISOString(),
            },
          },
          legacyConcepts: {},
          exercises: {},
          paths: {},
        }),
      );
    },
    { key: learningStateStorageKey, path: context.canonicalPath },
  );
  await page.goto("/zh-CN");
  await expect(page.locator('.home-linear-action[data-mode="continue"]')).toBeVisible();
  await expect(page.locator(".home-linear-primary")).toHaveAttribute("href", context.canonicalPath);
  for (const heading of await page.locator(".home-series-entry h3").all()) {
    await expect(heading).toBeInViewport({ ratio: 1 });
  }
});

for (const code of ["c03", "c04", "c05", "c06"]) {
  test(`${code} contains six readable chapters with examples, exercises and formulas`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const chapters = readerCurriculumRepository.listChapters(code);
    expect(chapters).toHaveLength(6);
    for (const chapter of chapters) {
      const context = readerCurriculumRepository.getChapterContext(chapter.id, "zh-CN");
      if (!context) throw new Error(`Missing chapter ${chapter.id}`);
      const response = await page.goto(context.canonicalPath);
      expect(response?.status()).toBe(200);
      await expect(page.locator("article h1")).toBeVisible();
      expect(await page.locator('article [id^="example-"]').count()).toBeGreaterThanOrEqual(2);
      expect(await page.locator('article [id^="exercise-"]').count()).toBeGreaterThanOrEqual(4);
      await expect(page.locator(".katex-error")).toHaveCount(0);
      expect(await page.locator("article math").count()).toBeGreaterThan(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("legacy subject bookmarks preserve query and land on the split shelf", async ({ request }) => {
  const response = await request.get(
    "/zh-CN/books/computing-ai/neural-networks-backpropagation/activation-functions?view=reading",
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(301);
  expect(response.headers().location).toContain(
    "/zh-CN/books/artificial-intelligence/neural-networks-backpropagation/activation-functions?view=reading",
  );
});
