import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  displayPath,
  errorMessage,
  loadContentDocuments,
  repositoryRoot,
  type LoadedContentDocument,
} from "./lib/content-files.ts";

export type SimilaritySeverity = "advisory" | "warning" | "severe";

export type SimilarityFeatureKind =
  | "conclusion"
  | "example-instruction"
  | "exercise-instruction"
  | "frequent-ngram"
  | "heading-sequence"
  | "introduction"
  | "paragraph-opening"
  | "severe-template-repetition"
  | "transition";

export interface SimilarityDocument {
  readonly file: string;
  readonly title: string;
  readonly domain: string;
  readonly subject: string;
  readonly body: string;
  readonly bodyStartLine: number;
}

export interface ContentSimilarityConfig {
  readonly minimumFeatureHan: number;
  readonly paragraphOpeningHan: number;
  readonly ngramSize: number;
  readonly minimumSharedNgrams: number;
  readonly featureSimilarity: number;
  readonly headingSequenceSimilarity: number;
  readonly severeFeatureSimilarity: number;
  readonly severeFeatureCount: number;
  readonly unrelatedTitleSimilarityMaximum: number;
}

export const contentSimilarityConfig: ContentSimilarityConfig = {
  minimumFeatureHan: 18,
  paragraphOpeningHan: 28,
  ngramSize: 12,
  minimumSharedNgrams: 24,
  featureSimilarity: 0.88,
  headingSequenceSimilarity: 0.75,
  severeFeatureSimilarity: 0.94,
  severeFeatureCount: 3,
  unrelatedTitleSimilarityMaximum: 0.42,
};

export interface SimilarityFinding {
  readonly feature: SimilarityFeatureKind;
  readonly severity: SimilaritySeverity;
  readonly score: number;
  readonly summary: string;
  readonly leftExcerpt: string;
  readonly rightExcerpt: string;
}

export interface SimilarityPairReport {
  readonly leftFile: string;
  readonly leftTitle: string;
  readonly rightFile: string;
  readonly rightTitle: string;
  readonly unrelated: boolean;
  readonly findings: readonly SimilarityFinding[];
}

export interface ContentSimilarityFatalError {
  readonly file: string;
  readonly message: string;
}

export interface ContentSimilarityReport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly source: string;
  readonly configuration: ContentSimilarityConfig;
  readonly summary: {
    readonly filesScanned: number;
    readonly pairsCompared: number;
    readonly pairsWithFindings: number;
    readonly totalFindings: number;
    readonly severeUnrelatedPairs: number;
    readonly fatalErrors: number;
    readonly bySeverity: Readonly<Record<SimilaritySeverity, number>>;
    readonly byFeature: Readonly<Record<SimilarityFeatureKind, number>>;
  };
  readonly pairs: readonly SimilarityPairReport[];
  readonly fatalErrors: readonly ContentSimilarityFatalError[];
}

interface ExtractedFeatures {
  readonly headings: readonly string[];
  readonly paragraphOpenings: readonly string[];
  readonly introduction: string;
  readonly conclusion: string;
  readonly examples: readonly string[];
  readonly exercises: readonly string[];
  readonly transitions: readonly string[];
  readonly ngrams: ReadonlyMap<string, number>;
}

interface BestMatch {
  readonly score: number;
  readonly left: string;
  readonly right: string;
}

const currentFile = fileURLToPath(import.meta.url);
const reportDirectory = join(repositoryRoot, "reports", "round-5");
const jsonReportPath = join(reportDirectory, "content-similarity.json");
const markdownReportPath = join(reportDirectory, "content-similarity.md");
const featureKinds: readonly SimilarityFeatureKind[] = [
  "conclusion",
  "example-instruction",
  "exercise-instruction",
  "frequent-ngram",
  "heading-sequence",
  "introduction",
  "paragraph-opening",
  "severe-template-repetition",
  "transition",
];

function countHan(value: string): number {
  return [...value.matchAll(/\p{Script=Han}/gu)].length;
}

function spacesPreservingLines(value: string): string {
  return value.replace(/[^\n]/g, " ");
}

function maskPattern(value: string, pattern: RegExp): string {
  return value.replace(pattern, (match) => spacesPreservingLines(match));
}

function proseMask(body: string): string {
  let masked = maskPattern(body, /```[\s\S]*?```/g);
  masked = maskPattern(masked, /`[^`\n]*`/g);
  masked = maskPattern(masked, /<!--[\s\S]*?-->/g);
  masked = maskPattern(masked, /\$\$[\s\S]*?\$\$/g);
  masked = maskPattern(masked, /(?<!\\)\$(?!\$)[\s\S]*?(?<!\\)\$/g);
  masked = masked.replace(/<\/?[A-Za-z][^>]*>/g, (match) => spacesPreservingLines(match));
  return masked;
}

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+>]\s+/gm, "")
    .replace(/[\p{P}\p{S}\s]/gu, "")
    .toLocaleLowerCase("zh-CN");
}

function characterNgrams(value: string, size: number): string[] {
  const characters = [...normalize(value)];
  if (characters.length === 0) return [];
  if (characters.length <= size) return [characters.join("")];
  return characters
    .slice(0, characters.length - size + 1)
    .map((_, index) => characters.slice(index, index + size).join(""));
}

/** Pure Sørensen-Dice similarity over normalized character n-grams. */
export function textSimilarity(left: string, right: string, ngramSize = 3): number {
  const leftNgrams = characterNgrams(left, ngramSize);
  const rightNgrams = characterNgrams(right, ngramSize);
  if (leftNgrams.length === 0 || rightNgrams.length === 0) return 0;
  const remaining = new Map<string, number>();
  rightNgrams.forEach((ngram) => remaining.set(ngram, (remaining.get(ngram) ?? 0) + 1));
  let overlap = 0;
  leftNgrams.forEach((ngram) => {
    const count = remaining.get(ngram) ?? 0;
    if (count <= 0) return;
    overlap += 1;
    remaining.set(ngram, count - 1);
  });
  return (2 * overlap) / (leftNgrams.length + rightNgrams.length);
}

function paragraphs(masked: string): string[] {
  return masked
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(
      (block) =>
        countHan(block) > 0 &&
        !/^#{1,6}\s/u.test(block) &&
        !/^(?:[-*+] |\d+[.)] )/u.test(block) &&
        !/^\|/u.test(block),
    )
    .map((block) => block.replace(/\s+/g, " "));
}

function headings(masked: string): string[] {
  return [...masked.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => (match[1] ?? "").trim())
    .filter(Boolean);
}

function opening(value: string, hanLimit: number): string {
  const characters = [...value];
  let han = 0;
  let end = 0;
  while (end < characters.length && han < hanLimit) {
    if (/\p{Script=Han}/u.test(characters[end] ?? "")) han += 1;
    end += 1;
  }
  return characters.slice(0, end).join("").trim();
}

function componentBodies(body: string, component: "Example" | "Exercise"): string[] {
  const pattern = new RegExp(`<${component}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${component}>`, "g");
  return [...body.matchAll(pattern)]
    .map((match) => proseMask(match[1] ?? ""))
    .flatMap((value) => paragraphs(value))
    .filter((value) => countHan(value) >= 8)
    .map((value) => opening(value, 80));
}

function transitionSentences(values: readonly string[]): string[] {
  const candidates: string[] = [];
  for (const paragraph of values) {
    for (const match of paragraph.matchAll(/[^。！？!?；;]+[。！？!?；;]?/g)) {
      const sentence = match[0].trim();
      if (
        /^(?:接下来|下面|现在|于是|因此|由此|另一方面|前面|回到|进一步|最后|反过来|同样)/u.test(
          sentence,
        ) &&
        countHan(sentence) >= 8
      )
        candidates.push(sentence);
    }
  }
  return candidates;
}

/** Pure feature extraction; it does not read files or mutate input. */
export function extractSimilarityFeatures(
  document: SimilarityDocument,
  config: ContentSimilarityConfig = contentSimilarityConfig,
): ExtractedFeatures {
  const masked = proseMask(document.body);
  const proseParagraphs = paragraphs(masked);
  const sufficientlyLong = proseParagraphs.filter(
    (paragraph) => countHan(paragraph) >= config.minimumFeatureHan,
  );
  const narrative = sufficientlyLong.join("\n");
  const ngramCounts = new Map<string, number>();
  characterNgrams(narrative, config.ngramSize).forEach((ngram) =>
    ngramCounts.set(ngram, (ngramCounts.get(ngram) ?? 0) + 1),
  );
  return {
    headings: headings(masked),
    paragraphOpenings: sufficientlyLong.map((paragraph) =>
      opening(paragraph, config.paragraphOpeningHan),
    ),
    introduction: sufficientlyLong.slice(0, 2).join("\n"),
    conclusion: sufficientlyLong.slice(-2).join("\n"),
    examples: componentBodies(document.body, "Example"),
    exercises: componentBodies(document.body, "Exercise"),
    transitions: transitionSentences(sufficientlyLong),
    ngrams: ngramCounts,
  };
}

function bestMatch(leftValues: readonly string[], rightValues: readonly string[]): BestMatch {
  let best: BestMatch = { score: 0, left: "", right: "" };
  for (const left of leftValues) {
    for (const right of rightValues) {
      const score = textSimilarity(left, right);
      if (score > best.score) best = { score, left, right };
    }
  }
  return best;
}

function lcsLength(left: readonly string[], right: readonly string[]): number {
  const previous = new Array<number>(right.length + 1).fill(0);
  for (const leftValue of left) {
    const current = new Array<number>(right.length + 1).fill(0);
    for (let index = 1; index <= right.length; index += 1) {
      current[index] =
        normalize(leftValue) === normalize(right[index - 1] ?? "")
          ? (previous[index - 1] ?? 0) + 1
          : Math.max(previous[index] ?? 0, current[index - 1] ?? 0);
    }
    for (let index = 0; index < current.length; index += 1) previous[index] = current[index] ?? 0;
  }
  return previous[right.length] ?? 0;
}

/** Pure ordered-heading comparison. */
export function headingSequenceSimilarity(
  left: readonly string[],
  right: readonly string[],
): number {
  if (left.length === 0 || right.length === 0) return 0;
  return (2 * lcsLength(left, right)) / (left.length + right.length);
}

function sharedNgrams(
  left: ReadonlyMap<string, number>,
  right: ReadonlyMap<string, number>,
): { readonly count: number; readonly excerpt: string } {
  const shared = [...left.entries()]
    .flatMap(([ngram, leftCount]) => {
      const rightCount = right.get(ngram) ?? 0;
      return rightCount > 0 ? [{ ngram, count: Math.min(leftCount, rightCount) }] : [];
    })
    .sort((a, b) => b.count - a.count || a.ngram.localeCompare(b.ngram, "zh-CN"));
  return {
    count: shared.reduce((sum, item) => sum + item.count, 0),
    excerpt: shared
      .slice(0, 4)
      .map((item) => item.ngram)
      .join(" / "),
  };
}

function excerpt(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

function finding(
  feature: SimilarityFeatureKind,
  severity: SimilaritySeverity,
  score: number,
  summary: string,
  leftExcerpt: string,
  rightExcerpt: string,
): SimilarityFinding {
  return {
    feature,
    severity,
    score: Number(score.toFixed(4)),
    summary,
    leftExcerpt: excerpt(leftExcerpt),
    rightExcerpt: excerpt(rightExcerpt),
  };
}

function pairFindings(
  leftDocument: SimilarityDocument,
  rightDocument: SimilarityDocument,
  left: ExtractedFeatures,
  right: ExtractedFeatures,
  config: ContentSimilarityConfig,
): { readonly unrelated: boolean; readonly findings: SimilarityFinding[] } {
  const findings: SimilarityFinding[] = [];
  const titleScore = textSimilarity(leftDocument.title, rightDocument.title);
  const unrelated =
    (leftDocument.domain !== rightDocument.domain ||
      leftDocument.subject !== rightDocument.subject) &&
    titleScore <= config.unrelatedTitleSimilarityMaximum;
  const strongFeatures = new Set<SimilarityFeatureKind>();

  const addBest = (
    feature: SimilarityFeatureKind,
    label: string,
    leftValues: readonly string[],
    rightValues: readonly string[],
  ): void => {
    const best = bestMatch(leftValues, rightValues);
    if (best.score < config.featureSimilarity) return;
    const severity: SimilaritySeverity =
      best.score >= config.severeFeatureSimilarity ? "warning" : "advisory";
    findings.push(
      finding(
        feature,
        severity,
        best.score,
        `${label}出现高相似表达；需人工判断是否为必要术语重合或模板复用。`,
        best.left,
        best.right,
      ),
    );
    if (best.score >= config.severeFeatureSimilarity) strongFeatures.add(feature);
  };

  const headingScore = headingSequenceSimilarity(left.headings, right.headings);
  if (
    left.headings.length >= 3 &&
    right.headings.length >= 3 &&
    headingScore >= config.headingSequenceSimilarity
  ) {
    findings.push(
      finding(
        "heading-sequence",
        headingScore >= config.severeFeatureSimilarity ? "warning" : "advisory",
        headingScore,
        "H2 标题序列高度相似；检查章节组织是否机械复用。",
        left.headings.join(" → "),
        right.headings.join(" → "),
      ),
    );
    if (headingScore >= config.severeFeatureSimilarity) strongFeatures.add("heading-sequence");
  }

  addBest("paragraph-opening", "段落开头", left.paragraphOpenings, right.paragraphOpenings);
  addBest("introduction", "导言", [left.introduction], [right.introduction]);
  addBest("conclusion", "结尾", [left.conclusion], [right.conclusion]);
  addBest("example-instruction", "例题或示例说明", left.examples, right.examples);
  addBest("exercise-instruction", "练习说明", left.exercises, right.exercises);
  addBest("transition", "过渡句", left.transitions, right.transitions);

  const shared = sharedNgrams(left.ngrams, right.ngrams);
  if (shared.count >= config.minimumSharedNgrams) {
    const ngramScore = Math.min(1, shared.count / (config.minimumSharedNgrams * 3));
    findings.push(
      finding(
        "frequent-ngram",
        shared.count >= config.minimumSharedNgrams * 3 ? "warning" : "advisory",
        ngramScore,
        `共享 ${shared.count} 个计重 ${config.ngramSize}-gram；检查高频连续措辞是否来自通用模板。`,
        shared.excerpt,
        shared.excerpt,
      ),
    );
    if (shared.count >= config.minimumSharedNgrams * 3) strongFeatures.add("frequent-ngram");
  }

  if (unrelated && strongFeatures.size >= config.severeFeatureCount) {
    const evidence = [...strongFeatures].sort((a, b) => a.localeCompare(b, "en"));
    findings.push(
      finding(
        "severe-template-repetition",
        "severe",
        Math.min(1, strongFeatures.size / featureKinds.length + 0.5),
        `主题无关文章在 ${evidence.length} 类特征上出现强重复：${evidence.join("、")}。`,
        leftDocument.title,
        rightDocument.title,
      ),
    );
  }

  findings.sort(
    (a, b) =>
      featureKinds.indexOf(a.feature) - featureKinds.indexOf(b.feature) ||
      b.score - a.score ||
      a.summary.localeCompare(b.summary, "zh-CN"),
  );
  return { unrelated, findings };
}

export function exitCodeForSimilarityReport(report: ContentSimilarityReport): 0 | 1 {
  return report.summary.fatalErrors > 0 || report.summary.severeUnrelatedPairs > 0 ? 1 : 0;
}

/** Pure repository-wide analysis; only the CLI wrapper performs I/O. */
export function analyzeSimilarityDocuments(
  documents: readonly SimilarityDocument[],
  config: ContentSimilarityConfig = contentSimilarityConfig,
  fatalErrors: readonly ContentSimilarityFatalError[] = [],
  generatedAt = new Date().toISOString(),
): ContentSimilarityReport {
  const ordered = [...documents].sort((a, b) => a.file.localeCompare(b.file, "en"));
  const extracted = new Map(
    ordered.map(
      (document) => [document.file, extractSimilarityFeatures(document, config)] as const,
    ),
  );
  const pairs: SimilarityPairReport[] = [];
  let pairsCompared = 0;
  for (let leftIndex = 0; leftIndex < ordered.length - 1; leftIndex += 1) {
    const leftDocument = ordered[leftIndex];
    if (!leftDocument) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex += 1) {
      const rightDocument = ordered[rightIndex];
      if (!rightDocument) continue;
      pairsCompared += 1;
      const leftFeatures = extracted.get(leftDocument.file);
      const rightFeatures = extracted.get(rightDocument.file);
      if (!leftFeatures || !rightFeatures) continue;
      const result = pairFindings(leftDocument, rightDocument, leftFeatures, rightFeatures, config);
      if (result.findings.length === 0) continue;
      pairs.push({
        leftFile: leftDocument.file,
        leftTitle: leftDocument.title,
        rightFile: rightDocument.file,
        rightTitle: rightDocument.title,
        unrelated: result.unrelated,
        findings: result.findings,
      });
    }
  }

  const allFindings = pairs.flatMap((pair) => pair.findings);
  const bySeverity: Record<SimilaritySeverity, number> = {
    advisory: 0,
    warning: 0,
    severe: 0,
  };
  const byFeature = Object.fromEntries(featureKinds.map((feature) => [feature, 0])) as Record<
    SimilarityFeatureKind,
    number
  >;
  allFindings.forEach((item) => {
    bySeverity[item.severity] += 1;
    byFeature[item.feature] += 1;
  });
  return {
    schemaVersion: 1,
    generatedAt,
    source: "content/**/*.mdx",
    configuration: config,
    summary: {
      filesScanned: ordered.length,
      pairsCompared,
      pairsWithFindings: pairs.length,
      totalFindings: allFindings.length,
      severeUnrelatedPairs: pairs.filter((pair) =>
        pair.findings.some((item) => item.feature === "severe-template-repetition"),
      ).length,
      fatalErrors: fatalErrors.length,
      bySeverity,
      byFeature,
    },
    pairs,
    fatalErrors: [...fatalErrors],
  };
}

function markdownEscape(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderSimilarityMarkdown(report: ContentSimilarityReport): string {
  const lines = [
    "# One Forth Content Similarity Audit",
    "",
    `> Generated at ${report.generatedAt}. Similarity findings require editorial review; only fatal input errors or severe repetition between unrelated articles make the command fail.`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Files scanned | ${report.summary.filesScanned} |`,
    `| Pairs compared | ${report.summary.pairsCompared} |`,
    `| Pairs with findings | ${report.summary.pairsWithFindings} |`,
    `| Advisory findings | ${report.summary.bySeverity.advisory} |`,
    `| Warning findings | ${report.summary.bySeverity.warning} |`,
    `| Severe unrelated pairs | ${report.summary.severeUnrelatedPairs} |`,
    `| Fatal input errors | ${report.summary.fatalErrors} |`,
    "",
    "## Feature totals",
    "",
    "| Feature | Findings |",
    "| --- | ---: |",
    ...featureKinds.map((feature) => `| \`${feature}\` | ${report.summary.byFeature[feature]} |`),
  ];

  if (report.fatalErrors.length > 0) {
    lines.push("", "## Fatal errors", "");
    report.fatalErrors.forEach((error) =>
      lines.push(`- \`${markdownEscape(error.file)}\`: ${markdownEscape(error.message)}`),
    );
  }

  for (const pair of report.pairs) {
    lines.push(
      "",
      `## ${pair.leftTitle} ↔ ${pair.rightTitle}`,
      "",
      `Sources: \`${pair.leftFile}\` and \`${pair.rightFile}\`. Topic classification: ${pair.unrelated ? "unrelated" : "related or uncertain"}.`,
      "",
      "| Severity | Feature | Score | Finding | Left excerpt | Right excerpt |",
      "| --- | --- | ---: | --- | --- | --- |",
      ...pair.findings.map(
        (item) =>
          `| ${item.severity} | \`${item.feature}\` | ${item.score.toFixed(4)} | ${markdownEscape(item.summary)} | ${markdownEscape(item.leftExcerpt)} | ${markdownEscape(item.rightExcerpt)} |`,
      ),
    );
  }
  lines.push(
    "",
    "## Interpretation",
    "",
    "High similarity is a review signal, not an instruction to mechanically replace prose. Shared definitions and fixed terminology may be legitimate. A non-zero exit is reserved for unreadable input or strong multi-feature template repetition between articles classified as unrelated.",
    "",
  );
  return lines.join("\n");
}

function fromLoaded(document: LoadedContentDocument): SimilarityDocument {
  return {
    file: document.relativePath,
    title: document.frontmatter.title,
    domain: document.frontmatter.domain,
    subject: document.frontmatter.subject,
    body: document.body,
    bodyStartLine: document.bodyStartLine,
  };
}

async function writeReports(report: ContentSimilarityReport): Promise<void> {
  await mkdir(reportDirectory, { recursive: true });
  await Promise.all([
    writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(markdownReportPath, renderSimilarityMarkdown(report), "utf8"),
  ]);
}

export async function runContentSimilarityAudit(): Promise<ContentSimilarityReport> {
  const fatalErrors: ContentSimilarityFatalError[] = [];
  let documents: SimilarityDocument[] = [];
  try {
    const loaded = await loadContentDocuments();
    documents = loaded.documents.map(fromLoaded);
    fatalErrors.push(
      ...loaded.diagnostics.map((diagnostic) => ({
        file: diagnostic.file,
        message: diagnostic.message,
      })),
    );
    if (loaded.documents.length === 0)
      fatalErrors.push({ file: "content", message: "No MDX documents were found." });
  } catch (error) {
    fatalErrors.push({ file: "content", message: errorMessage(error) });
  }
  const report = analyzeSimilarityDocuments(documents, contentSimilarityConfig, fatalErrors);
  await writeReports(report);
  return report;
}

async function main(): Promise<void> {
  try {
    const report = await runContentSimilarityAudit();
    console.log(
      `Content similarity audit: ${report.summary.filesScanned} file(s), ${report.summary.pairsCompared} pair(s), ${report.summary.severeUnrelatedPairs} severe unrelated pair(s).`,
    );
    console.log(`JSON: ${displayPath(jsonReportPath)}`);
    console.log(`Markdown: ${displayPath(markdownReportPath)}`);
    if (exitCodeForSimilarityReport(report) !== 0) {
      report.fatalErrors.forEach((error) => console.error(`ERROR ${error.file}: ${error.message}`));
      if (report.summary.severeUnrelatedPairs > 0)
        console.error(
          `ERROR ${report.summary.severeUnrelatedPairs} unrelated article pair(s) show severe multi-feature template repetition.`,
        );
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`audit:content-similarity: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) void main();
