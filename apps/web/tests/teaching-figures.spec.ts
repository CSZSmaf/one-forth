import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readerCurriculumRepository, teachingFigures } from "@one-forth/content";

for (const figure of teachingFigures) {
  test(`${figure.id} teaching figure is readable across widths and themes`, async ({ page }) => {
    const chapter = readerCurriculumRepository.getChapterForContent(figure.conceptId);
    const context = chapter
      ? readerCurriculumRepository.getChapterContext(chapter.id, "zh-CN")
      : null;
    if (!context) throw new Error(`Missing chapter for ${figure.id}`);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(context.canonicalPath);
    expect(response?.status()).toBe(200);
    await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
    const locator = page.locator(`[data-teaching-figure="${figure.id}"]`);
    await expect(locator).toBeVisible();
    await expect(locator.locator("svg[role=img]")).toHaveCount(figure.panels.length);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        await locator.scrollIntoViewIfNeeded();
        const issues = await locator.evaluate((figureNode) => {
          const problems: string[] = [];
          if (document.documentElement.scrollWidth > innerWidth + 1) problems.push("page overflow");
          for (const svg of figureNode.querySelectorAll<SVGSVGElement>(
            "svg.teaching-figure__panel",
          )) {
            const frame = svg.viewBox.baseVal;
            for (const label of svg.querySelectorAll<SVGTextElement>("text")) {
              const box = label.getBBox();
              if (
                box.x < -1 ||
                box.y < -1 ||
                box.x + box.width > frame.width + 1 ||
                box.y + box.height > frame.height + 1
              )
                problems.push(`label outside panel: ${label.textContent}`);
            }
            for (const box of svg.querySelectorAll("foreignObject")) {
              const math = box.querySelector<HTMLElement>(".svg-math");
              if (
                math &&
                (math.scrollWidth > box.width.baseVal.value + 2 ||
                  math.scrollHeight > box.height.baseVal.value + 2)
              )
                problems.push(`formula clipped: ${box.getAttribute("data-math-export-label")}`);
            }
          }
          return problems;
        });
        expect(issues, `${figure.id} ${width} ${theme}`).toEqual([]);
      }
    }
    await expect(locator.locator(".katex-error")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const bookId of ["m00", "p01", "c03", "a04"]) {
  test(`${bookId} figure accessibility and 200 percent zoom equivalent`, async ({ page }) => {
    const figure = teachingFigures.find((entry) => entry.bookId === bookId);
    const chapter = figure
      ? readerCurriculumRepository.getChapterForContent(figure.conceptId)
      : null;
    const context = chapter
      ? readerCurriculumRepository.getChapterContext(chapter.id, "zh-CN")
      : null;
    if (!context || !figure) throw new Error(`Missing figure ${bookId}`);
    // As in a11y.spec.ts, browser zoom is modeled by halving a 1440px display's CSS viewport.
    await page.setViewportSize({ width: 720, height: 450 });
    await page.goto(context.canonicalPath);
    await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await page.locator(`[data-teaching-figure="${figure.id}"]`).scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        ),
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .include(`[data-teaching-figure="${figure.id}"]`)
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
    }
  });
}
