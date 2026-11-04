import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

interface AccessibilityScenario {
  readonly name: string;
  readonly path: string;
  readonly readySelector?: string;
}

const homeScenario: AccessibilityScenario = { name: "home", path: "/zh-CN" };
const articleScenario: AccessibilityScenario = {
  name: "article",
  path: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions",
};
const graphScenario: AccessibilityScenario = {
  name: "knowledge graph",
  path: "/zh-CN/graph",
};
const experimentScenario: AccessibilityScenario = {
  name: "experiment",
  path: "/zh-CN/playground?figure=wave-equation-1d",
  readySelector: '.interactive-figure[data-client-ready="true"]',
};
const scenarios: readonly AccessibilityScenario[] = [
  homeScenario,
  { name: "book library", path: "/zh-CN/books" },
  { name: "subject shelf", path: "/zh-CN/books/mathematics" },
  { name: "book contents", path: "/zh-CN/books/mathematics/mathematical-language-sets-proofs" },
  articleScenario,
  graphScenario,
  experimentScenario,
  { name: "symbol index", path: "/zh-CN/symbols" },
  { name: "equation index", path: "/zh-CN/equations" },
  ...[
    "linear-transform-2d",
    "fourier-harmonic-superposition",
    "gradient-descent",
    "attention-weight-matrix",
  ].map((id) => ({
    name: id,
    path: `/zh-CN/playground?figure=${id}`,
    readySelector: '.interactive-figure[data-client-ready="true"]',
  })),
  { name: "course references", path: "/zh-CN/resources?kind=lecture" },
  {
    name: "typeset computation graph",
    path: "/zh-CN/playground?figure=backprop-computation-graph",
    readySelector: '.interactive-figure[data-client-ready="true"]',
  },
];

async function gotoReady(page: Page, scenario: AccessibilityScenario): Promise<void> {
  const response = await page.goto(scenario.path, { waitUntil: "domcontentloaded" });
  expect(response, `Navigation did not return a response for ${scenario.path}`).not.toBeNull();
  expect(response?.status(), `Unexpected status for ${scenario.path}`).toBeLessThan(400);
  await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
  await expect(page.locator("main#main-content")).toBeVisible();
  if (scenario.readySelector) {
    await expect(page.locator(scenario.readySelector)).toBeVisible();
  }
}

async function focusWithTab(page: Page, target: Locator, maximumTabs = 80): Promise<boolean> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return true;
  }
  return false;
}

test.describe("automated WCAG checks", () => {
  for (const scenario of scenarios) {
    test(`${scenario.name} has no detectable WCAG A/AA violations`, async ({ page }, testInfo) => {
      await gotoReady(page, scenario);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        // Target sizing is exercised at the mobile viewport in the dedicated suite below.
        .disableRules(["target-size"])
        .analyze();

      await testInfo.attach(`axe-${scenario.name.replaceAll(" ", "-")}.json`, {
        body: Buffer.from(JSON.stringify(results, null, 2)),
        contentType: "application/json",
      });

      const summary = results.violations
        .map(
          (violation) =>
            `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help}\n${violation.nodes
              .map((node) => `  ${node.target.join(" ")}: ${node.failureSummary ?? ""}`)
              .join("\n")}`,
        )
        .join("\n\n");
      expect(results.violations, summary).toEqual([]);
    });
  }
});

test.describe("keyboard access", () => {
  test("subject, book and chapter links work without a pointer", async ({ page }) => {
    await gotoReady(page, homeScenario);
    const subject = page.locator(".home-series-entry").first();
    expect(await focusWithTab(page, subject)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.locator(".book-shelf__link")).toHaveCount(17);

    const book = page.locator(".book-shelf__link").first();
    expect(await focusWithTab(page, book)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.locator(".book-contents a")).toHaveCount(6);

    const chapter = page.locator(".book-contents a").first();
    expect(await focusWithTab(page, chapter)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${articleScenario.path}$`));
  });

  test("skip link and experiment controls work without a pointer", async ({ page }) => {
    await gotoReady(page, homeScenario);

    const skipLink = page.locator(".skip-link");
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);

    await gotoReady(page, experimentScenario);
    const figure = page.locator(".interactive-figure");
    const stepForward = figure.locator(".interactive-figure__transport button").nth(2);
    expect(await focusWithTab(page, stepForward)).toBe(true);
    await expect(stepForward).toBeFocused();

    const focusIndicator = await stepForward.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
    });
    expect(focusIndicator.style).not.toBe("none");
    expect(focusIndicator.width).toBeGreaterThanOrEqual(2);

    const progress = figure.getByLabel("当前动画进度");
    const slider = figure.locator('.interactive-figure__parameters input[type="range"]').first();
    const initialValue = Number(await slider.inputValue());
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(initialValue);
    await expect.poll(async () => Number(await progress.getAttribute("value"))).toBe(0);

    await stepForward.focus();
    await page.keyboard.press("Enter");
    await expect.poll(async () => Number(await progress.getAttribute("value"))).toBe(1);
  });
});

test("all cover variants have readable contrast in the dark theme", async ({ page }) => {
  await gotoReady(page, { name: "book library", path: "/zh-CN/books" });
  await page.getByRole("button", { name: "切换到深色主题" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  expect(results.violations).toEqual([]);
});

test.describe("200% browser zoom equivalent", () => {
  for (const scenario of scenarios) {
    test(`${scenario.name} reflows without page-level horizontal overflow`, async ({ page }) => {
      // Browser zoom halves the CSS-pixel viewport. A 720 px viewport therefore exercises the
      // same layout breakpoint as a 1440 px display at 200% zoom.
      await page.setViewportSize({ width: 720, height: 450 });
      await gotoReady(page, scenario);

      const measurements = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        mainWidth: document.querySelector("main")?.getBoundingClientRect().width ?? 0,
      }));
      expect(measurements.mainWidth).toBeGreaterThan(0);
      expect(
        measurements.scrollWidth,
        `scrollWidth ${measurements.scrollWidth}px exceeds clientWidth ${measurements.clientWidth}px`,
      ).toBeLessThanOrEqual(measurements.clientWidth + 1);
    });
  }
});

test.describe("touch target sizing and spacing", () => {
  for (const scenario of scenarios) {
    test(`${scenario.name} meets the WCAG 2.5.8 minimum`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoReady(page, scenario);

      const results = await new AxeBuilder({ page }).withRules(["target-size"]).analyze();
      await testInfo.attach(`axe-touch-targets-${scenario.name.replaceAll(" ", "-")}.json`, {
        body: Buffer.from(JSON.stringify(results, null, 2)),
        contentType: "application/json",
      });
      const summary = results.violations
        .flatMap((violation) =>
          violation.nodes.map(
            (node) => `${node.target.join(" ")}: ${node.failureSummary ?? violation.help}`,
          ),
        )
        .join("\n");
      expect(results.violations, summary).toEqual([]);
    });
  }
});

test("reduced-motion preference removes continuous motion and autoplay", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoReady(page, experimentScenario);

  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  );
  const motionLeaks = await page.evaluate(() => {
    const milliseconds = (value: string) =>
      value.split(",").map((part) => {
        const duration = part.trim();
        return duration.endsWith("ms")
          ? Number.parseFloat(duration)
          : Number.parseFloat(duration) * 1_000;
      });
    return Array.from(document.querySelectorAll<HTMLElement>("body *")).flatMap((element) => {
      const style = getComputedStyle(element);
      const longest = Math.max(
        ...milliseconds(style.animationDuration),
        ...milliseconds(style.transitionDuration),
      );
      return longest > 20
        ? [`${element.tagName.toLowerCase()}.${element.className}: ${longest}ms`]
        : [];
    });
  });
  expect(motionLeaks, motionLeaks.join("\n")).toEqual([]);

  const figure = page.locator(".interactive-figure");
  const play = figure.locator('.interactive-figure__transport button[aria-pressed="false"]');
  const progress = figure.getByLabel("当前动画进度");
  const maximumStep = Number(await progress.getAttribute("max"));
  await figure
    .locator('.interactive-figure__parameters input[type="range"]')
    .first()
    .press("ArrowRight");
  await expect.poll(async () => Number(await progress.getAttribute("value"))).toBe(0);
  await play.click();
  await expect.poll(async () => Number(await progress.getAttribute("value"))).toBe(maximumStep);
  await expect(play).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(400);
  expect(Number(await progress.getAttribute("value"))).toBe(maximumStep);
});

test("article formulas expose MathML while hiding the visual duplicate", async ({ page }) => {
  await gotoReady(page, articleScenario);

  const formulas = page.locator(".katex");
  expect(await formulas.count()).toBeGreaterThan(0);
  const issues = await formulas.evaluateAll((elements) =>
    elements.flatMap((element, index) => {
      const math = element.querySelector(".katex-mathml math");
      const annotation = math?.querySelector('annotation[encoding="application/x-tex"]');
      const visual = element.querySelector(".katex-html");
      const formulaIssues: string[] = [];
      if (!math) formulaIssues.push(`formula ${index + 1}: missing MathML`);
      if (!annotation?.textContent?.trim()) {
        formulaIssues.push(`formula ${index + 1}: missing TeX annotation`);
      }
      if (visual?.getAttribute("aria-hidden") !== "true") {
        formulaIssues.push(`formula ${index + 1}: visual duplicate is exposed to assistive tech`);
      }
      if (math?.closest('[aria-hidden="true"]')) {
        formulaIssues.push(`formula ${index + 1}: MathML is hidden from assistive tech`);
      }
      return formulaIssues;
    }),
  );
  expect(issues, issues.join("\n")).toEqual([]);
});

test("formula index preserves accessible text and copies the original TeX", async ({ page }) => {
  await gotoReady(page, {
    name: "equation index",
    path: "/zh-CN/equations?equation=wave-equation-1d",
  });

  const formula = page.locator("#wave-equation-1d .static-math").first();
  await expect(formula).toHaveAttribute("aria-label", /位移 u 对时间的二阶偏导/);
  await expect(formula).toHaveAttribute(
    "data-plain-text",
    "partial^2 u / partial t^2 = c^2 partial^2 u / partial x^2",
  );

  const copied = await formula.evaluate((element) => {
    const visual = element.querySelector(".katex-html");
    if (!visual) throw new Error("KaTeX visual output is missing.");
    const range = document.createRange();
    range.selectNodeContents(visual);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const clipboardData = new DataTransfer();
    const event = new ClipboardEvent("copy", {
      bubbles: true,
      cancelable: true,
      clipboardData,
    });
    document.dispatchEvent(event);
    selection?.removeAllRanges();
    return {
      prevented: event.defaultPrevented,
      text: clipboardData.getData("text/plain"),
    };
  });

  expect(copied.prevented).toBe(true);
  expect(copied.text).toBe(
    "\\frac{\\partial^2 u}{\\partial t^2}=c^2\\frac{\\partial^2 u}{\\partial x^2}",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoReady(page, { name: "formula index", path: "/zh-CN/equations" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const scrollableFormulaCount = await page
    .locator(".static-math--display")
    .evaluateAll(
      (elements) => elements.filter((element) => element.scrollWidth > element.clientWidth).length,
    );
  expect(scrollableFormulaCount).toBeGreaterThan(0);
});

test("symbol index exposes the registered symbol meaning and TeX source", async ({ page }) => {
  await gotoReady(page, {
    name: "symbol index",
    path: "/zh-CN/symbols?symbol=wave-speed",
  });

  const row = page.locator("#symbol-wave-speed");
  const symbol = row.locator("td").first().locator(".static-math");
  await expect(symbol).toHaveAttribute("aria-label", "波速 c，单位米每秒");
  await expect(symbol).toHaveAttribute("data-latex", "c");
  await expect(symbol).toHaveAttribute("data-plain-text", "c");
  await expect(symbol.locator('annotation[encoding="application/x-tex"]')).toHaveText("c");

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoReady(page, { name: "symbol index", path: "/zh-CN/symbols" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const table = page.locator(".reference-table-wrap");
  expect(await table.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true,
  );
  await expect(table.locator("tbody tr").first()).toBeVisible();
  expect(await table.locator(".katex-mathml math").count()).toBeGreaterThan(0);
});

test("registered MDX Equation renders semantic MathML instead of raw LaTeX text", async ({
  page,
}) => {
  await gotoReady(page, {
    name: "wave equation article",
    path: "/zh-CN/books/physics/oscillations-waves-optics/wave-equation",
  });

  const equation = page.locator("figure#equation-wave-equation-1d .static-math");
  await expect(equation).toHaveAttribute(
    "data-latex",
    "\\frac{\\partial^2 u}{\\partial t^2}=c^2\\frac{\\partial^2 u}{\\partial x^2}",
  );
  await expect(equation).toHaveAttribute("aria-label", /位移 u 对时间的二阶偏导/);
  await expect(equation.locator(".katex-mathml math")).toHaveCount(1);
  await expect(equation.locator(".katex-html")).toHaveAttribute("aria-hidden", "true");
});
