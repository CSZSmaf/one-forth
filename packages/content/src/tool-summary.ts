import { generatedToolCoverageByLocale } from "./generated-tool-summary";

export interface ToolCoverageSummary {
  readonly visualizations: number;
  readonly nodes: number;
  readonly relations: number;
  readonly learningPaths: number;
  readonly glossaryEntries: number;
  readonly symbols: number;
  readonly equations: number;
  readonly resources: number;
  readonly updates: number;
}

const emptyToolCoverageSummary: ToolCoverageSummary = {
  visualizations: 0,
  nodes: 0,
  relations: 0,
  learningPaths: 0,
  glossaryEntries: 0,
  symbols: 0,
  equations: 0,
  resources: 0,
  updates: 0,
};

export function getToolCoverageSummary(locale: string): ToolCoverageSummary {
  return (
    generatedToolCoverageByLocale[locale as keyof typeof generatedToolCoverageByLocale] ??
    emptyToolCoverageSummary
  );
}
