import { expect, test } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";

interface VisualScenario {
  readonly name: string;
  readonly path: string;
  readonly fullPage?: boolean;
  readonly colorScheme?: "light" | "dark";
  /** When set, the scenario only runs in these Playwright projects. */
  readonly projects?: readonly string[];
  readonly prepare?: (page: Page) => Promise<void>;
}

interface HomeLayoutMetrics {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly mainDirectSectionCount: number;
  readonly visibleMainLinkCount: number;
  readonly visibleLearningLinkCount: number;
  readonly visibleProfileLinkCount: number;
  readonly desktopPrimaryNavVisibleTextEntryCount: number;
  readonly nextSectionStartsInFirstViewport: boolean;
  readonly nextSectionTop: number | null;
  readonly scrollWidth: number;
  readonly clientWidth: number;
}

const foundationsBookUrl = "/zh-CN/books/mathematics/mathematical-language-sets-proofs";
const foundationsChapterUrl = `${foundationsBookUrl}/logic-propositions`;
const singleVariableCalculusBookUrl = "/zh-CN/books/mathematics/single-variable-calculus";
const derivativeApplicationsChapterUrl = `${singleVariableCalculusBookUrl}/derivative-applications`;
const multivariableCalculusBookUrl =
  "/zh-CN/books/mathematics/multivariable-calculus-vector-analysis";
const vectorIntegralTheoremsChapterUrl = `${multivariableCalculusBookUrl}/green-stokes-gauss`;
const linearAlgebraBookUrl = "/zh-CN/books/mathematics/linear-algebra";
const linearTransformChapterUrl = `${linearAlgebraBookUrl}/linear-maps-matrices`;
const eigenstructureReviewChapterUrl = `${linearAlgebraBookUrl}/eigenstructure-review`;
const probabilityBookUrl = "/zh-CN/books/mathematics/probability";
const conditionalProbabilityChapterUrl = `${probabilityBookUrl}/conditional-bayes`;
const probabilityReviewChapterUrl = `${probabilityBookUrl}/probability-review`;
const mathematicalStatisticsBookUrl = "/zh-CN/books/mathematics/mathematical-statistics";
const confidenceIntervalsChapterUrl = `${mathematicalStatisticsBookUrl}/confidence-intervals`;
const linearModelInferenceChapterUrl = `${mathematicalStatisticsBookUrl}/linear-model-inference`;
const discreteMathematicsBookUrl =
  "/zh-CN/books/mathematics/discrete-mathematics-combinatorics-graphs";
const graphConnectivityChapterUrl = `${discreteMathematicsBookUrl}/graphs-connectivity`;
const posetsBooleanChapterUrl = `${discreteMathematicsBookUrl}/posets-boolean`;
const waveChapterUrl = "/zh-CN/books/physics/oscillations-waves-optics/wave-equation";
const linearRegressionChapterUrl =
  "/zh-CN/books/artificial-intelligence/linear-models-statistical-learning/linear-regression";

const visualViewports = {
  "visual-390": { width: 390, height: 844 },
  "visual-768": { width: 768, height: 1024 },
  "visual-1440": { width: 1440, height: 1000 },
} as const;

function expectedViewport(testInfo: TestInfo): { readonly width: number; readonly height: number } {
  const viewport = visualViewports[testInfo.project.name as keyof typeof visualViewports];
  if (!viewport) {
    throw new Error(
      `Visual regression was run with an unsupported project: ${testInfo.project.name}`,
    );
  }
  return viewport;
}

async function prepareMobileBookDirectory(page: Page): Promise<void> {
  const trigger = page.locator(".article-mobile-book-trigger");
  if (await trigger.isVisible()) {
    await trigger.click();
  } else {
    await trigger.evaluate((element: HTMLButtonElement) => element.click());
  }
  const drawer = page.getByRole("dialog", { name: "M00 · 数学语言、集合与证明" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "关闭本册目录" })).toBeFocused();
}

async function preparePublishedSearch(page: Page): Promise<void> {
  await page.getByRole("textbox", { name: "搜索全部知识" }).fill("线性回归");
  await expect(page.locator(`a[href="${linearRegressionChapterUrl}"]`).first()).toBeVisible();
  await expect(page.getByText(/课程规划|草稿|编辑状态|内部状态/)).toHaveCount(0);
}

async function prepareDarkArticle(page: Page): Promise<void> {
  const desktopToggle = page.getByRole("button", { name: "切换到深色主题" });
  if (await desktopToggle.isVisible()) {
    await desktopToggle.click();
  } else {
    await page.getByRole("button", { name: "打开目录" }).click();
    const directory = page.getByRole("dialog", { name: "目录" });
    await directory.getByRole("button", { name: "切换到深色主题" }).click();
    await directory.getByRole("button", { name: "关闭目录" }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
}

async function captureHomeLayoutMetrics(
  page: Page,
  testInfo: TestInfo,
): Promise<HomeLayoutMetrics> {
  const metrics = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>("main#main-content");
    if (!main) throw new Error("The home page main content was not rendered.");

    const isVisible = (element: Element): boolean => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        bounds.width > 0 &&
        bounds.height > 0
      );
    };
    const directSections = Array.from(main.children).filter(
      (element) => element.tagName === "SECTION",
    );
    const nextSection = directSections[1];
    const nextSectionTop = nextSection?.getBoundingClientRect().top ?? null;

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      mainDirectSectionCount: directSections.length,
      visibleMainLinkCount: Array.from(main.querySelectorAll("a")).filter(isVisible).length,
      visibleLearningLinkCount: Array.from(main.querySelectorAll("a")).filter(
        (element) => isVisible(element) && !element.closest(".home-profile"),
      ).length,
      visibleProfileLinkCount: Array.from(main.querySelectorAll(".home-profile a")).filter(
        isVisible,
      ).length,
      desktopPrimaryNavVisibleTextEntryCount: Array.from(
        document.querySelectorAll("nav.desktop-nav a, nav.desktop-nav button"),
      ).filter((element) => isVisible(element) && Boolean(element.textContent?.trim())).length,
      nextSectionStartsInFirstViewport:
        nextSectionTop !== null && nextSectionTop >= 0 && nextSectionTop < window.innerHeight,
      nextSectionTop,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });

  await testInfo.attach(`round5-home-layout-${testInfo.project.name}.json`, {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  console.log(`ROUND5_HOME_METRICS ${testInfo.project.name} ${JSON.stringify(metrics)}`);
  expect(metrics.scrollWidth, `${testInfo.project.name} has page-level horizontal overflow`).toBe(
    metrics.clientWidth,
  );
  expect(metrics.mainDirectSectionCount).toBeLessThanOrEqual(4);
  // Count curriculum destinations and the primary reading action.
  expect(metrics.visibleLearningLinkCount).toBe(5);
  expect(metrics.visibleProfileLinkCount).toBe(1);
  expect(metrics.visibleMainLinkCount).toBe(6);
  expect(metrics.desktopPrimaryNavVisibleTextEntryCount).toBeLessThanOrEqual(3);
  expect(
    metrics.nextSectionStartsInFirstViewport,
    `${testInfo.project.name} does not expose the textbook directory in the first viewport (top=${metrics.nextSectionTop})`,
  ).toBe(true);
  return metrics;
}

const scenarios: readonly VisualScenario[] = [
  { name: "editorial-about", path: "/about", fullPage: false },
  { name: "editorial-about-dark", path: "/about", fullPage: false, colorScheme: "dark" },
  { name: "round5-home", path: "/zh-CN" },
  { name: "editorial-home-dark", path: "/zh-CN", prepare: prepareDarkArticle },
  { name: "editorial-paths", path: "/zh-CN/paths", fullPage: false },
  { name: "editorial-resources", path: "/zh-CN/resources", fullPage: false },
  { name: "editorial-glossary", path: "/zh-CN/glossary", fullPage: false },
  { name: "editorial-symbols", path: "/zh-CN/symbols", fullPage: false },
  { name: "editorial-equations", path: "/zh-CN/equations", fullPage: false },
  { name: "editorial-updates", path: "/zh-CN/updates", fullPage: false },
  {
    name: "editorial-lab",
    path: "/zh-CN/playground?figure=wave-equation-1d",
    fullPage: false,
    prepare: async (page) => {
      await expect(page.locator('.interactive-figure[data-client-ready="true"]')).toBeVisible();
    },
  },
  {
    name: "editorial-lab-dark",
    path: "/zh-CN/playground?figure=wave-equation-1d",
    fullPage: false,
    prepare: async (page) => {
      await expect(page.locator('.interactive-figure[data-client-ready="true"]')).toBeVisible();
      await prepareDarkArticle(page);
    },
  },
  {
    name: "editorial-search-dialog",
    path: "/zh-CN",
    fullPage: false,
    prepare: async (page) => {
      await page.keyboard.press("Control+k");
      await expect(page.getByRole("dialog", { name: "搜索 One Forth" })).toBeVisible();
      await page.getByRole("combobox", { name: "搜索知识库" }).fill("线性回归");
      await expect(page.locator('[role="option"]').first()).toBeVisible();
    },
  },
  { name: "round5-books-directory", path: "/zh-CN/books" },
  { name: "round5-mathematics-series", path: "/zh-CN/books/mathematics" },
  {
    name: "round5-complete-m00-book",
    path: foundationsBookUrl,
  },
  { name: "round5-m00-mathematics-article", path: foundationsChapterUrl },
  {
    name: "round5-complete-m02-book",
    path: singleVariableCalculusBookUrl,
  },
  {
    name: "round5-m02-derivative-applications-article",
    path: derivativeApplicationsChapterUrl,
  },
  {
    name: "round5-complete-m03-book",
    path: multivariableCalculusBookUrl,
  },
  {
    name: "round5-m03-vector-integral-theorems-article",
    path: vectorIntegralTheoremsChapterUrl,
  },
  {
    name: "round5-complete-m04-book",
    path: linearAlgebraBookUrl,
  },
  {
    name: "round5-linear-transform-article",
    path: linearTransformChapterUrl,
  },
  {
    name: "round5-m04-eigenstructure-review-article",
    path: eigenstructureReviewChapterUrl,
  },
  {
    name: "round5-complete-m05-book",
    path: probabilityBookUrl,
  },
  {
    name: "round5-m05-conditional-probability-article",
    path: conditionalProbabilityChapterUrl,
  },
  {
    name: "round5-m05-probability-review-article",
    path: probabilityReviewChapterUrl,
  },
  {
    name: "round5-complete-m06-book",
    path: mathematicalStatisticsBookUrl,
  },
  {
    name: "round5-m06-confidence-intervals-article",
    path: confidenceIntervalsChapterUrl,
  },
  {
    name: "round5-m06-linear-model-inference-article",
    path: linearModelInferenceChapterUrl,
  },
  {
    name: "round5-complete-m07-book",
    path: discreteMathematicsBookUrl,
  },
  {
    name: "round5-m07-graph-connectivity-article",
    path: graphConnectivityChapterUrl,
  },
  {
    name: "round5-m07-posets-boolean-article",
    path: posetsBooleanChapterUrl,
  },
  { name: "round5-physics-wave-article", path: waveChapterUrl },
  { name: "round5-ml-linear-regression-article", path: linearRegressionChapterUrl },
  { name: "round5-graph", path: "/zh-CN/graph", projects: ["visual-1440"] },
  {
    name: "round5-graph-dark",
    path: "/zh-CN/graph",
    projects: ["visual-390"],
    prepare: prepareDarkArticle,
  },
  {
    name: "round5-published-search",
    path: "/zh-CN/search",
    prepare: preparePublishedSearch,
  },
  {
    name: "round5-mobile-m00-directory",
    path: foundationsChapterUrl,
    fullPage: false,
    prepare: prepareMobileBookDirectory,
  },
  {
    name: "round5-m00-article-dark",
    path: foundationsChapterUrl,
    prepare: prepareDarkArticle,
  },
];

test.describe("Round 5 published-site visual regression", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    expect(page.viewportSize()).toEqual(expectedViewport(testInfo));
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.addInitScript(
      ({ fixedNow, seed }) => {
        let state = seed >>> 0;
        Math.random = () => {
          state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
          return state / 4_294_967_296;
        };
        Date.now = () => fixedNow;
        localStorage.removeItem("one-forth-theme");
        localStorage.removeItem("one-forth-recent-searches");
        localStorage.removeItem("one-forth-learning-progress");
      },
      {
        fixedNow: Date.parse("2026-07-13T04:00:00.000Z"),
        seed: 20_260_713,
      },
    );
  });

  for (const scenario of scenarios) {
    test(scenario.name, async ({ page }, testInfo) => {
      test.skip(
        scenario.projects !== undefined && !scenario.projects.includes(testInfo.project.name),
        `${scenario.name} is pinned to ${(scenario.projects ?? []).join(", ")}`,
      );
      test.setTimeout(90_000);
      if (scenario.colorScheme) {
        await page.emulateMedia({ colorScheme: scenario.colorScheme });
      }
      const response = await page.goto(scenario.path, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      expect(response?.status(), `Unexpected status for ${scenario.path}`).toBeLessThan(400);
      if (scenario.path !== "/about") {
        await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
      }
      await expect(page.locator("main#main-content")).toBeVisible();

      if (scenario.prepare) await scenario.prepare(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(async () => document.fonts?.ready);
      await page.addStyleTag({
        content:
          "*, *::before, *::after { animation-delay: 0s !important; animation-duration: 0s !important; transition-duration: 0s !important; caret-color: transparent !important; } nextjs-portal { display: none !important; }",
      });
      if (scenario.name === "round5-home") {
        await captureHomeLayoutMetrics(page, testInfo);
      }

      await expect(page).toHaveScreenshot(`${scenario.name}.png`, {
        fullPage: scenario.fullPage ?? true,
        animations: "disabled",
        caret: "initial",
        timeout: 30_000,
      });
    });
  }
});
