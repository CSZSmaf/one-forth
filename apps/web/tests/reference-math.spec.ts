import { readFile } from "node:fs/promises";
import { visualizationManifest } from "@one-forth/visualization";
import { expect, test } from "@playwright/test";
import { findRawTexLeaks, waitForPublicPage } from "./helpers/public-page-contract";

for (const width of [390, 768, 1440]) {
  test(`all experiment formulas render at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const [index, experiment] of visualizationManifest.entries()) {
      await page.goto(`/zh-CN/playground?figure=${experiment.id}`);
      await waitForPublicPage(page);
      const figure = page.locator('.interactive-figure[data-client-ready="true"]');
      await expect(figure).toBeVisible();
      await page.evaluate(
        (theme) => {
          document.documentElement.dataset.theme = theme;
          localStorage.setItem("one-forth-theme", theme);
        },
        index % 2 ? "dark" : "light",
      );
      await expect(
        figure.locator(".interactive-figure__scientific-review .katex").first(),
      ).toBeAttached();
      await expect(page.locator(".katex-error")).toHaveCount(0);
      expect(
        await figure
          .locator(".katex")
          .evaluateAll((formulas) =>
            formulas.every((formula) => getComputedStyle(formula).textTransform === "none"),
          ),
        experiment.id,
      ).toBe(true);
      expect(await findRawTexLeaks(page), experiment.id).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        experiment.id,
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("typed control names and SVG/PNG exports survive formula rendering", async ({ page }) => {
  await page.goto("/zh-CN/playground?figure=backprop-computation-graph");
  await waitForPublicPage(page);
  const figure = page.locator('.interactive-figure[data-client-ready="true"]');
  await expect(figure).toBeVisible();
  const weight = page.getByRole("spinbutton", { name: "权重 w", exact: true });
  const before = await weight.inputValue();
  await weight.focus();
  await weight.press("ArrowUp");
  expect(await weight.inputValue()).not.toBe(before);
  await expect(figure.locator("foreignObject .katex").first()).toBeVisible();
  for (const format of ["SVG", "PNG"]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: `导出 ${format}`, exact: true }).click();
    const download = await pending;
    const path = await download.path();
    expect(path).toBeTruthy();
    if (!path) throw new Error("Export did not produce a file");
    const data = await readFile(path);
    if (format === "SVG") {
      expect(data.toString()).toContain("∂L/∂w");
      expect(data.toString()).not.toContain("foreignObject");
    } else {
      expect([...data.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(data.length).toBeGreaterThan(5000);
    }
  }
});

test("resource list and book contents expose official references directly", async ({ page }) => {
  await page.goto("/zh-CN/resources?q=CS50");
  await waitForPublicPage(page);
  const source = page.locator(".resource-directory__source");
  await expect(source).toHaveCount(1);
  await expect(source).toHaveAttribute("href", "https://cs50.harvard.edu/x/2026/");
  await page.locator(".resource-directory__list h3 a").click();
  await waitForPublicPage(page);
  await page.locator(".resource-usage-list a").first().click();
  await waitForPublicPage(page);
  await expect(page.locator('a[href="https://cs50.harvard.edu/x/2026/"]').first()).toBeAttached();
  await page.goto("/zh-CN/updates");
  await waitForPublicPage(page);
  await expect(page.locator("main")).not.toContainText(
    /frontmatter|资源 ID|注册表|用户要求|提示词原文|AppData/,
  );
});
