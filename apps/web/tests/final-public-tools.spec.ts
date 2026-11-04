import {
  equations,
  learningPathById,
  readerCurriculumRepository,
  requiredSeriesLearningPathIds,
  resources,
  symbols,
} from "@one-forth/content";
import {
  listToolIndexEntries,
  getToolIndexEntries,
  type ToolIndexEntry,
} from "@one-forth/content/tool-index";
import { visualizationManifest } from "@one-forth/visualization";
import { presentGraphConcepts } from "@one-forth/knowledge-graph/presentation";
import { expect, test } from "@playwright/test";
import {
  findPublicTextLeaks,
  findRawTexLeaks,
  installPublicPageAudit,
  waitForPublicPage,
} from "./helpers/public-page-contract";

const locale = "zh-CN" as const;
const toolIndexEntries = getToolIndexEntries();
const internalIds = [...new Set(toolIndexEntries.flatMap((entry) => [entry.id, entry.sourceId]))];
const byKind = (kind: ToolIndexEntry["kind"]) => listToolIndexEntries({ locale, kind });
const indexedIds = (kind: ToolIndexEntry["kind"]) =>
  new Set(byKind(kind).map((entry) => entry.sourceId));

const glossaryEntries = listToolIndexEntries({
  locale,
  kind: ["concept", "definition"],
}).filter((entry) => entry.title.trim() !== "" && entry.title.trim() !== entry.sourceId);
const equationIds = new Set(equations.map((equation) => equation.id));
const equationEntries = byKind("equation").filter((entry) => equationIds.has(entry.sourceId));
const symbolIds = new Set(symbols.map((symbol) => symbol.id));
const symbolEntries = byKind("symbol").filter((entry) => symbolIds.has(entry.sourceId));
const resourceIndexIds = indexedIds("resource");
const publicResources = resources.filter((resource) => resourceIndexIds.has(resource.id));
const graphEntries = presentGraphConcepts(byKind("concept"), locale);
const learningPathEntries = byKind("learning-path").filter((entry) =>
  learningPathById.has(entry.sourceId),
);
const visualizationIds: ReadonlySet<string> = new Set(
  visualizationManifest.map((entry) => entry.id),
);
const experimentEntries = byKind("visualization").filter(
  (entry) =>
    visualizationIds.has(entry.sourceId) &&
    Boolean(
      entry.chapterId && readerCurriculumRepository.getChapterContext(entry.chapterId, locale),
    ),
);

function deduplicateUpdates(entries: readonly ToolIndexEntry[]): readonly ToolIndexEntry[] {
  const publicTypes = new Set(["substantive", "mathematical-correction", "citation-update"]);
  const unique = new Map<string, ToolIndexEntry>();
  for (const entry of entries) {
    if (!entry.date || !entry.revisionType || !publicTypes.has(entry.revisionType)) continue;
    const key = [
      entry.documentId ?? entry.chapterId ?? entry.canonicalUrl,
      entry.date,
      entry.revisionType,
      entry.title,
      entry.summary ?? "",
    ].join("\0");
    if (!unique.has(key)) unique.set(key, entry);
  }
  return [...unique.values()];
}

const updateEntries = deduplicateUpdates(byKind("revision"));

interface ToolPageContract {
  readonly name: string;
  readonly path: string;
  readonly total: number;
  readonly pageSize?: number;
  readonly itemSelector: string;
  readonly paginationSelector?: string;
  readonly readySelector?: string;
}

const toolPages: readonly ToolPageContract[] = [
  {
    name: "交互实验",
    path: "/zh-CN/playground",
    total: experimentEntries.length,
    itemSelector: ".experiment-directory > li",
    readySelector: '.interactive-figure[data-client-ready="true"]',
  },
  {
    name: "知识图谱",
    path: "/zh-CN/graph",
    total: graphEntries.length,
    pageSize: 50,
    itemSelector: ".graph-node-index > ul > li",
    paginationSelector: ".graph-node-index__pagination",
  },
  {
    name: "学习路径",
    path: "/zh-CN/paths",
    total: learningPathEntries.length,
    itemSelector: ".path-directory__list > li",
  },
  {
    name: "术语表",
    path: "/zh-CN/glossary",
    total: glossaryEntries.length,
    pageSize: 50,
    itemSelector: ".glossary-domain > ol > li",
    paginationSelector: ".index-pagination",
  },
  {
    name: "符号表",
    path: "/zh-CN/symbols",
    total: symbolEntries.length,
    pageSize: 50,
    itemSelector: ".reference-table tbody > tr",
    paginationSelector: ".index-pagination",
  },
  {
    name: "公式索引",
    path: "/zh-CN/equations",
    total: equationEntries.length,
    pageSize: 20,
    itemSelector: ".equation-index > li",
    paginationSelector: ".index-pagination",
  },
  {
    name: "资源与论文",
    path: "/zh-CN/resources",
    total: publicResources.length,
    pageSize: 24,
    itemSelector: ".resource-directory__list > li",
    paginationSelector: ".index-pagination",
  },
  {
    name: "最近更新",
    path: "/zh-CN/updates",
    total: updateEntries.length,
    pageSize: 40,
    itemSelector: ".update-archive > li",
    paginationSelector: ".index-pagination",
  },
];

async function assertCleanPublicDom(page: Parameters<typeof installPublicPageAudit>[0]) {
  expect(await findPublicTextLeaks(page, internalIds)).toEqual([]);
  expect(await findRawTexLeaks(page)).toEqual([]);
  await expect(
    page.locator(
      ".reference-index-empty, .update-archive__empty, .graph-node-index__empty, .interactive-figure-error",
    ),
  ).toHaveCount(0);
}

test.describe("final public tool contracts", () => {
  test("the generated public index contains no seed titles or placeholder summaries", () => {
    const leaks = toolIndexEntries
      .filter((entry) => entry.locale === locale)
      .filter(
        (entry) =>
          ((entry.kind === "concept" || entry.kind === "definition") &&
            entry.title.trim() === entry.sourceId) ||
          /\b(?:planned|outline|placeholder)\b|lorem ipsum|\btodo\b|占位/iu.test(
            entry.summary ?? "",
          ),
      )
      .map((entry) => `${entry.kind}:${entry.sourceId}`);
    expect(leaks).toEqual([]);
  });

  for (const contract of toolPages) {
    test(`${contract.name} returns 200 and matches its registry-backed first page`, async ({
      page,
    }) => {
      const audit = installPublicPageAudit(page);
      const response = await page.goto(contract.path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await waitForPublicPage(page);
      if (contract.readySelector) await expect(page.locator(contract.readySelector)).toBeVisible();

      expect(contract.total, `${contract.name} must not be an empty public index`).toBeGreaterThan(
        0,
      );
      const visible = contract.pageSize
        ? Math.min(contract.total, contract.pageSize)
        : contract.total;
      await expect(page.locator(contract.itemSelector)).toHaveCount(visible);
      if (contract.pageSize && contract.paginationSelector) {
        const totalPages = Math.max(1, Math.ceil(contract.total / contract.pageSize));
        await expect(page.locator(contract.paginationSelector)).toContainText(
          `第 1 / ${totalPages} 页`,
        );
        await expect(page.locator(contract.paginationSelector)).toContainText(
          `共 ${contract.total}`,
        );
      }
      await assertCleanPublicDom(page);
      expect(audit.failures).toEqual([]);
    });
  }

  test("server and client filters preserve their value and page in the URL", async ({ page }) => {
    const audit = installPublicPageAudit(page);
    const glossaryDomain = glossaryEntries.find((entry) => entry.domain)?.domain;
    expect(glossaryDomain).toBeTruthy();
    const filteredGlossary = glossaryEntries.filter((entry) => entry.domain === glossaryDomain);
    const glossaryPage = filteredGlossary.length > 50 ? 2 : 1;
    await page.goto(
      `/zh-CN/glossary?domain=${encodeURIComponent(glossaryDomain ?? "")}&page=${glossaryPage}`,
      { waitUntil: "domcontentloaded" },
    );
    await waitForPublicPage(page);
    await expect(page.locator('select[name="domain"]')).toHaveValue(glossaryDomain ?? "");
    expect(new URL(page.url()).searchParams.get("page")).toBe(String(glossaryPage));
    await expect(page.locator(".glossary-domain > ol > li")).toHaveCount(
      Math.min(50, filteredGlossary.length - (glossaryPage - 1) * 50),
    );

    // Let the first page's background prefetches settle before deliberately navigating away.
    await page.waitForLoadState("networkidle");
    const graphDomain = graphEntries.find((entry) => entry.domain)?.domain;
    expect(graphDomain).toBeTruthy();
    const filteredGraph = graphEntries.filter((entry) => entry.domain === graphDomain);
    const graphPage = filteredGraph.length > 50 ? 2 : 1;
    await page.goto(
      `/zh-CN/graph?domain=${encodeURIComponent(graphDomain ?? "")}&page=${graphPage}`,
      { waitUntil: "domcontentloaded" },
    );
    await waitForPublicPage(page);
    await expect(page.locator("#graph-domain")).toHaveValue(graphDomain ?? "");
    expect(new URL(page.url()).searchParams.get("page")).toBe(String(graphPage));
    await expect(page.locator(".graph-node-index > ul > li")).toHaveCount(
      Math.min(50, filteredGraph.length - (graphPage - 1) * 50),
    );
    await assertCleanPublicDom(page);
    expect(audit.failures).toEqual([]);
  });
});

const newExperimentIds = [
  "probability-sampling-convergence",
  "confidence-coverage",
  "phase-space-chaos",
  "coulomb-gauss-field",
  "quantum-measurement",
  "algorithm-complexity-trace",
  "ode-stability-convergence",
  "pinn-residual-training",
  "function-graph-transform",
  "riemann-sum-convergence",
  "birthday-paradox-simulation",
  "damped-oscillator-regimes",
  "projectile-motion",
  "maxwell-speed-distribution",
  "least-squares-regression",
  "epsilon-greedy-bandit",
] as const;

test.describe("complete experiment registry", () => {
  test("the playground exposes exactly the complete 24-entry manifest", async ({ page }) => {
    expect(visualizationManifest).toHaveLength(24);
    expect(experimentEntries).toHaveLength(visualizationManifest.length);
    expect(new Set(experimentEntries.map((entry) => entry.sourceId))).toEqual(visualizationIds);

    const audit = installPublicPageAudit(page);
    await page.goto("/zh-CN/playground", { waitUntil: "domcontentloaded" });
    await waitForPublicPage(page);
    await expect(page.locator(".experiment-directory > li")).toHaveCount(
      visualizationManifest.length,
    );
    for (const experiment of visualizationManifest) {
      await expect(
        page.locator(
          `.experiment-directory__select[href="/zh-CN/playground?figure=${experiment.id}#figure-${experiment.id}"]`,
        ),
      ).toHaveCount(1);
    }
    expect(audit.failures).toEqual([]);
  });

  for (const [index, id] of newExperimentIds.entries()) {
    test(`${id} exposes the shared reproducibility and accessibility controls`, async ({
      page,
    }) => {
      const audit = installPublicPageAudit(page);
      const response = await page.goto(`/zh-CN/playground?figure=${id}`, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBe(200);
      await waitForPublicPage(page);
      const figure = page.locator(`.interactive-figure--${id}`);
      await expect(figure).toHaveAttribute("data-client-ready", "true");
      await expect(figure.getByRole("button", { name: "播放", exact: true })).toBeEnabled();
      await expect(figure.getByLabel("单步后退")).toBeEnabled();
      await expect(figure.getByLabel("单步前进")).toBeEnabled();
      await expect(figure.getByRole("button", { name: "重置", exact: true })).toBeEnabled();
      await expect(figure.getByRole("button", { name: "分享状态" })).toBeEnabled();
      await expect(figure.getByRole("button", { name: "导出 SVG" })).toBeEnabled();
      await expect(figure.getByRole("button", { name: "导出 PNG" })).toBeEnabled();
      const seed = figure.getByLabel("确定性种子");
      await expect(seed).toBeVisible();
      await seed.fill(String(20_260_715 + index));
      await figure.getByRole("button", { name: "分享状态" }).click();
      expect(new URL(page.url()).searchParams.get("viz")).toBe(id);
      expect(new URL(page.url()).searchParams.get("state")).toBeTruthy();
      await expect(figure.locator(".interactive-figure__status")).toContainText("数值核验通过");
      await expect(figure.locator('svg[role="img"]')).toHaveAttribute("aria-label", /.+/u);
      await figure.focus();
      await page.keyboard.press("ArrowRight");
      await expect(figure.getByLabel("当前动画进度")).toHaveAttribute("value", "1");
      await page.keyboard.press("Home");
      await expect(figure.getByLabel("当前动画进度")).toHaveAttribute("value", "0");
      await assertCleanPublicDom(page);
      expect(audit.failures).toEqual([]);
    });
  }
});

test.describe("complete public curriculum entrances", () => {
  for (const [seriesId, expectedBooks] of [
    ["physics", 13],
    ["computer-science", 7],
    ["artificial-intelligence", 15],
  ] as const) {
    test(`${seriesId} exposes all ${expectedBooks} books`, async ({ page }) => {
      const series = readerCurriculumRepository.getSeries(seriesId);
      expect(series).not.toBeNull();
      expect(readerCurriculumRepository.listBooks(seriesId)).toHaveLength(expectedBooks);
      const audit = installPublicPageAudit(page);
      const response = await page.goto(`/zh-CN/books/${series?.slug ?? seriesId}`, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBe(200);
      await waitForPublicPage(page);
      await expect(page.locator(".book-shelf > li")).toHaveCount(expectedBooks);
      await assertCleanPublicDom(page);
      expect(audit.failures).toEqual([]);
    });
  }

  test("all four complete-series paths are visible from the path directory", async ({ page }) => {
    const audit = installPublicPageAudit(page);
    const response = await page.goto("/zh-CN/paths", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await waitForPublicPage(page);
    expect(requiredSeriesLearningPathIds).toHaveLength(4);
    for (const id of requiredSeriesLearningPathIds) {
      const path = learningPathById.get(id);
      const entry = learningPathEntries.find((candidate) => candidate.sourceId === id);
      expect(path?.routeKind).toBe("series");
      expect(entry).toBeTruthy();
      await expect(
        page.locator(`.path-directory__list h3 a[href="${entry?.canonicalUrl ?? "#missing"}"]`),
      ).toBeVisible();
    }
    await expect(page.locator('.path-directory__list > li[data-kind="series"]')).toHaveCount(4);
    await assertCleanPublicDom(page);
    expect(audit.failures).toEqual([]);
  });
});
