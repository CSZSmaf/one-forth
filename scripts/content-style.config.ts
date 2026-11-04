export type ContentStyleSeverity = "advisory" | "warning";

export interface AiPhrasePattern {
  readonly label: string;
  readonly pattern: string;
  readonly kind: "literal" | "regex";
  readonly severity: ContentStyleSeverity;
}

export interface ContentStyleAllowlistEntry {
  /** Rule ID or "*". */
  readonly ruleId: string;
  /** Repository-relative glob. Omit to match every file. */
  readonly file?: string;
  /** Stable finding fingerprint copied from the generated report. */
  readonly fingerprint?: string;
  /** Case-sensitive substring required in the finding summary or excerpt. */
  readonly match?: string;
  readonly reason: string;
}

export interface ContentStyleConfig {
  readonly thresholds: {
    readonly minimumArticleHan: number;
    readonly minimumSectionHan: number;
    readonly minimumSingleSentenceParagraphHan: number;
    readonly minimumDuplicateSentenceHan: number;
    readonly minimumDuplicateParagraphHan: number;
    readonly minimumExercises: number;
    readonly minimumResources: number;
    readonly minimumCompleteExamples: number;
    readonly minimumVisualizationContextHan: number;
    readonly minimumUndefinedTermOccurrences: number;
    readonly minimumUndefinedSymbolOccurrences: number;
    /** Report overuse only when both the absolute count and density are high. */
    readonly minimumCanOccurrences: number;
    readonly maximumCanPerThousandHan: number;
    readonly minimumComparableHeadingCharacters: number;
    readonly adjacentHeadingSimilarity: number;
    readonly crossDocumentHeadingSimilarity: number;
  };
  readonly aiPhrases: readonly AiPhrasePattern[];
  readonly knownTerms: readonly string[];
  readonly knownSymbols: readonly string[];
  readonly allowlist: readonly ContentStyleAllowlistEntry[];
}

/**
 * Advisory defaults for long-form educational content. Add narrowly scoped
 * allowlist entries only after a human has reviewed the generated fingerprint.
 */
export const contentStyleConfig: ContentStyleConfig = {
  thresholds: {
    minimumArticleHan: 2_000,
    minimumSectionHan: 120,
    minimumSingleSentenceParagraphHan: 24,
    minimumDuplicateSentenceHan: 18,
    minimumDuplicateParagraphHan: 45,
    minimumExercises: 3,
    minimumResources: 2,
    minimumCompleteExamples: 2,
    minimumVisualizationContextHan: 80,
    minimumUndefinedTermOccurrences: 2,
    minimumUndefinedSymbolOccurrences: 3,
    minimumCanOccurrences: 5,
    maximumCanPerThousandHan: 5,
    minimumComparableHeadingCharacters: 5,
    adjacentHeadingSimilarity: 0.82,
    crossDocumentHeadingSimilarity: 0.9,
  },
  aiPhrases: [
    { label: "本页", pattern: "本页", kind: "literal", severity: "advisory" },
    { label: "你将", pattern: "你将", kind: "literal", severity: "advisory" },
    { label: "让我们", pattern: "让我们", kind: "literal", severity: "advisory" },
    { label: "最后，我们", pattern: "最后，我们", kind: "literal", severity: "advisory" },
    { label: "本文将", pattern: "本文将", kind: "literal", severity: "advisory" },
    { label: "不难发现", pattern: "不难发现", kind: "literal", severity: "advisory" },
    { label: "显而易见", pattern: "显而易见", kind: "literal", severity: "advisory" },
    { label: "毋庸置疑", pattern: "毋庸置疑", kind: "literal", severity: "advisory" },
    { label: "换言之", pattern: "换言之", kind: "literal", severity: "advisory" },
    {
      label: "从某种意义上说",
      pattern: "从某种意义上说",
      kind: "literal",
      severity: "advisory",
    },
    { label: "归根结底", pattern: "归根结底", kind: "literal", severity: "advisory" },
    { label: "总的来说", pattern: "总的来说", kind: "literal", severity: "advisory" },
    { label: "综上所述", pattern: "综上所述", kind: "literal", severity: "advisory" },
    { label: "在当今", pattern: "在当今", kind: "literal", severity: "advisory" },
    {
      label: "随着……不断",
      pattern: "随着[^。！？\\n]{0,40}不断",
      kind: "regex",
      severity: "advisory",
    },
    {
      label: "不是……而是",
      pattern: "(?:不是|并非)[^。！？；\\n]{0,60}而是",
      kind: "regex",
      severity: "advisory",
    },
    {
      label: "这并不意味着",
      pattern: "这并不意味着",
      kind: "literal",
      severity: "advisory",
    },
    { label: "不自动", pattern: "不自动", kind: "literal", severity: "advisory" },
    { label: "不等同于", pattern: "不等同于", kind: "literal", severity: "advisory" },
    { label: "本稿", pattern: "本稿", kind: "literal", severity: "warning" },
    {
      label: "当前资源注册表",
      pattern: "当前资源注册表",
      kind: "literal",
      severity: "warning",
    },
    { label: "无法核验", pattern: "无法核验", kind: "literal", severity: "warning" },
    { label: "不编造", pattern: "不编造", kind: "literal", severity: "warning" },
    { label: "不声称", pattern: "不声称", kind: "literal", severity: "warning" },
    { label: "验证平台", pattern: "验证平台", kind: "literal", severity: "warning" },
  ],
  knownTerms: [
    "API",
    "Canvas",
    "CFL",
    "DAG",
    "DOM",
    "HTML",
    "Jacobian",
    "JavaScript",
    "JSON",
    "MDX",
    "NaN",
    "PNG",
    "ReLU",
    "SVG",
    "Transformer",
    "TypeScript",
    "URL",
    "WebGL",
    "Worker",
  ],
  knownSymbols: [
    "A",
    "C",
    "K",
    "L",
    "N",
    "Q",
    "R",
    "T",
    "V",
    "Z",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "m",
    "n",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "alpha",
    "beta",
    "delta",
    "eta",
    "lambda",
    "mu",
    "omega",
    "pi",
    "tau",
    "theta",
  ],
  allowlist: [],
};
