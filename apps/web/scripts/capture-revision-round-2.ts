import { chromium, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Phase = "before" | "after";

interface ViewportDefinition {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

interface Scenario {
  readonly name: string;
  readonly path: string;
  readonly mobileOnly?: boolean;
  readonly prepare?: (page: Page) => Promise<void>;
}

const phase = (process.argv[2] ?? "before") as Phase;
if (phase !== "before" && phase !== "after") {
  throw new Error('Capture phase must be either "before" or "after".');
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const outputRoot = path.join(repositoryRoot, "output", "playwright", "revision-round-2", phase);

const viewports: readonly ViewportDefinition[] = [
  { name: "360x800", width: 360, height: 800 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1440x1000", width: 1440, height: 1000 },
];

async function prepareSearch(page: Page) {
  const textbox = page.getByRole("textbox", { name: "搜索全部知识" });
  await textbox.fill("梯度");
  await page.waitForTimeout(150);
}

async function prepareExperiment(page: Page) {
  const figure = page.locator(".interactive-figure").first();
  if ((await figure.count()) > 0) {
    await figure.waitFor({ state: "visible" });
    const reset = figure.getByRole("button", { name: "重置", exact: true });
    if ((await reset.count()) > 0) await reset.click();
  }
}

async function prepareDarkTheme(page: Page) {
  const toggle = page.getByRole("button", { name: "切换到深色主题" });
  await toggle.click();
  await page.locator("html[data-theme='dark']").waitFor();
}

async function prepareMobileNavigation(page: Page) {
  await page.getByRole("button", { name: "打开导航" }).click();
  await page.getByRole("button", { name: "关闭导航" }).waitFor();
}

const scenarios: readonly Scenario[] = [
  { name: "01-home", path: "/zh-CN" },
  {
    name: "02-subject-entry-mathematics",
    path: "/zh-CN/subjects/mathematics",
  },
  {
    name: "03-learning-path",
    path: "/zh-CN/paths/mathematics-for-machine-learning",
  },
  {
    name: "04-article-vectors",
    path: "/zh-CN/learn/mathematics/linear-algebra/vectors",
  },
  { name: "05-search-gradient", path: "/zh-CN/search", prepare: prepareSearch },
  { name: "06-knowledge-graph", path: "/zh-CN/graph" },
  {
    name: "07-experiment-gradient-descent",
    path: "/zh-CN/playground?figure=gradient-descent",
    prepare: prepareExperiment,
  },
  { name: "08-home-dark", path: "/zh-CN", prepare: prepareDarkTheme },
  {
    name: "09-mobile-navigation",
    path: "/zh-CN",
    mobileOnly: true,
    prepare: prepareMobileNavigation,
  },
];

const browser = await chromium.launch({ headless: true });
const manifest: Array<Record<string, unknown>> = [];

try {
  for (const viewport of viewports) {
    const viewportDirectory = path.join(outputRoot, viewport.name);
    await mkdir(viewportDirectory, { recursive: true });

    for (const scenario of scenarios) {
      if (scenario.mobileOnly && viewport.width > 480) continue;

      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        colorScheme: "light",
        locale: "zh-CN",
        timezoneId: "Asia/Shanghai",
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const browserErrors: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
      });

      await page.addInitScript(() => {
        localStorage.removeItem("one-forth-theme");
        localStorage.removeItem("one-forth-recent-searches");
        localStorage.removeItem("one-forth-learning-progress");
      });

      const response = await page.goto(new URL(scenario.path, baseURL).toString(), {
        waitUntil: "domcontentloaded",
      });
      await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
      await page.locator("main").waitFor({ state: "visible" });
      if (scenario.prepare) await scenario.prepare(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(async () => document.fonts?.ready);
      await page.addStyleTag({
        content:
          "*, *::before, *::after { animation-delay: 0s !important; animation-duration: 0s !important; transition-duration: 0s !important; } nextjs-portal { display: none !important; }",
      });

      const filename = `${scenario.name}.png`;
      const destination = path.join(viewportDirectory, filename);
      await page.screenshot({ path: destination, fullPage: true, animations: "disabled" });
      const measurements = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelector("h1")?.textContent?.trim() ?? null,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        bodyHeight: document.body.scrollHeight,
        theme: document.documentElement.dataset.theme ?? "light",
      }));

      manifest.push({
        phase,
        viewport: viewport.name,
        scenario: scenario.name,
        route: scenario.path,
        status: response?.status() ?? null,
        file: path.relative(repositoryRoot, destination).replaceAll("\\", "/"),
        measurements,
        browserErrors,
      });

      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputRoot, "manifest.json"),
  JSON.stringify(
    { phase, baseURL, capturedAt: new Date().toISOString(), screenshots: manifest },
    null,
    2,
  ),
  "utf8",
);

console.log(`Captured ${manifest.length} ${phase.toUpperCase()} screenshots in ${outputRoot}`);
