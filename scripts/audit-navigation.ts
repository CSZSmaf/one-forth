import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getToolCoverageSummary } from "../packages/content/src/tool-summary.ts";
import {
  createBookNavigation,
  createToolNavigation,
} from "../apps/web/components/site-navigation-data.ts";
import { repositoryRoot } from "./lib/content-files.ts";

interface AuditCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

const checks: AuditCheck[] = [];
function check(name: string, passed: boolean, detail: string): void {
  checks.push({ name, passed, detail });
}

const read = (path: string) => readFile(join(repositoryRoot, path), "utf8");
const [headerSource, homeSource, articleSource, bookNavigationSource] = await Promise.all([
  read("apps/web/components/site-header.tsx"),
  read("apps/web/app/[locale]/page.tsx"),
  read("apps/web/components/article-shell.tsx"),
  read("apps/web/components/article-book-navigation.tsx"),
]);
const bookNavigation = createBookNavigation("zh-CN");
const tools = createToolNavigation("zh-CN", getToolCoverageSummary("zh-CN"));

check(
  "header.primary-books",
  bookNavigation.href === "/zh-CN/books" && headerSource.includes("href={book.href}"),
  `${bookNavigation.label} -> ${bookNavigation.href}`,
);
check(
  "header.tools",
  new Set(tools.map((tool) => tool.id)).size === tools.length &&
    [
      "playground",
      "graph",
      "paths",
      "glossary",
      "symbols",
      "equations",
      "resources",
      "updates",
    ].every((id) => tools.some((tool) => tool.id === id)) &&
    headerSource.includes('aria-label="主导航"'),
  `${tools.length} unique auxiliary entries`,
);
check(
  "home.linear-sections",
  ["home-linear-hero", "home-series-directory", "home-first-book"].every((token) =>
    homeSource.includes(token),
  ),
  "hero, series directory and first-book sequence",
);
check(
  "home.entry-points",
  homeSource.includes("HomeCurriculumAction") &&
    homeSource.includes("href={`/${locale}/books`}") &&
    homeSource.includes('className="home-textbook-search"') &&
    homeSource.includes("action={`/${locale}/search`}"),
  "one curriculum action plus textbook search and books directory",
);
check(
  "article.left-directory",
  articleSource.includes("<ArticleBookNavigation") &&
    bookNavigationSource.includes('className="article-left"') &&
    bookNavigationSource.includes('aria-label="本册目录"'),
  "route-derived book and Part/Chapter navigation",
);
check(
  "article.right-directory",
  articleSource.includes('className="article-right"') &&
    articleSource.includes("<ArticleTableOfContents") &&
    articleSource.includes('ariaLabel="文章页内目录"'),
  "article heading table of contents",
);

const failures = checks.filter((entry) => !entry.passed);
checks.forEach((entry) =>
  console.log(`${entry.passed ? "PASS" : "FAIL"} ${entry.name}: ${entry.detail}`),
);
if (failures.length > 0) {
  console.error(`Navigation audit failed: ${failures.length}/${checks.length} checks failed.`);
  process.exitCode = 1;
} else {
  console.log(`Navigation audit passed: ${checks.length}/${checks.length} contracts.`);
}
