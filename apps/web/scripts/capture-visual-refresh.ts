import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const phase = process.argv[2];
if (phase !== "before" && phase !== "after") {
  throw new Error("Expected capture phase: before or after");
}
const output = fileURLToPath(
  new URL(`../../../reports/visual-refresh-20260909/${phase}/`, import.meta.url),
);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
] as const;
const scenarios = [
  { name: "home", path: "/zh-CN", dark: true },
  { name: "books", path: "/zh-CN/books", dark: false },
  { name: "book", path: "/zh-CN/books/mathematics/mathematical-language-sets-proofs", dark: false },
  {
    name: "article",
    path: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions",
    dark: true,
  },
  { name: "search", path: "/zh-CN/search?q=线性回归", dark: true },
  { name: "graph", path: "/zh-CN/graph", dark: true },
  { name: "lab", path: "/zh-CN/playground?figure=wave-equation-1d", dark: true },
  { name: "paths", path: "/zh-CN/paths", dark: false },
  { name: "resources", path: "/zh-CN/resources", dark: false },
  { name: "about", path: "/about", dark: true },
] as const;

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const viewport of viewports) {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({
        viewport,
        colorScheme: theme,
        locale: "zh-CN",
        timezoneId: "Asia/Shanghai",
        reducedMotion: "reduce",
        deviceScaleFactor: 1,
      });
      await context.addInitScript((value) => localStorage.setItem("one-forth-theme", value), theme);
      const page = await context.newPage();
      page.setDefaultTimeout(60_000);
      for (const scenario of scenarios) {
        if (theme === "dark" && !scenario.dark) continue;
        const errors: string[] = [];
        const onError = (error: Error) => errors.push(error.message);
        page.on("pageerror", onError);
        const response = await page.goto(new URL(scenario.path, baseURL).href, {
          waitUntil: "networkidle",
          timeout: 120_000,
        });
        await page.locator("main").waitFor();
        if (scenario.name !== "about")
          await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
        if (scenario.name === "lab")
          await page.locator('.interactive-figure[data-client-ready="true"]').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          theme: document.documentElement.dataset.theme,
          nextSectionTop:
            document.querySelector(".home-series-directory")?.getBoundingClientRect().top ?? null,
        }));
        if (phase === "after" && metrics.theme !== theme) {
          throw new Error(`${scenario.path}: expected ${theme} theme, received ${metrics.theme}`);
        }
        const filename = `${scenario.name}-${viewport.width}-${theme}.png`;
        await page.screenshot({ path: `${output}/${filename}`, animations: "disabled" });
        if (scenario.name === "home" && theme === "light")
          await page.screenshot({
            path: `${output}/home-${viewport.width}-full.png`,
            fullPage: true,
            animations: "disabled",
          });
        results.push({
          scenario: scenario.name,
          viewport,
          theme,
          filename,
          status: response?.status(),
          metrics,
          errors,
        });
        page.off("pageerror", onError);
        console.info(
          `${phase}: ${filename} (${response?.status()}, overflow=${metrics.scrollWidth - metrics.clientWidth}, errors=${errors.length})`,
        );
        await writeFile(`${output}/capture-results.json`, JSON.stringify(results, null, 2) + "\n");
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.info(`Captured ${results.length} page states in ${output}`);
