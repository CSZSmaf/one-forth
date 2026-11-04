import { chromium, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Phase = "baseline" | "after";
type Source = "local" | "production";
type Theme = "light" | "dark";

interface ViewportDefinition {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

interface Scenario {
  readonly name: string;
  readonly path: string;
  readonly mobileOnly?: boolean;
  readonly desktopOnly?: boolean;
  readonly viewportOnly?: boolean;
  readonly prepare?: (page: Page) => Promise<void>;
}

const phase = (process.argv[2] ?? "baseline") as Phase;
const source = (process.argv[3] ?? "local") as Source;

if (phase !== "baseline" && phase !== "after") {
  throw new Error('Capture phase must be either "baseline" or "after".');
}
if (source !== "local" && source !== "production") {
  throw new Error('Capture source must be either "local" or "production".');
}

const defaultBaseURL = source === "production" ? "https://one-forth.com" : "http://localhost:3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? defaultBaseURL;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const outputRoot = path.join(repositoryRoot, "reports", "round-3", phase, "screenshots", source);

const viewports: readonly ViewportDefinition[] = [
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1440x1000", width: 1440, height: 1000 },
];

async function prepareSearchDialog(page: Page): Promise<void> {
  await page.keyboard.press("Control+K");
  await page.getByRole("dialog", { name: "搜索 One Forth" }).waitFor({ state: "visible" });
  await page.getByRole("combobox", { name: "搜索知识库" }).fill("梯度下降");
}

async function prepareMobileNavigation(page: Page): Promise<void> {
  await page.getByRole("button", { name: "打开导航" }).click();
  await page.getByRole("navigation", { name: "移动端导航" }).waitFor({ state: "visible" });
}

async function prepareExperiment(page: Page): Promise<void> {
  const figure = page.locator(".interactive-figure");
  await figure.waitFor({ state: "visible" });
  await figure.getByRole("button", { name: "重置", exact: true }).click();
}

async function prepareExperimentFullscreen(page: Page): Promise<void> {
  await prepareExperiment(page);
  const figure = page.locator(".interactive-figure");
  await figure.getByRole("button", { name: "全屏", exact: true }).click();
  await page.locator(".interactive-figure:fullscreen").waitFor({ state: "visible" });
}

const scenarios: readonly Scenario[] = [
  { name: "01-home", path: "/zh-CN" },
  {
    name: "02-learning-path",
    path: "/zh-CN/paths/mathematics-for-machine-learning",
  },
  { name: "03-knowledge-graph", path: "/zh-CN/graph" },
  { name: "04-playground", path: "/zh-CN/playground", prepare: prepareExperiment },
  { name: "05-glossary", path: "/zh-CN/glossary" },
  { name: "06-symbols", path: "/zh-CN/symbols" },
  { name: "07-equations", path: "/zh-CN/equations" },
  {
    name: "08-article-vectors",
    path: "/zh-CN/learn/mathematics/linear-algebra/vectors",
  },
  {
    name: "09-article-calculus-gradient",
    path: "/zh-CN/learn/mathematics/calculus/gradient",
  },
  {
    name: "10-article-attention",
    path: "/zh-CN/learn/machine-learning/neural-networks/attention-mechanism",
    prepare: prepareExperiment,
  },
  {
    name: "11-article-wave-equation",
    path: "/zh-CN/learn/physics/waves/wave-equation-1d",
    prepare: prepareExperiment,
  },
  { name: "12-outline-sets-and-mappings", path: "/zh-CN/concepts/sets-and-mappings" },
  {
    name: "13-search-dialog-open",
    path: "/zh-CN",
    viewportOnly: true,
    prepare: prepareSearchDialog,
  },
  {
    name: "14-mobile-navigation-open",
    path: "/zh-CN",
    mobileOnly: true,
    viewportOnly: true,
    prepare: prepareMobileNavigation,
  },
  {
    name: "15-experiment-fullscreen",
    path: "/zh-CN/playground?figure=gradient-descent",
    desktopOnly: true,
    viewportOnly: true,
    prepare: prepareExperimentFullscreen,
  },
];

const browser = await chromium.launch({ headless: true });
const manifest: Array<Record<string, unknown>> = [];

try {
  for (const viewport of viewports) {
    const viewportDirectory = path.join(outputRoot, viewport.name);
    await mkdir(viewportDirectory, { recursive: true });

    for (const theme of ["light", "dark"] as const satisfies readonly Theme[]) {
      for (const scenario of scenarios) {
        if (scenario.mobileOnly && viewport.width !== 390) continue;
        if (scenario.desktopOnly && viewport.width !== 1440) continue;

        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
          colorScheme: theme,
          locale: "zh-CN",
          timezoneId: "Asia/Shanghai",
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const consoleMessages: string[] = [];
        const failedRequests: string[] = [];
        const unsuccessfulResponses: string[] = [];
        let preparationError: string | null = null;

        page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          if (["error", "warning"].includes(message.type())) {
            consoleMessages.push(`${message.type()}: ${message.text()}`);
          }
        });
        page.on("requestfailed", (request) => {
          failedRequests.push(
            `${request.method()} ${request.url()} — ${request.failure()?.errorText}`,
          );
        });
        page.on("response", (response) => {
          if (response.status() >= 400) {
            unsuccessfulResponses.push(`${response.status()} ${response.url()}`);
          }
        });

        await page.addInitScript(
          ({ fixedNow, seed, selectedTheme }) => {
            let state = seed >>> 0;
            Math.random = () => {
              state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
              return state / 4_294_967_296;
            };
            Date.now = () => fixedNow;
            localStorage.setItem("one-forth-theme", selectedTheme);
            localStorage.removeItem("one-forth-recent-searches");
            localStorage.removeItem("one-forth-learning-progress");

            const longTasks: Array<{ readonly duration: number; readonly startTime: number }> = [];
            Object.defineProperty(window, "__round3LongTasks", { value: longTasks });
            if ("PerformanceObserver" in window) {
              try {
                const observer = new PerformanceObserver((list) => {
                  list.getEntries().forEach((entry) => {
                    longTasks.push({ duration: entry.duration, startTime: entry.startTime });
                  });
                });
                observer.observe({ type: "longtask", buffered: true });
              } catch {
                // The manifest reports an empty list when this browser lacks long-task support.
              }
            }
          },
          {
            fixedNow: Date.parse("2026-07-11T04:00:00.000Z"),
            seed: 20_260_711,
            selectedTheme: theme,
          },
        );

        const url = new URL(scenario.path, baseURL).toString();
        const response = await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
        await page.locator("main").waitFor({ state: "visible" });
        const figure = page.locator(".interactive-figure");
        if ((await figure.count()) > 0) {
          await page
            .locator('.interactive-figure[data-client-ready="true"]')
            .waitFor({ state: "visible" });
        }
        await page.evaluate(async () => document.fonts?.ready);

        if (scenario.prepare) {
          try {
            await scenario.prepare(page);
          } catch (error) {
            preparationError = error instanceof Error ? error.message : String(error);
          }
        }

        await page.evaluate(() => window.scrollTo(0, 0));
        await page.addStyleTag({
          content:
            "*, *::before, *::after { animation-delay: 0s !important; animation-duration: 0s !important; transition-duration: 0s !important; } nextjs-portal { display: none !important; }",
        });

        const filename = `${scenario.name}--${theme}.png`;
        const destination = path.join(viewportDirectory, filename);
        await page.screenshot({
          path: destination,
          fullPage: !scenario.viewportOnly,
          animations: "disabled",
        });

        const measurements = await page.evaluate(() => {
          const navigationEntries = performance.getEntriesByType(
            "navigation",
          ) as PerformanceNavigationTiming[];
          const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
          const longTasks = (
            window as Window & {
              __round3LongTasks?: Array<{ readonly duration: number; readonly startTime: number }>;
            }
          ).__round3LongTasks;

          return {
            title: document.title,
            h1: document.querySelector("h1")?.textContent?.trim() ?? null,
            canonical:
              document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
            robots: document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ?? null,
            bodyWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
            bodyHeight: document.documentElement.scrollHeight,
            theme: document.documentElement.dataset.theme ?? null,
            requestCount: resources.length + navigationEntries.length,
            transferSize: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
            longTasks: longTasks ?? [],
            fullscreen: Boolean(document.fullscreenElement),
          };
        });

        manifest.push({
          phase,
          source,
          viewport: viewport.name,
          theme,
          scenario: scenario.name,
          route: scenario.path,
          url,
          status: response?.status() ?? null,
          contentType: response?.headers()["content-type"] ?? null,
          file: path.relative(repositoryRoot, destination).replaceAll("\\", "/"),
          accepted: preparationError === null,
          preparationError,
          measurements,
          consoleMessages,
          failedRequests,
          unsuccessfulResponses,
        });

        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputRoot, "manifest.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      phase,
      source,
      baseURL,
      capturedAt: new Date().toISOString(),
      screenshots: manifest,
    },
    null,
    2,
  ),
  "utf8",
);

const accepted = manifest.filter((entry) => entry.accepted).length;
console.log(
  `Captured ${manifest.length} ${phase} ${source} screenshots (${accepted} prepared states accepted) in ${outputRoot}`,
);
