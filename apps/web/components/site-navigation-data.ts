import type { SupportedLocale } from "@one-forth/config";
import type { ToolCoverageSummary } from "@one-forth/content/tool-summary";

export type ToolNavigationId =
  | "playground"
  | "graph"
  | "paths"
  | "glossary"
  | "symbols"
  | "equations"
  | "resources"
  | "updates";

export interface SiteNavigationItem {
  readonly id: ToolNavigationId;
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly currentPrefix: string;
}

export function createBookNavigation(locale: SupportedLocale) {
  const label = locale === "en" ? "Textbooks" : "教材目录";
  return {
    href: `/${locale}/books`,
    label,
    currentPrefix: `/${locale}/books`,
  } as const;
}

export function createToolNavigation(
  locale: SupportedLocale,
  coverage: ToolCoverageSummary,
): readonly SiteNavigationItem[] {
  const count = new Intl.NumberFormat(locale);
  const labels: Readonly<Record<ToolNavigationId, readonly [string, string]>> =
    locale === "en"
      ? {
          playground: [
            "Interactive labs",
            `${count.format(coverage.visualizations)} reproducible experiments.`,
          ],
          graph: [
            "Knowledge graph",
            `${count.format(coverage.nodes)} concepts and ${count.format(coverage.relations)} verified relations.`,
          ],
          paths: [
            "Learning paths",
            `${count.format(coverage.learningPaths)} guided topic and series routes.`,
          ],
          glossary: [
            "Glossary",
            `${count.format(coverage.glossaryEntries)} concepts and definitions linked to textbooks.`,
          ],
          symbols: [
            "Symbol index",
            `${count.format(coverage.symbols)} symbols with namespaces, units, and usage.`,
          ],
          equations: [
            "Equation index",
            `${count.format(coverage.equations)} equations with variables and assumptions.`,
          ],
          resources: [
            "Resources and papers",
            `${count.format(coverage.resources)} source records used by the textbooks.`,
          ],
          updates: [
            "Recent updates",
            `${count.format(coverage.updates)} substantive, mathematical, and citation revisions.`,
          ],
        }
      : {
          playground: ["交互实验", `${count.format(coverage.visualizations)} 个交互实验。`],
          graph: [
            "知识图谱",
            `${count.format(coverage.nodes)} 个概念、${count.format(coverage.relations)} 条关系。`,
          ],
          paths: ["学习路径", `${count.format(coverage.learningPaths)} 条专题与全系列学习路线。`],
          glossary: ["术语表", `${count.format(coverage.glossaryEntries)} 条术语。`],
          symbols: ["符号表", `${count.format(coverage.symbols)} 个符号。`],
          equations: ["公式索引", `${count.format(coverage.equations)} 条公式。`],
          resources: ["资源与论文", `${count.format(coverage.resources)} 项参考资料。`],
          updates: ["最近更新", `${count.format(coverage.updates)} 条更新。`],
        };
  return [
    {
      id: "playground",
      href: `/${locale}/playground`,
      label: labels.playground[0],
      description: labels.playground[1],
      currentPrefix: `/${locale}/playground`,
    },
    {
      id: "graph",
      href: `/${locale}/graph`,
      label: labels.graph[0],
      description: labels.graph[1],
      currentPrefix: `/${locale}/graph`,
    },
    {
      id: "paths",
      href: `/${locale}/paths`,
      label: labels.paths[0],
      description: labels.paths[1],
      currentPrefix: `/${locale}/paths`,
    },
    {
      id: "glossary",
      href: `/${locale}/glossary`,
      label: labels.glossary[0],
      description: labels.glossary[1],
      currentPrefix: `/${locale}/glossary`,
    },
    {
      id: "symbols",
      href: `/${locale}/symbols`,
      label: labels.symbols[0],
      description: labels.symbols[1],
      currentPrefix: `/${locale}/symbols`,
    },
    {
      id: "equations",
      href: `/${locale}/equations`,
      label: labels.equations[0],
      description: labels.equations[1],
      currentPrefix: `/${locale}/equations`,
    },
    {
      id: "resources",
      href: `/${locale}/resources`,
      label: labels.resources[0],
      description: labels.resources[1],
      currentPrefix: `/${locale}/resources`,
    },
    {
      id: "updates",
      href: `/${locale}/updates`,
      label: labels.updates[0],
      description: labels.updates[1],
      currentPrefix: `/${locale}/updates`,
    },
  ];
}

export function isNavigationItemCurrent(pathname: string, currentPrefix: string): boolean {
  return pathname === currentPrefix || pathname.startsWith(`${currentPrefix}/`);
}
