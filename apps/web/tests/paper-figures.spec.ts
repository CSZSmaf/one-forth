import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { paperFigures, readerCurriculumRepository } from "@one-forth/content";

for (const figure of paperFigures) {
  test(`${figure.id} loads and opens the original architecture image`, async ({ page }) => {
    const chapter = readerCurriculumRepository.getChapterForContent(figure.conceptId);
    const context = chapter
      ? readerCurriculumRepository.getChapterContext(chapter.id, "zh-CN")
      : null;
    if (!context) throw new Error(`Missing chapter: ${figure.id}`);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(context.canonicalPath);
    expect(response?.status()).toBe(200);
    await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
    const box = page.locator(`[data-paper-figure="${figure.id}"]`);
    await box.scrollIntoViewIfNeeded();
    const img = box.locator("img");
    await expect(img).toBeVisible();
    await expect
      .poll(() => img.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBe(figure.width);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true);
      }
    }
    const audit = await new AxeBuilder({ page })
      .include(`[data-paper-figure="${figure.id}"]`)
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    const full = box.getByRole("link", { name: "放大图示", exact: true });
    await full.focus();
    const popupPromise = page.waitForEvent("popup");
    await page.keyboard.press("Enter");
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    expect(new URL(popup.url()).pathname).toBe(figure.src);
    await expect(popup.locator("img")).toBeVisible();
    await popup.close();
    expect(errors).toEqual([]);
  });
}
