import { chapterMathCoverage, publicCurriculumRepository } from "@one-forth/content";
import { expect, test } from "@playwright/test";
import {
  findRawTexLeaks,
  installPublicPageAudit,
  waitForPublicPage,
} from "./helpers/public-page-contract";

const publishedChapters = publicCurriculumRepository.listChapters().flatMap((chapter) => {
  const context = publicCurriculumRepository.getChapterContext(chapter.id, "zh-CN");
  const mathCoverage = chapterMathCoverage.find((entry) => entry.chapterId === chapter.id);
  return context
    ? [
        {
          id: chapter.id,
          path: context.canonicalPath,
          expectsAuthoredMath: mathCoverage?.status !== "not-applicable",
        },
      ]
    : [];
});

if (publishedChapters.length === 0) {
  throw new Error("The published curriculum must expose at least one chapter runtime test.");
}

for (const chapter of publishedChapters) {
  test(`${chapter.id} renders authored math without browser errors`, async ({ page }) => {
    const audit = installPublicPageAudit(page);
    const failures = audit.failures;

    try {
      const response = await page.goto(chapter.path, { waitUntil: "domcontentloaded" });
      if (!response || response.status() >= 400) {
        failures.push(`${chapter.path} returned ${response?.status() ?? "no response"}`);
      }
      await waitForPublicPage(page);
      if (!(await page.locator("main#main-content article.article-main").isVisible())) {
        failures.push(`${chapter.path} did not render the authored article shell`);
      }
      const renderedMathCount = await page
        .locator("article.article-main .static-math--authored[data-latex]")
        .count();
      if (chapter.expectsAuthoredMath && renderedMathCount === 0) {
        failures.push(`${chapter.path} did not render compact TeX through StaticMath`);
      }
      const unrenderedMathCount = await page
        .locator(
          "article.article-main code.language-math, article.article-main pre code.math-display",
        )
        .count();
      if (unrenderedMathCount > 0) {
        failures.push(`${chapter.path} exposed ${unrenderedMathCount} unrendered math node(s)`);
      }
      const mathErrorCount = await page.locator("article.article-main .katex-error").count();
      if (mathErrorCount > 0) {
        failures.push(`${chapter.path} exposed ${mathErrorCount} KaTeX parse error(s)`);
      }
      const rawTexLeaks = await findRawTexLeaks(page, "article.article-main");
      failures.push(...rawTexLeaks.map((leak) => `${chapter.path} exposed raw TeX: ${leak}`));
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
    } catch (error) {
      failures.push(
        `${chapter.path} navigation failed: ${error instanceof Error ? error.message : error}`,
      );
    }

    expect(failures, `Published chapter runtime audit failed for ${chapter.path}`).toEqual([]);
  });
}
