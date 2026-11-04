import type { Page } from "@playwright/test";

export interface PublicPageAudit {
  readonly failures: string[];
}

function configuredOrigin(): URL {
  return new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000");
}

function isFirstParty(value: string, base: URL): boolean {
  const url = new URL(value);
  if (url.origin === base.origin) return true;
  const productionHost = (host: string) =>
    host === "one-forth.com" || host.endsWith(".one-forth.com");
  return productionHost(url.hostname) && productionHost(base.hostname);
}

export function installPublicPageAudit(page: Page): PublicPageAudit {
  const failures: string[] = [];
  const seen = new Set<string>();
  const base = configuredOrigin();
  const record = (message: string) => {
    if (!seen.has(message)) {
      seen.add(message);
      failures.push(message);
    }
  };

  page.on("pageerror", (error) => record(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") record(`console.error: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    if (isFirstParty(request.url(), base)) {
      record(
        `requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
      );
    }
  });
  page.on("response", (response) => {
    if (!isFirstParty(response.url(), base)) return;
    const request = response.request();
    const status = response.status();
    const contentType = response.headers()["content-type"]?.toLowerCase() ?? "";
    if (status >= 400) record(`HTTP ${status}: ${request.method()} ${response.url()}`);
    if (status === 204 || status === 304) return;
    const resourceType = request.resourceType();
    if (resourceType === "document" && !contentType.includes("text/html")) {
      record(`document Content-Type ${contentType || "<missing>"}: ${response.url()}`);
    } else if (resourceType === "stylesheet" && !contentType.includes("text/css")) {
      record(`stylesheet Content-Type ${contentType || "<missing>"}: ${response.url()}`);
    } else if (
      resourceType === "script" &&
      !/(?:java|ecma)script|application\/wasm/u.test(contentType)
    ) {
      record(`script Content-Type ${contentType || "<missing>"}: ${response.url()}`);
    }
  });
  return { failures };
}

export async function waitForPublicPage(page: Page): Promise<void> {
  await page.waitForLoadState("load");
  await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

export async function findRawTexLeaks(
  page: Page,
  rootSelector = "main#main-content",
): Promise<readonly string[]> {
  return page.locator(rootSelector).evaluate((root) => {
    const excluded = "script, style, code, pre, textarea, .katex, [data-latex]";
    const pattern =
      /\$\$[^$]+\$\$|\$(?:\\.|[^$\n])+\$|\\(?:begin|end|frac|dfrac|tfrac|partial|nabla|alpha|beta|gamma|delta|theta|lambda|mu|nu|rho|sigma|phi|psi|omega|sum|prod|int|sqrt|mathbf|mathrm|mathbb|mathcal|operatorname|left|right|cdot|times|leq|geq|neq|infty)\b/u;
    const leaks: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.closest(excluded)) continue;
      const value = node.textContent?.replace(/\s+/gu, " ").trim() ?? "";
      if (value && pattern.test(value)) {
        leaks.push(`${parent.tagName.toLowerCase()}: ${value.slice(0, 180)}`);
      }
      if (leaks.length >= 25) break;
    }
    return [...new Set(leaks)];
  });
}

export async function findPublicTextLeaks(
  page: Page,
  internalIds: readonly string[],
): Promise<readonly string[]> {
  return page.locator("main#main-content").evaluate((root, ids) => {
    // Some authored anchors deliberately use a reader-facing Chinese heading as
    // their stable sourceId. Treating every sourceId as opaque makes ordinary
    // headings (for example, "交互实验") look like leaked implementation data.
    // Only machine-shaped identifiers are meaningful candidates for this audit.
    const knownIds = new Set(ids.filter((id) => /^(?=.*[:-])[a-z0-9][a-z0-9:_-]*$/iu.test(id)));
    const values: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, .katex, [data-latex]")) continue;
      const value = node.textContent?.replace(/\s+/gu, " ").trim();
      if (value) values.push(value);
    }
    for (const element of root.querySelectorAll<HTMLElement>("[aria-label], [title], [alt]")) {
      if (element.closest(".katex, [data-latex]")) continue;
      for (const name of ["aria-label", "title", "alt"]) {
        const value = element.getAttribute(name)?.trim();
        if (value) values.push(value);
      }
    }
    return [
      ...new Set(
        values.flatMap((value) => {
          const normalized = value.toLowerCase();
          const leaks: string[] = [];
          if (
            /\b(?:planned|outline|placeholder)\b|lorem ipsum|\btodo\b|占位(?:内容|文本)?|内部\s*id/iu.test(
              value,
            )
          ) {
            leaks.push(`placeholder/editorial text: ${value.slice(0, 180)}`);
          }
          if (
            knownIds.has(value) ||
            /\b(?:definition|theorem|exercise|example|chapter|resource|visualization|revision|relation)-[a-z0-9-]+\b/u.test(
              normalized,
            )
          ) {
            leaks.push(`internal id: ${value.slice(0, 180)}`);
          }
          return leaks;
        }),
      ),
    ];
  }, internalIds);
}
