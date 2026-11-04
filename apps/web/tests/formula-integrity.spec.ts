import {
  contentRepository,
  inspectMathIntegrity,
  readerCurriculumRepository,
  symbols,
} from "@one-forth/content";
import { expect, test } from "@playwright/test";
import { waitForPublicPage } from "./helpers/public-page-contract";

const documents = await contentRepository.listDocuments();
for (const [index, document] of documents.entries()) {
  test(`${document.documentId} renders intact formulas`, async ({ page }) => {
    await page.setViewportSize({ width: [390, 768, 1440][index % 3] ?? 390, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    expect((await page.goto(document.url))?.status()).toBe(200);
    await waitForPublicPage(page);
    const formulas = await page
      .locator("main [data-latex]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-latex") ?? ""),
      );
    expect(
      formulas.flatMap((latex) =>
        inspectMathIntegrity(latex).map((issue) => ({ latex, ...issue })),
      ),
    ).toEqual([]);
    await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(await page.locator("main").innerText()).not.toContain("\uFFFD");
    expect(errors).toEqual([]);
  });
}

test("truth values remain upright T and F at every supported width and theme", async ({ page }) => {
  const chapter = readerCurriculumRepository.getChapterForContent("logic-propositions");
  const context = chapter && readerCurriculumRepository.getChapterContext(chapter.id, "zh-CN");
  if (!context) throw new Error("Missing logic chapter");
  await page.goto(context.canonicalPath);
  await waitForPublicPage(page);
  const definition = page.locator("#definition-logic-propositions-1");
  for (const width of [390, 768, 1440])
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await definition.scrollIntoViewIfNeeded();
      await expect(definition.locator("[data-latex]")).toHaveCount(2);
      expect(await definition.locator(".katex-html").allTextContents()).toEqual(["T", "F"]);
      expect(
        await definition.locator('annotation[encoding="application/x-tex"]').allTextContents(),
      ).toEqual([String.raw`\mathrm T`, String.raw`\mathrm F`]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
});

test("the symbol index keeps an adjacent activation out of the weight subscript", async ({
  page,
}) => {
  const weight = symbols.find(
    (symbol) =>
      symbol.latex === "W_{2}" &&
      symbol.locations.some((location) => location.chapterId === "a07-transformer-architecture"),
  );
  if (!weight) throw new Error("Missing Transformer weight symbol");
  await page.goto(`/zh-CN/symbols?symbol=${weight.id}#symbol-${weight.id}`);
  await waitForPublicPage(page);
  const row = page.locator(`#symbol-${weight.id}`);
  await expect(row).toBeVisible();
  await expect(row.getByRole("cell").first().locator('[data-latex="W_{2}"]')).toBeVisible();
  await expect(row).not.toContainText("2phi");
});
