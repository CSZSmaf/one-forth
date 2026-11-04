import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface ProductionPageState {
  readonly canonical: string | null;
  readonly chapterHrefs: readonly string[];
  readonly clientReady: string | null;
  readonly clientWidth: number;
  readonly forbiddenTokens: readonly string[];
  readonly h1: string | null;
  readonly pageOverflow: boolean;
  readonly scrollWidth: number;
  readonly theme: string | null;
  readonly title: string;
}

const defaultRoute = "/zh-CN/books/mathematics/algebra-functions-analytic-geometry";
const route = process.argv[2] ?? defaultRoute;
const checkpoint = process.argv[3] ?? "m01";
const screenshotOrdinal = process.argv[4] ?? "15";
const expectedChapterCount = Number.parseInt(process.argv[5] ?? "6", 10);

if (!route.startsWith("/") || route.includes("..")) {
  throw new Error(`Production capture route must be an absolute site path: ${route}`);
}
if (!/^[a-z][a-z0-9-]*$/.test(checkpoint)) {
  throw new Error(`Invalid checkpoint label: ${checkpoint}`);
}
if (!/^\d{2}$/.test(screenshotOrdinal)) {
  throw new Error(`Screenshot ordinal must contain two digits: ${screenshotOrdinal}`);
}
if (!Number.isInteger(expectedChapterCount) || expectedChapterCount < 1) {
  throw new Error(`Expected chapter count must be a positive integer.`);
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://one-forth.com";
const targetURL = new URL(route, baseURL);
const expectedCanonical = new URL(route, "https://one-forth.com").toString();
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const reportDirectory = path.join(repositoryRoot, "reports", "round-5", `${checkpoint}-final`);
const screenshotDirectory = path.join(repositoryRoot, "reports", "round-5", "after-screenshots");
const screenshotPath = path.join(
  screenshotDirectory,
  `${screenshotOrdinal}-${checkpoint}-production-1440.png`,
);
const reportJsonPath = path.join(reportDirectory, `production-browser-${checkpoint}.json`);
const reportMarkdownPath = path.join(reportDirectory, `production-browser-${checkpoint}.md`);

const browser = await chromium.launch({ headless: true });
const consoleMessages: string[] = [];
const failedRequests: string[] = [];
const unsuccessfulResponses: string[] = [];
let responseStatus: number | null = null;
let pageState: ProductionPageState | null = null;

try {
  const context = await browser.newContext({
    viewport: { width: 1_440, height: 1_000 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  page.on("pageerror", (error) => {
    consoleMessages.push(`pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleMessages.push(`error: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()} - ${request.failure()?.errorText ?? "unknown failure"}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      unsuccessfulResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto(targetURL.toString(), {
    waitUntil: "domcontentloaded",
  });
  responseStatus = response?.status() ?? null;
  await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
  await page.locator("main").waitFor({ state: "visible" });
  await page.evaluate(async () => document.fonts?.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.addStyleTag({
    content:
      "*, *::before, *::after { animation-delay: 0s !important; animation-duration: 0s !important; transition-duration: 0s !important; }",
  });

  pageState = await page.evaluate(
    ({ bookRoute }) => {
      const main = document.querySelector("main");
      const visibleText = main?.textContent ?? "";
      const forbiddenCandidates = [
        "TODO",
        "editorialStatus",
        "publicationStatus",
        "待人工审阅",
        "内容维护与审阅信息",
      ];
      const chapterHrefs = [
        ...new Set(
          Array.from(document.querySelectorAll<HTMLAnchorElement>("main a[href]"))
            .map((anchor) => anchor.getAttribute("href"))
            .filter((href): href is string => href !== null && href.startsWith(`${bookRoute}/`)),
        ),
      ];

      return {
        canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
        chapterHrefs,
        clientReady: document.documentElement.dataset.clientReady ?? null,
        clientWidth: document.documentElement.clientWidth,
        forbiddenTokens: forbiddenCandidates.filter((token) => visibleText.includes(token)),
        h1: document.querySelector("h1")?.textContent?.trim() ?? null,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        theme: document.documentElement.dataset.theme ?? null,
        title: document.title,
      } satisfies ProductionPageState;
    },
    { bookRoute: route },
  );

  await mkdir(screenshotDirectory, { recursive: true });
  await mkdir(reportDirectory, { recursive: true });
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    animations: "disabled",
  });
  await context.close();
} finally {
  await browser.close();
}

if (pageState === null) {
  throw new Error(`Production page state was not captured for ${targetURL}.`);
}

const failures: string[] = [];
if (responseStatus !== 200) {
  failures.push(`Expected HTTP 200, received ${responseStatus ?? "no response"}.`);
}
if (pageState.canonical !== expectedCanonical) {
  failures.push(
    `Canonical mismatch: expected ${expectedCanonical}, received ${pageState.canonical ?? "none"}.`,
  );
}
if (pageState.chapterHrefs.length !== expectedChapterCount) {
  failures.push(
    `Expected ${expectedChapterCount} unique chapter links, received ${pageState.chapterHrefs.length}.`,
  );
}
if (pageState.forbiddenTokens.length > 0) {
  failures.push(`Visible internal-state tokens: ${pageState.forbiddenTokens.join(", ")}.`);
}
if (pageState.pageOverflow) {
  failures.push(
    `Page overflow: scroll width ${pageState.scrollWidth}, client width ${pageState.clientWidth}.`,
  );
}
if (consoleMessages.length > 0) {
  failures.push(`${consoleMessages.length} console error(s) detected.`);
}
if (failedRequests.length > 0) {
  failures.push(`${failedRequests.length} failed request(s) detected.`);
}
if (unsuccessfulResponses.length > 0) {
  failures.push(`${unsuccessfulResponses.length} unsuccessful subresource response(s) detected.`);
}

const capturedAt = new Date().toISOString();
const report = {
  schemaVersion: 1,
  checkpoint,
  source: "production",
  baseURL,
  route,
  url: targetURL.toString(),
  capturedAt,
  viewport: { width: 1_440, height: 1_000 },
  responseStatus,
  expectedCanonical,
  expectedChapterCount,
  screenshot: path.relative(repositoryRoot, screenshotPath).replaceAll("\\", "/"),
  pageState,
  consoleMessages,
  failedRequests,
  unsuccessfulResponses,
  failures,
  passed: failures.length === 0,
};

await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(
  reportMarkdownPath,
  `# Round 5 ${checkpoint.toUpperCase()} production browser verification

- Captured at: ${capturedAt}
- URL: ${targetURL.toString()}
- Result: ${failures.length === 0 ? "PASS" : "FAIL"}
- HTTP status: ${responseStatus ?? "no response"}
- Canonical: ${pageState.canonical ?? "none"}
- Heading: ${pageState.h1 ?? "none"}
- Unique chapter links: ${pageState.chapterHrefs.length}/${expectedChapterCount}
- Page overflow: ${pageState.pageOverflow ? "yes" : "no"} (${pageState.scrollWidth}/${pageState.clientWidth})
- Visible forbidden tokens: ${pageState.forbiddenTokens.length}
- Console errors: ${consoleMessages.length}
- Failed requests: ${failedRequests.length}
- Unsuccessful subresource responses: ${unsuccessfulResponses.length}
- Screenshot: \`${path.relative(repositoryRoot, screenshotPath).replaceAll("\\", "/")}\`

## Failures

${failures.length === 0 ? "None." : failures.map((failure) => `- ${failure}`).join("\n")}
`,
  "utf8",
);

if (failures.length > 0) {
  throw new Error(
    `Production browser verification failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`,
  );
}

console.log(
  `Production browser verification passed for ${targetURL} (${pageState.chapterHrefs.length}/${expectedChapterCount} chapter links).`,
);
