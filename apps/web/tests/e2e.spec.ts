import { curriculumRedirects, readerCurriculumRedirects } from "@one-forth/content";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const localeRoot = "/zh-CN";
const booksUrl = `${localeRoot}/books`;
const mathematicsSeriesUrl = `${booksUrl}/mathematics`;
const foundationsBookUrl = `${mathematicsSeriesUrl}/mathematical-language-sets-proofs`;
const foundationsChapters = [
  {
    path: `${foundationsBookUrl}/logic-propositions`,
    heading: "命题、量词与逻辑联结词",
    directoryTitle: "命题、量词与逻辑联结词",
  },
  {
    path: `${foundationsBookUrl}/sets-mappings`,
    heading: "集合与映射",
    directoryTitle: "集合、映射与关系",
  },
  {
    path: `${foundationsBookUrl}/proof-strategies`,
    heading: "直接证明、反证法与构造法",
    directoryTitle: "直接证明、反证法与构造法",
  },
  {
    path: `${foundationsBookUrl}/relations-induction`,
    heading: "关系、次序与归纳",
    directoryTitle: "等价关系、序关系与数学归纳法",
  },
  {
    path: `${foundationsBookUrl}/countability-structures`,
    heading: "有限、可数与代数结构",
    directoryTitle: "有限性、可数性与基本代数结构",
  },
  {
    path: `${foundationsBookUrl}/language-proof-review`,
    heading: "数学语言与证明综合复习",
    directoryTitle: "数学语言与证明综合复习",
  },
] as const;
const firstChapter = foundationsChapters[0];
const secondChapter = foundationsChapters[1];
const lastChapter = foundationsChapters[5];
const limitsChapterUrl = `${mathematicsSeriesUrl}/single-variable-calculus/function-limits-continuity`;
const vectorChapterUrl = `${mathematicsSeriesUrl}/linear-algebra/vectors-coordinates`;
const linearTransformChapterUrl = `${mathematicsSeriesUrl}/linear-algebra/linear-maps-matrices`;
const probabilityAxiomsChapterUrl = `${mathematicsSeriesUrl}/probability/axioms-counting`;
const statisticsSampleChapterUrl = `${mathematicsSeriesUrl}/mathematical-statistics/samples-statistics`;
const waveChapterUrl = `${booksUrl}/physics/oscillations-waves-optics/wave-equation`;
const linearRegressionChapterUrl = `${booksUrl}/artificial-intelligence/linear-models-statistical-learning/linear-regression`;
const previewMathematicsChapterUrl = `${mathematicsSeriesUrl}/ordinary-differential-equations-dynamical-systems/existence-uniqueness`;
const previewPhysicsChapterUrl = `${booksUrl}/physics/physical-quantities-measurement-modeling/quantities-dimensions`;
const previewComputingChapterUrl = `${booksUrl}/computer-science/programming-scientific-computing-foundations/programs-types-control`;
const classicalFieldsPreviewChapterUrl = `${booksUrl}/physics/particle-physics-field-theory-introduction/classical-fields`;
const legacyGroupsChapterUrl = `${booksUrl}/mathematics/abstract-algebra/groups-subgroups`;
const legacyBandTheoryChapterUrl = `${booksUrl}/physics/solid-state-condensed-matter-foundations/band-theory`;
const legacyComplexityChapterUrl = `${booksUrl}/computer-science/data-structures-algorithms-complexity/complexity-computability`;

const legacyExerciseMathCases = [
  {
    label: "数学",
    path: legacyGroupsChapterUrl,
    exerciseId: "exercise-groups-subgroup-test",
    disclosure: "hint",
    latex: ["\\det(AB^{-1})=\\det(A)/\\det(B)"],
  },
  {
    label: "物理",
    path: legacyBandTheoryChapterUrl,
    exerciseId: "exercise-band-theory-3",
    disclosure: "solution",
    latex: ["E_{0}\\pm |V_G|", "2|V_G|", "V_0"],
  },
  {
    label: "计算机",
    path: legacyComplexityChapterUrl,
    exerciseId: "exercise-complexity-1",
    disclosure: "solution",
    latex: ["n=\\Theta(\\log N)", "\\Theta(2^n)"],
  },
] as const;

function publicLegacyLearnRedirect(targetPath: string) {
  const redirect = curriculumRedirects.find(
    (entry) => entry.kind === "legacy-learn" && entry.targetPath === targetPath,
  );
  if (!redirect) throw new Error(`Missing public legacy redirect for ${targetPath}`);
  return redirect;
}

function readerLegacyLearnRedirect(targetPath: string) {
  const redirect = readerCurriculumRedirects.find(
    (entry) => entry.kind === "legacy-learn" && entry.targetPath === targetPath,
  );
  if (!redirect) throw new Error(`Missing reader legacy redirect for ${targetPath}`);
  return redirect;
}

async function gotoReady(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `Navigation did not return a response for ${path}`).not.toBeNull();
  expect(response?.status(), `Unexpected status for ${path}`).toBeLessThan(400);
  await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
  await expect(page.locator("main#main-content")).toBeVisible();
}

async function expectLocation(page: Page, pathname: string, hash = ""): Promise<void> {
  await expect
    .poll(
      () => {
        const url = new URL(page.url());
        return { pathname: url.pathname, hash: decodeURIComponent(url.hash) };
      },
      { timeout: 30_000 },
    )
    .toEqual({ pathname, hash });
}

function collectBrowserErrors(page: Page): readonly [string[], () => Promise<void>] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });

  return [
    errors,
    async () => {
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect(errors, "The published page emitted browser runtime errors").toEqual([]);
    },
  ];
}

test.describe("Round 5 published curriculum journeys", () => {
  for (const width of [390, 768, 1440]) {
    test(`首页在 ${width}px 同屏展示四个学科入口`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await gotoReady(page, localeRoot);
      const entries = page.locator(".home-series-entry");
      await expect(entries).toHaveCount(4);
      await expect(page.locator(".home-curriculum-scale")).toHaveCount(0);
      await expect(page.locator("main .book-cover")).toHaveCount(0);
      const bounds = await entries.evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width };
        }),
      );
      const first = bounds[0];
      if (!first) throw new Error("The home page subject entries are missing.");
      for (const [index, current] of bounds.entries()) {
        await expect(entries.nth(index).getByRole("heading")).toBeInViewport({ ratio: 1 });
        const columns = width <= 640 ? 2 : 4;
        const rowStart = bounds[Math.floor(index / columns) * columns];
        if (!rowStart) throw new Error("Missing subject row");
        expect(Math.abs(current.y - rowStart.y)).toBeLessThan(1);
        const previous = index % columns ? bounds[index - 1] : undefined;
        if (previous) expect(current.x).toBeGreaterThan(previous.x);
        if (index >= columns) expect(current.y).toBeGreaterThan(first.y);
      }
    });
  }

  test("1. 首页选学科、选书、选章进入正文", async ({ page }) => {
    await gotoReady(page, localeRoot);

    await expect(page.locator(".home-series-list a")).toHaveCount(4);
    await page
      .locator(".home-series-list")
      .getByRole("link", { name: "数学", exact: true })
      .click();
    await expectLocation(page, `${localeRoot}/books/mathematics`);
    await expect(page.locator(".book-shelf__link")).toHaveCount(17);
    await page.getByRole("link", { name: "M00 数学语言、集合与证明", exact: true }).click();

    await expectLocation(page, foundationsBookUrl);
    await expect(
      page.getByRole("heading", { level: 1, name: "数学语言、集合与证明" }),
    ).toBeVisible();
    await expect(page.locator(".book-contents").getByRole("link")).toHaveCount(6);
    await page
      .locator(".book-contents")
      .getByRole("link", { name: /^01\s+命题/ })
      .click();
    await expectLocation(page, firstChapter.path);
    await expect(page.getByRole("heading", { level: 1, name: firstChapter.heading })).toBeVisible();
  });

  test("2. 分册页从第一章开始", async ({ page }) => {
    await gotoReady(page, foundationsBookUrl);

    await page.getByRole("link", { name: "开始本册", exact: true }).click();

    await expectLocation(page, firstChapter.path);
    await expect(page.getByRole("heading", { level: 1, name: firstChapter.heading })).toBeVisible();
  });

  test("3. 第一章按教材次序进入第二章", async ({ page }) => {
    const [, expectNoBrowserErrors] = collectBrowserErrors(page);
    await gotoReady(page, firstChapter.path);

    const next = page.locator('nav[aria-label="前后章节"] a[rel="next"]');
    await expect(next).toContainText(secondChapter.directoryTitle);
    await next.click();

    await expectLocation(page, secondChapter.path);
    await expect(
      page.getByRole("heading", { level: 1, name: secondChapter.heading }),
    ).toBeVisible();
    await expectNoBrowserErrors();
  });

  test("4. 第二章可返回第一章", async ({ page }) => {
    await gotoReady(page, secondChapter.path);

    const previous = page.locator('nav[aria-label="前后章节"] a[rel="prev"]');
    await expect(previous).toContainText(firstChapter.directoryTitle);
    await previous.click();

    await expectLocation(page, firstChapter.path);
  });

  test("5. 面包屑返回完整分册", async ({ page }) => {
    await gotoReady(page, secondChapter.path);

    await page
      .getByRole("navigation", { name: "面包屑" })
      .getByRole("link", { name: "数学语言、集合与证明", exact: true })
      .click();

    await expectLocation(page, foundationsBookUrl);
    await expect(page.getByRole("heading", { level: 2, name: "目录" })).toBeVisible();
  });

  test("6. 桌面本册目录包含六章并可进入末章", async ({ page }) => {
    await gotoReady(page, firstChapter.path);

    const bookDirectory = page.locator("aside.article-left");
    await expect(bookDirectory).toBeVisible();
    await expect(bookDirectory.locator("details[open]")).toHaveCount(3);
    await expect(bookDirectory.getByRole("link")).toHaveCount(7);
    await bookDirectory.getByRole("link", { name: lastChapter.directoryTitle }).click();

    await expectLocation(page, lastChapter.path);
    await expect(page.getByRole("heading", { level: 1, name: lastChapter.heading })).toBeVisible();
  });

  test("7. 移动端本册目录保持六章且管理焦点", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoReady(page, firstChapter.path);

    const trigger = page.getByRole("button", { name: "本册目录 · 第 1/6 章" });
    await trigger.click();

    const drawer = page.getByRole("dialog", { name: "M00 · 数学语言、集合与证明" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "关闭本册目录" })).toBeFocused();
    await expect(drawer.getByRole("link", { name: firstChapter.directoryTitle })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(drawer.locator("details[open]")).toHaveCount(3);
    await expect(drawer.getByRole("link")).toHaveCount(6);
    await expect(drawer.getByRole("link", { name: lastChapter.directoryTitle })).toBeVisible();
  });

  test("8. 搜索返回已上架正文", async ({ page }) => {
    await gotoReady(page, `${localeRoot}/search`);

    const search = page.getByRole("textbox", { name: "搜索全部知识" });
    await search.fill("集合与映射");
    const publishedResult = page.locator(`a[href="${secondChapter.path}"]`).first();
    await expect(publishedResult).toBeVisible();
    await publishedResult.click();

    await expectLocation(page, secondChapter.path);
  });

  test("9. 搜索返回正式向量正文但不暴露内部编辑状态", async ({ page }) => {
    await gotoReady(page, `${localeRoot}/search`);

    await page.getByRole("textbox", { name: "搜索全部知识" }).fill("向量");
    await expect(page.locator(`a[href="${vectorChapterUrl}"]`).first()).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /规划/ })).toHaveCount(0);
    await expect(page.getByText(/课程规划|草稿|编辑状态|内部状态/)).toHaveCount(0);
  });

  test("10. 数学代表正文可公开阅读", async ({ page }) => {
    await gotoReady(page, limitsChapterUrl);
    await expect(page.getByRole("heading", { level: 1, name: "极限与连续性" })).toBeVisible();

    await gotoReady(page, linearTransformChapterUrl);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "线性映射及其矩阵表示",
      }),
    ).toBeVisible();
  });

  test("11. 物理代表正文及实验可公开阅读", async ({ page }) => {
    await gotoReady(page, waveChapterUrl);
    await expect(page.getByRole("heading", { level: 1, name: "一维波动方程" })).toBeVisible();
    await expect(
      page.locator('.interactive-figure--wave-equation-1d[data-client-ready="true"]'),
    ).toBeVisible();
  });

  test("12. 机器学习代表正文可公开阅读", async ({ page }) => {
    await gotoReady(page, linearRegressionChapterUrl);
    await expect(page.getByRole("heading", { level: 1, name: "线性回归" })).toBeVisible();
  });

  test("13. 已发布旧 URL 经单次永久重定向到 canonical", async ({ page }) => {
    for (const targetPath of [
      firstChapter.path,
      vectorChapterUrl,
      probabilityAxiomsChapterUrl,
      statisticsSampleChapterUrl,
    ]) {
      const redirect = publicLegacyLearnRedirect(targetPath);
      const response = await page.request.get(redirect.sourcePath, { maxRedirects: 0 });
      expect([301, 308]).toContain(response.status());
      const location = new URL(response.headers().location ?? "", "http://localhost");
      expect(`${location.pathname}${decodeURIComponent(location.hash)}`).toBe(redirect.targetPath);

      const targetResponse = await page.request.get(redirect.targetPath, { maxRedirects: 0 });
      expect(targetResponse.status()).toBe(200);
      await gotoReady(page, redirect.sourcePath);
      await expectLocation(page, targetPath);
    }
  });

  test("14. 完成章节旧 URL 永久重定向到可索引 canonical", async ({ page }) => {
    const redirect = readerLegacyLearnRedirect(previewMathematicsChapterUrl);
    const response = await page.request.get(redirect.sourcePath, { maxRedirects: 0 });
    expect([301, 308]).toContain(response.status());
    const location = new URL(response.headers().location ?? "", "http://localhost");
    expect(location.pathname).toBe(previewMathematicsChapterUrl);

    await gotoReady(page, redirect.sourcePath);
    await expectLocation(page, previewMathematicsChapterUrl);
    await expect(page.locator("main#main-content")).not.toContainText(
      /预览稿|待人工审校|编辑状态|草稿/,
    );
  });

  test("15. 物理与计算机完成章节无状态标签且允许外部索引", async ({ page }) => {
    for (const path of [previewPhysicsChapterUrl, previewComputingChapterUrl]) {
      await gotoReady(page, path);
      await expect(page.locator("main#main-content")).not.toContainText(
        /预览稿|待人工审校|编辑状态|草稿/,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /^index,\s*follow$/i,
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://one-forth.com${path}`,
      );
    }
  });

  test("16. 可读章节练习的提示和解答编译为可访问数学", async ({ page }) => {
    await gotoReady(page, classicalFieldsPreviewChapterUrl);

    const exercise = page.locator("#exercise-classical-fields-4");
    const hint = exercise.locator(".exercise-disclosure--hint");
    const solution = exercise.locator(".exercise-disclosure--solution");

    await hint.getByText("查看提示", { exact: true }).click();
    await solution.getByText("查看解答", { exact: true }).click();

    const hintMath = hint.locator(".static-math--authored[data-latex]");
    const solutionMath = solution.locator(".static-math--authored[data-latex]");
    await expect(hintMath).toHaveCount(1);
    await expect(solutionMath).toHaveCount(3);
    await expect(hintMath).toHaveAttribute(
      "data-latex",
      "\\delta\\phi_a=-\\epsilon^\\nu\\partial_\\nu\\phi_a",
    );
    await expect(solutionMath.nth(0)).toHaveAttribute(
      "data-latex",
      "T^\\mu{}_{\\nu}=\\frac{\\partial\\mathcal L}{\\partial(\\partial_\\mu\\phi_a)}\\partial_\\nu\\phi_a-\\delta^\\mu{}_{\\nu}\\mathcal L",
    );
    await expect(solutionMath.nth(1)).toHaveAttribute(
      "data-latex",
      "\\partial_\\mu T^\\mu{}_{\\nu}=0",
    );
    await expect(solutionMath.nth(2)).toHaveAttribute("data-latex", "P_\\nu");
    await expect(hint.locator(".katex-mathml math")).toHaveCount(1);
    await expect(solution.locator(".katex-mathml math")).toHaveCount(3);
    await expect(exercise.locator(".katex-error")).toHaveCount(0);
    await expect(solution).not.toContainText("T^μ_ν");
  });

  test("17. 遗留练习属性跨学科编译数学并保护代码标识符", async ({ page }) => {
    const [, expectNoBrowserErrors] = collectBrowserErrors(page);

    for (const target of legacyExerciseMathCases) {
      await test.step(`${target.label}遗留公式`, async () => {
        await gotoReady(page, target.path);

        const exercise = page.locator(`#${target.exerciseId}`);
        const disclosure = exercise.locator(`.exercise-disclosure--${target.disclosure}`);
        await disclosure.locator("summary").click();

        const math = disclosure.locator(".static-math--legacy-exercise[data-latex]");
        await expect(math).toHaveCount(target.latex.length);
        for (const [index, latex] of target.latex.entries()) {
          await expect(math.nth(index)).toHaveAttribute("data-latex", latex);
          await expect(math.nth(index)).toBeVisible();
        }
        await expect(disclosure.locator(".katex-mathml math")).toHaveCount(target.latex.length);
        await expect(exercise.locator(".katex-error")).toHaveCount(0);
      });
    }

    await test.step("代码标识符不被误判为数学", async () => {
      await gotoReady(page, previewComputingChapterUrl);

      const exercise = page.locator("#exercise-programs-types-control-4");
      const solution = exercise.locator(".exercise-disclosure--solution");
      await solution.locator("summary").click();

      const code = solution.locator("code.legacy-exercise-code").filter({
        hasText: "max_steps",
      });
      await expect(code).toHaveCount(1);
      await expect(code).toHaveText("max_steps");
      await expect(code).toBeVisible();
      await expect(
        solution.locator('.static-math--legacy-exercise[data-latex*="max_steps"]'),
      ).toHaveCount(0);
      await expect(exercise.locator(".katex-error")).toHaveCount(0);
    });

    await expectNoBrowserErrors();
  });

  test("18. 浏览器前进和后退保持 M00 章节状态", async ({ page }) => {
    await gotoReady(page, firstChapter.path);
    await page.locator('nav[aria-label="前后章节"] a[rel="next"]').click();
    await expectLocation(page, secondChapter.path);

    await page.goBack();
    await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
    await expectLocation(page, firstChapter.path);
    await expect(
      page.locator("aside.article-left").getByRole("link", {
        name: firstChapter.directoryTitle,
      }),
    ).toHaveAttribute("aria-current", "page");

    await page.goForward();
    await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
    await expectLocation(page, secondChapter.path);
    await expect(
      page.locator("aside.article-left").getByRole("link", {
        name: secondChapter.directoryTitle,
      }),
    ).toHaveAttribute("aria-current", "page");
  });
});
