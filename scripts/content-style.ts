import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  contentStyleConfig,
  type AiPhrasePattern,
  type ContentStyleAllowlistEntry,
  type ContentStyleConfig,
  type ContentStyleSeverity,
} from "./content-style.config.ts";
import {
  displayPath,
  errorMessage,
  loadContentDocuments,
  repositoryRoot,
  type LoadedContentDocument,
} from "./lib/content-files.ts";

export interface StyleDocument {
  readonly file: string;
  readonly title: string;
  readonly body: string;
  readonly bodyStartLine: number;
  readonly declaredVisualizations: readonly string[];
}

export interface ContentStyleLocation {
  readonly line: number;
  readonly column: number;
}

export interface ContentStyleFinding {
  readonly fingerprint: string;
  readonly ruleId: string;
  readonly severity: ContentStyleSeverity;
  readonly location: ContentStyleLocation;
  readonly summary: string;
  readonly excerpt: string;
}

interface CandidateFinding extends ContentStyleFinding {
  readonly offset: number;
}

export interface ContentStyleMetrics {
  readonly hanCharacters: number;
  readonly sections: number;
  readonly completeExamples: number;
  readonly exercises: number;
  readonly resources: number;
  readonly visualizations: number;
}

export interface ContentStyleFileReport {
  readonly file: string;
  readonly title: string;
  readonly metrics: ContentStyleMetrics;
  readonly findings: readonly ContentStyleFinding[];
}

export interface ContentStyleFatalError {
  readonly file: string;
  readonly message: string;
}

export interface ContentStyleReport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly source: string;
  readonly configuration: {
    readonly thresholds: ContentStyleConfig["thresholds"];
    readonly aiPhrasePatterns: number;
    readonly allowlistEntries: number;
    readonly localIgnoreSyntax: readonly string[];
  };
  readonly summary: {
    readonly filesScanned: number;
    readonly filesWithFindings: number;
    readonly totalFindings: number;
    readonly suppressedFindings: number;
    readonly fatalErrors: number;
    readonly bySeverity: Readonly<Record<ContentStyleSeverity, number>>;
    readonly byRule: Readonly<Record<string, number>>;
  };
  readonly files: readonly ContentStyleFileReport[];
  readonly fatalErrors: readonly ContentStyleFatalError[];
}

export function exitCodeForReport(report: ContentStyleReport): 0 | 1 {
  return report.summary.fatalErrors > 0 ? 1 : 0;
}

interface TextBlock {
  readonly text: string;
  readonly normalized: string;
  readonly offset: number;
  readonly line: number;
  readonly han: number;
}

interface SectionBlock extends TextBlock {
  readonly title: string;
  readonly endOffset: number;
  readonly contentOffset: number;
}

interface IgnoreRange {
  readonly startLine: number;
  readonly endLine: number;
  readonly rules: ReadonlySet<string>;
}

interface IgnoreModel {
  readonly fileRules: ReadonlySet<string>;
  readonly ranges: readonly IgnoreRange[];
}

interface WorkingFile {
  readonly document: StyleDocument;
  readonly metrics: ContentStyleMetrics;
  readonly paragraphs: readonly TextBlock[];
  readonly sections: readonly SectionBlock[];
  readonly candidates: CandidateFinding[];
  readonly ignores: IgnoreModel;
}

const currentFile = fileURLToPath(import.meta.url);
const reportsDirectory = join(repositoryRoot, "reports", "round-5");
const jsonReportPath = join(reportsDirectory, "content-style-report.json");
const markdownReportPath = join(reportsDirectory, "content-style-report.md");
const contentStyleRuleIds = [
  "adjacent-heading-similarity",
  "ai-phrase",
  "attention-marker",
  "can-frequency",
  "complete-example-count",
  "cross-document-duplicate-paragraph",
  "cross-document-heading-similarity",
  "duplicate-paragraph",
  "duplicate-heading",
  "duplicate-sentence",
  "editorial-term-leakage",
  "exercise-count",
  "generic-conclusion",
  "generic-introduction",
  "implication-marker",
  "essentially-marker",
  "passive-voice-candidate",
  "resource-count",
  "short-article",
  "short-section",
  "single-sentence-paragraph",
  "suspected-undefined-symbol",
  "suspected-undefined-term",
  "through-to-construction",
  "todo-marker",
  "visualization-context",
] as const;

const genericComparableHeadings = new Set([
  "引言",
  "学习目标",
  "练习",
  "习题",
  "总结",
  "小结",
  "知识关系",
  "资源",
  "外部资源",
  "已核对的外部资源",
  "后续学习",
]);

function countHan(value: string): number {
  return [...value.matchAll(/\p{Script=Han}/gu)].length;
}

function spacesPreservingLines(value: string): string {
  return value.replace(/[^\n]/g, " ");
}

function maskPattern(value: string, pattern: RegExp): string {
  return value.replace(pattern, (match) => spacesPreservingLines(match));
}

function narrativeMask(body: string): string {
  let masked = maskPattern(body, /```[\s\S]*?```/g);
  masked = maskPattern(masked, /`[^`\n]*`/g);
  masked = maskPattern(masked, /<!--[\s\S]*?-->/g);
  masked = maskPattern(masked, /<\/?[A-Za-z][^>]*>/g);
  return masked;
}

function codeMask(body: string): string {
  let masked = maskPattern(body, /```[\s\S]*?```/g);
  masked = maskPattern(masked, /`[^`\n]*`/g);
  masked = maskPattern(masked, /<!--[\s\S]*?-->/g);
  return masked;
}

function proseMask(body: string): string {
  let masked = narrativeMask(body);
  masked = maskPattern(masked, /\$\$[\s\S]*?\$\$/g);
  masked = maskPattern(masked, /(?<!\\)\$(?!\$)[\s\S]*?(?<!\\)\$/g);
  return masked;
}

function lineStarts(value: string): number[] {
  const starts = [0];
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "\n") starts.push(index + 1);
  }
  return starts;
}

function relativeLineAt(starts: readonly number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const value = starts[middle] ?? 0;
    if (value <= offset) low = middle + 1;
    else high = middle - 1;
  }
  return Math.max(0, high);
}

function locationAt(document: StyleDocument, offset: number): ContentStyleLocation {
  const starts = lineStarts(document.body);
  const relativeLine = relativeLineAt(starts, Math.max(0, offset));
  const lineStart = starts[relativeLine] ?? 0;
  return {
    line: document.bodyStartLine + relativeLine,
    column: Math.max(1, offset - lineStart + 1),
  };
}

function excerptAt(body: string, offset: number, fallback: string): string {
  const start = body.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const newline = body.indexOf("\n", offset);
  const end = newline < 0 ? body.length : newline;
  const line = body.slice(start, end).trim().replace(/\s+/g, " ");
  return (line || fallback).slice(0, 180);
}

function normalizeText(value: string): string {
  return value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/?[A-Za-z][^>]*>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+>]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparableText(value: string): string {
  return normalizeText(value)
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\p{P}\p{S}\s]/gu, "");
}

function characterNgrams(value: string, size: number): string[] {
  const characters = [...normalizeComparableText(value)];
  if (characters.length === 0) return [];
  if (characters.length <= size) return [characters.join("")];
  return characters
    .slice(0, characters.length - size + 1)
    .map((_, index) => characters.slice(index, index + size).join(""));
}

/** Pure, symmetric similarity helper used by heading heuristics. */
export function characterDiceSimilarity(left: string, right: string, size = 2): number {
  const leftNgrams = characterNgrams(left, size);
  const rightNgrams = characterNgrams(right, size);
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

function comparableHeading(title: string, minimumCharacters: number): string | undefined {
  const normalized = normalizeComparableText(title);
  if (normalized.length < minimumCharacters || genericComparableHeadings.has(normalized))
    return undefined;
  return normalized;
}

function findingFingerprint(
  file: string,
  ruleId: string,
  summary: string,
  excerpt: string,
): string {
  return createHash("sha256")
    .update(`${ruleId}\0${file}\0${normalizeText(summary)}\0${normalizeText(excerpt)}`)
    .digest("hex")
    .slice(0, 16);
}

function makeFinding(
  document: StyleDocument,
  ruleId: string,
  severity: ContentStyleSeverity,
  offset: number,
  summary: string,
  excerpt?: string,
): CandidateFinding {
  const resolvedExcerpt =
    excerpt?.trim().slice(0, 180) || excerptAt(document.body, offset, summary);
  return {
    fingerprint: findingFingerprint(document.file, ruleId, summary, resolvedExcerpt),
    ruleId,
    severity,
    location: locationAt(document, offset),
    summary,
    excerpt: resolvedExcerpt,
    offset,
  };
}

function extractParagraphs(document: StyleDocument, masked: string): TextBlock[] {
  const starts = lineStarts(masked);
  const lines = masked.split("\n");
  const paragraphs: TextBlock[] = [];
  let blockStart = -1;
  let blockEnd = -1;

  const flush = (): void => {
    if (blockStart < 0 || blockEnd < blockStart) return;
    const startLine = blockStart;
    const offset = starts[blockStart] ?? 0;
    const end =
      blockEnd + 1 < starts.length
        ? Math.max(offset, (starts[blockEnd + 1] ?? offset) - 1)
        : masked.length;
    const text = masked.slice(offset, end).trim();
    blockStart = -1;
    blockEnd = -1;
    if (!text) return;
    const firstLine = text.split("\n", 1)[0]?.trim() ?? "";
    if (
      /^#{1,6}\s/.test(firstLine) ||
      /^(?:[-*+]|\d+[.)])\s/.test(firstLine) ||
      /^\|/.test(firstLine) ||
      /^\$\$/.test(firstLine)
    )
      return;
    const normalized = normalizeText(text);
    const han = countHan(normalized);
    if (han === 0) return;
    paragraphs.push({
      text,
      normalized,
      offset,
      line: document.bodyStartLine + startLine,
      han,
    });
  };

  for (let index = 0; index < lines.length; index += 1) {
    if ((lines[index] ?? "").trim() === "") {
      flush();
      continue;
    }
    if (blockStart < 0) blockStart = index;
    blockEnd = index;
  }
  flush();
  return paragraphs;
}

function extractSections(document: StyleDocument, masked: string): SectionBlock[] {
  const matches = [...masked.matchAll(/^##\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const offset = match.index;
    const newline = masked.indexOf("\n", offset);
    const contentOffset = newline < 0 ? masked.length : newline + 1;
    const endOffset = matches[index + 1]?.index ?? masked.length;
    const text = masked.slice(contentOffset, endOffset).trim();
    return {
      title: (match[1] ?? "").trim(),
      text,
      normalized: normalizeText(text),
      offset,
      endOffset,
      contentOffset,
      line: locationAt(document, offset).line,
      han: countHan(text),
    };
  });
}

function parseRuleList(value: string): ReadonlySet<string> {
  const rules = value
    .trim()
    .split(/[\s,]+/)
    .map((rule) => rule.trim())
    .filter(Boolean);
  return new Set(rules.length > 0 ? rules : ["*"]);
}

function nextBlockRange(body: string, afterOffset: number, document: StyleDocument): IgnoreRange {
  let start = afterOffset;
  while (start < body.length && /\s/.test(body[start] ?? "")) start += 1;
  const blank = body.slice(start).search(/\n\s*\n/);
  const end = blank < 0 ? body.length : start + blank;
  return {
    startLine: locationAt(document, start).line,
    endLine: locationAt(document, Math.max(start, end)).line,
    rules: new Set(),
  };
}

function parseIgnoreModel(document: StyleDocument): IgnoreModel {
  const fileRules = new Set<string>();
  const ranges: IgnoreRange[] = [];
  const active: { readonly rules: ReadonlySet<string>; readonly startLine: number }[] = [];
  const directive = /<!--\s*content-style-ignore-(file|next|start|end)\b([\s\S]*?)-->/g;

  for (const match of document.body.matchAll(directive)) {
    const command = match[1] ?? "";
    const rules = parseRuleList(match[2] ?? "");
    const line = locationAt(document, match.index).line;
    if (command === "file") {
      rules.forEach((rule) => fileRules.add(rule));
    } else if (command === "next") {
      const range = nextBlockRange(document.body, match.index + match[0].length, document);
      ranges.push({ ...range, rules });
    } else if (command === "start") {
      active.push({ rules, startLine: line + 1 });
    } else if (command === "end") {
      const opened = active.pop();
      if (opened)
        ranges.push({
          startLine: opened.startLine,
          endLine: Math.max(opened.startLine, line - 1),
          rules: opened.rules,
        });
    }
  }
  const finalLine = document.bodyStartLine + document.body.split("\n").length - 1;
  active.forEach((opened) =>
    ranges.push({ startLine: opened.startLine, endLine: finalLine, rules: opened.rules }),
  );
  return { fileRules, ranges };
}

function ruleMatches(rules: ReadonlySet<string>, ruleId: string): boolean {
  return rules.has("*") || rules.has(ruleId);
}

function locallyIgnored(model: IgnoreModel, finding: ContentStyleFinding): boolean {
  if (ruleMatches(model.fileRules, finding.ruleId)) return true;
  return model.ranges.some(
    (range) =>
      finding.location.line >= range.startLine &&
      finding.location.line <= range.endLine &&
      ruleMatches(range.rules, finding.ruleId),
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globMatches(glob: string, file: string): boolean {
  const marker = "\u0000";
  const source = escapeRegex(glob)
    .replaceAll("\\*\\*", marker)
    .replaceAll("\\*", "[^/]*")
    .replaceAll(marker, ".*")
    .replaceAll("\\?", ".");
  return new RegExp(`^${source}$`, "u").test(file);
}

function allowlisted(
  entry: ContentStyleAllowlistEntry,
  file: string,
  finding: ContentStyleFinding,
): boolean {
  if (entry.ruleId !== "*" && entry.ruleId !== finding.ruleId) return false;
  if (entry.file && !globMatches(entry.file, file)) return false;
  if (entry.fingerprint && entry.fingerprint !== finding.fingerprint) return false;
  if (entry.match && !`${finding.summary}\n${finding.excerpt}`.includes(entry.match)) return false;
  return true;
}

function compilePhrase(phrase: AiPhrasePattern): RegExp {
  return phrase.kind === "literal"
    ? new RegExp(escapeRegex(phrase.pattern), "gu")
    : new RegExp(phrase.pattern, "gu");
}

function phraseFindings(
  document: StyleDocument,
  masked: string,
  phrases: readonly AiPhrasePattern[],
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  for (const phrase of phrases) {
    for (const match of masked.matchAll(compilePhrase(phrase))) {
      findings.push(
        makeFinding(
          document,
          "ai-phrase",
          phrase.severity,
          match.index,
          `命中模板化或元话语短语“${phrase.label}”；需人工判断是否改为直接陈述。`,
          match[0],
        ),
      );
    }
  }
  return findings;
}

interface StylePatternRule {
  readonly ruleId: string;
  readonly pattern: RegExp;
  readonly summary: (match: string) => string;
}

function patternFindings(
  document: StyleDocument,
  masked: string,
  rules: readonly StylePatternRule[],
): CandidateFinding[] {
  return rules.flatMap((rule) =>
    [...masked.matchAll(rule.pattern)].map((match) =>
      makeFinding(document, rule.ruleId, "advisory", match.index, rule.summary(match[0]), match[0]),
    ),
  );
}

function lexicalStyleFindings(
  document: StyleDocument,
  masked: string,
  config: ContentStyleConfig,
): CandidateFinding[] {
  const findings = patternFindings(document, masked, [
    {
      ruleId: "through-to-construction",
      pattern:
        /通过[^。！？；\n]{1,48}来(?:说明|理解|判断|构造|计算|验证|观察|分析|刻画|建立|求解|描述|获得|得到|实现|研究|检查|证明|比较)?/gu,
      summary: (match) => `“${match}”是“通过……来……”候选；检查动作与目的能否直接陈述。`,
    },
    {
      ruleId: "attention-marker",
      pattern: /(?:需要(?:注意|指出|强调|说明|记住|区分|检查)|值得注意(?:的是)?)/gu,
      summary: (match) => `命中“${match}”提示语；检查是否可直接给出需要关注的条件或结论。`,
    },
    {
      ruleId: "implication-marker",
      pattern: /这意味着/gu,
      summary: () => "命中“这意味着”；检查后句是否真正由前句推出，并优先写清推理关系。",
    },
    {
      ruleId: "essentially-marker",
      pattern: /本质上/gu,
      summary: () => "命中“本质上”；检查该概括是否过强，或是否可以换成可核查的结构说明。",
    },
    {
      ruleId: "passive-voice-candidate",
      pattern:
        /(?:被|由)[^。！？；\n]{1,48}(?:所)?(?:称为|定义为|记为|证明|给出|构造|计算|描述|决定|推导|观察到|认为|用于|看作)/gu,
      summary: (match) => `“${match}”是被动表达候选；只在施事者或对象关系不清时改写。`,
    },
  ]);

  const canOccurrences = [...masked.matchAll(/可以/gu)];
  const han = Math.max(1, countHan(masked));
  const perThousandHan = (canOccurrences.length * 1_000) / han;
  if (
    canOccurrences.length >= config.thresholds.minimumCanOccurrences &&
    perThousandHan > config.thresholds.maximumCanPerThousandHan
  ) {
    const first = canOccurrences[0];
    if (first) {
      findings.push(
        makeFinding(
          document,
          "can-frequency",
          "advisory",
          first.index,
          `“可以”出现 ${canOccurrences.length} 次（每千汉字 ${perThousandHan.toFixed(1)} 次），超过建议密度 ${config.thresholds.maximumCanPerThousandHan}；逐处判断是能力、许可还是可能性。`,
          first[0],
        ),
      );
    }
  }
  return findings;
}

function genericFramingFindings(
  document: StyleDocument,
  paragraphs: readonly TextBlock[],
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  const introductionPatterns = [
    /(?:本文|本章|本节)(?:将|主要|旨在)?[^。！？\n]{0,36}(?:介绍|讨论|探讨|讲解|阐述|带领|帮助)/u,
    /(?:让我们|下面我们|接下来我们)[^。！？\n]{0,36}(?:学习|了解|看看|探讨|讨论)/u,
    /在[^。！？\n]{0,24}(?:快速发展|日益重要|广泛应用)的(?:今天|背景下|时代)/u,
  ];
  const conclusionPatterns = [
    /(?:综上所述|总而言之|总的来说)/u,
    /通过(?:本文|本章|本节)的学习[^。！？\n]{0,48}/u,
    /(?:本文|本章|本节)(?:系统地)?(?:介绍|讨论|探讨|讲解)了/u,
  ];

  for (const paragraph of paragraphs.slice(0, 2)) {
    const pattern = introductionPatterns.find((candidate) => candidate.test(paragraph.text));
    if (!pattern) continue;
    const match = paragraph.text.match(pattern);
    findings.push(
      makeFinding(
        document,
        "generic-introduction",
        "advisory",
        paragraph.offset + Math.max(0, match?.index ?? 0),
        "导言命中通用课程模板；检查是否能改为本章特有的问题、对象或矛盾。",
        match?.[0] ?? paragraph.normalized,
      ),
    );
    break;
  }

  for (const paragraph of paragraphs.slice(-3)) {
    const pattern = conclusionPatterns.find((candidate) => candidate.test(paragraph.text));
    if (!pattern) continue;
    const match = paragraph.text.match(pattern);
    findings.push(
      makeFinding(
        document,
        "generic-conclusion",
        "advisory",
        paragraph.offset + Math.max(0, match?.index ?? 0),
        "结尾命中通用总结模板；检查是否能回到本章的具体结论、边界或下一问题。",
        match?.[0] ?? paragraph.normalized,
      ),
    );
    break;
  }
  return findings;
}

function sourceMarkerFindings(
  document: StyleDocument,
  maskedNarrative: string,
): CandidateFinding[] {
  let sourceForTodo = maskPattern(document.body, /```[\s\S]*?```/g);
  sourceForTodo = maskPattern(sourceForTodo, /`[^`\n]*`/g);
  const findings: CandidateFinding[] = [];
  const todoPattern =
    /\b(?:TODO|FIXME|TBD)\b|待补(?:充|写|证)?|待核(?:对|验)?|尚待(?:补充|完成)|占位(?:符|内容)?/giu;
  for (const match of sourceForTodo.matchAll(todoPattern)) {
    findings.push(
      makeFinding(
        document,
        "todo-marker",
        "warning",
        match.index,
        `正文源文件含未完成标记“${match[0]}”；发布前需人工确认并清除公开占位。`,
        match[0],
      ),
    );
  }

  const editorialPattern =
    /审阅状态说明|待人工审阅|课程规划页|尚无正式正文|内容生产(?:计划|队列|进度)?|编辑(?:状态|流程|备注)|发布状态|内部(?:备注|校验|审阅)|(?:frontmatter|schema|registry|migration)\s*(?:字段|状态|迁移|校验)?|资源注册表|本文仍是\s*`?(?:draft|outline|planned)`?/giu;
  for (const match of maskedNarrative.matchAll(editorialPattern)) {
    findings.push(
      makeFinding(
        document,
        "editorial-term-leakage",
        "warning",
        match.index,
        `命中内部编辑或内容生产术语“${match[0]}”；公开正文不应说明生产状态或实现细节。`,
        match[0],
      ),
    );
  }
  return findings;
}

function headingFindings(
  document: StyleDocument,
  sections: readonly SectionBlock[],
  config: ContentStyleConfig,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  const groups = new Map<string, SectionBlock[]>();
  sections.forEach((section) => {
    const key = normalizeComparableText(section.title);
    groups.set(key, [...(groups.get(key) ?? []), section]);
  });
  for (const occurrences of groups.values()) {
    if (occurrences.length < 2) continue;
    const first = occurrences[0];
    if (!first) continue;
    findings.push(
      makeFinding(
        document,
        "duplicate-heading",
        "warning",
        first.offset,
        `H2 标题“${first.title}”在本文重复 ${occurrences.length} 次；标题应准确区分各节职责。`,
        `## ${first.title}`,
      ),
    );
  }

  for (let index = 0; index < sections.length - 1; index += 1) {
    const left = sections[index];
    const right = sections[index + 1];
    if (!left || !right) continue;
    const leftComparable = comparableHeading(
      left.title,
      config.thresholds.minimumComparableHeadingCharacters,
    );
    const rightComparable = comparableHeading(
      right.title,
      config.thresholds.minimumComparableHeadingCharacters,
    );
    if (!leftComparable || !rightComparable) continue;
    const similarity = characterDiceSimilarity(leftComparable, rightComparable);
    if (similarity < config.thresholds.adjacentHeadingSimilarity) continue;
    findings.push(
      makeFinding(
        document,
        "adjacent-heading-similarity",
        "advisory",
        right.offset,
        `相邻 H2“${left.title}”与“${right.title}”相似度 ${similarity.toFixed(2)}；检查是否应合并或改成更具体的标题。`,
        `## ${right.title}`,
      ),
    );
  }
  return findings;
}

function sentenceRanges(
  paragraph: TextBlock,
): { readonly text: string; readonly offset: number; readonly han: number }[] {
  const sentences: { text: string; offset: number; han: number }[] = [];
  const pattern = /[^。！？!?；;\n]+[。！？!?；;]?/g;
  for (const match of paragraph.text.matchAll(pattern)) {
    const text = normalizeText(match[0]);
    const han = countHan(text);
    if (han > 0) sentences.push({ text, offset: paragraph.offset + match.index, han });
  }
  return sentences;
}

function duplicateFindings(
  document: StyleDocument,
  paragraphs: readonly TextBlock[],
  config: ContentStyleConfig,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  const paragraphGroups = new Map<string, TextBlock[]>();
  const sentenceGroups = new Map<
    string,
    { readonly text: string; readonly offset: number; readonly han: number }[]
  >();

  for (const paragraph of paragraphs) {
    if (paragraph.han >= config.thresholds.minimumDuplicateParagraphHan) {
      paragraphGroups.set(paragraph.normalized, [
        ...(paragraphGroups.get(paragraph.normalized) ?? []),
        paragraph,
      ]);
    }
    for (const sentence of sentenceRanges(paragraph)) {
      if (sentence.han < config.thresholds.minimumDuplicateSentenceHan) continue;
      sentenceGroups.set(sentence.text, [...(sentenceGroups.get(sentence.text) ?? []), sentence]);
    }
  }

  for (const occurrences of paragraphGroups.values()) {
    if (occurrences.length < 2) continue;
    const first = occurrences[0];
    if (!first) continue;
    const lines = occurrences.map((item) => locationAt(document, item.offset).line).join("、");
    findings.push(
      makeFinding(
        document,
        "duplicate-paragraph",
        "warning",
        first.offset,
        `同一段落在本文重复 ${occurrences.length} 次，位置：${lines}。`,
        first.normalized,
      ),
    );
  }
  for (const occurrences of sentenceGroups.values()) {
    if (occurrences.length < 2) continue;
    const first = occurrences[0];
    if (!first) continue;
    const lines = occurrences.map((item) => locationAt(document, item.offset).line).join("、");
    findings.push(
      makeFinding(
        document,
        "duplicate-sentence",
        "advisory",
        first.offset,
        `同一句子在本文重复 ${occurrences.length} 次，位置：${lines}。`,
        first.text,
      ),
    );
  }
  return findings;
}

function singleSentenceFindings(
  document: StyleDocument,
  paragraphs: readonly TextBlock[],
  config: ContentStyleConfig,
): CandidateFinding[] {
  return paragraphs.flatMap((paragraph) => {
    const sentences = sentenceRanges(paragraph);
    if (
      paragraph.han < config.thresholds.minimumSingleSentenceParagraphHan ||
      sentences.length !== 1
    )
      return [];
    return [
      makeFinding(
        document,
        "single-sentence-paragraph",
        "advisory",
        paragraph.offset,
        `该段只有一个句子（${paragraph.han} 个汉字）；检查是否为机械拆段。`,
        paragraph.normalized,
      ),
    ];
  });
}

function structuralFindings(
  document: StyleDocument,
  metrics: ContentStyleMetrics,
  sections: readonly SectionBlock[],
  config: ContentStyleConfig,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  const firstOffset = sections[0]?.offset ?? 0;
  if (metrics.hanCharacters < config.thresholds.minimumArticleHan) {
    findings.push(
      makeFinding(
        document,
        "short-article",
        "warning",
        firstOffset,
        `正文含 ${metrics.hanCharacters} 个汉字，低于建议下限 ${config.thresholds.minimumArticleHan}。`,
      ),
    );
  }
  for (const section of sections) {
    if (section.han >= config.thresholds.minimumSectionHan) continue;
    findings.push(
      makeFinding(
        document,
        "short-section",
        "advisory",
        section.offset,
        `章节“${section.title}”仅含 ${section.han} 个汉字，低于建议下限 ${config.thresholds.minimumSectionHan}。`,
        `## ${section.title}`,
      ),
    );
  }
  const minimums: readonly {
    readonly ruleId: string;
    readonly actual: number;
    readonly expected: number;
    readonly label: string;
  }[] = [
    {
      ruleId: "exercise-count",
      actual: metrics.exercises,
      expected: config.thresholds.minimumExercises,
      label: "练习",
    },
    {
      ruleId: "resource-count",
      actual: metrics.resources,
      expected: config.thresholds.minimumResources,
      label: "资源卡",
    },
    {
      ruleId: "complete-example-count",
      actual: metrics.completeExamples,
      expected: config.thresholds.minimumCompleteExamples,
      label: "完整例题/示例",
    },
  ];
  minimums.forEach((item) => {
    if (item.actual >= item.expected) return;
    findings.push(
      makeFinding(
        document,
        item.ruleId,
        "warning",
        firstOffset,
        `${item.label}数量为 ${item.actual}，低于建议下限 ${item.expected}。`,
      ),
    );
  });
  return findings;
}

function visualizationFindings(
  document: StyleDocument,
  masked: string,
  sections: readonly SectionBlock[],
  config: ContentStyleConfig,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  const embedded = [
    ...document.body.matchAll(/<InteractiveFigure\s+id=["']([^"']+)["'][^>]*\/?\s*>/g),
  ];
  const embeddedIds = new Set(embedded.map((match) => match[1] ?? ""));

  for (const declared of document.declaredVisualizations) {
    if (embeddedIds.has(declared)) continue;
    findings.push(
      makeFinding(
        document,
        "visualization-context",
        "warning",
        0,
        `frontmatter 声明可视化“${declared}”，但正文没有对应 InteractiveFigure。`,
      ),
    );
  }

  for (const match of embedded) {
    const section = sections.find(
      (candidate) => match.index >= candidate.contentOffset && match.index < candidate.endOffset,
    );
    const start = section?.contentOffset ?? 0;
    const end = section?.endOffset ?? document.body.length;
    const before = normalizeText(masked.slice(start, match.index));
    const after = normalizeText(masked.slice(match.index + match[0].length, end));
    const combined = `${before}\n${after}`;
    const missing: string[] = [];
    if (countHan(combined) < config.thresholds.minimumVisualizationContextHan)
      missing.push(`上下文少于 ${config.thresholds.minimumVisualizationContextHan} 汉字`);
    if (countHan(before) < 12) missing.push("实验前缺少问题或目标");
    if (countHan(after) < 30) missing.push("实验后缺少操作或结论");
    if (!/(?:改变|调整|拖动|暂停|单步|比较|记录|检查|尝试|重置|切换|观察)/u.test(after))
      missing.push("未识别到操作指引");
    if (!/(?:观察|验证|比较|解释|说明|结论|边界|不能|不是|检查)/u.test(combined))
      missing.push("未识别到观察目标或解释边界");
    if (missing.length === 0) continue;
    findings.push(
      makeFinding(
        document,
        "visualization-context",
        "warning",
        match.index,
        `可视化“${match[1] ?? "unknown"}”上下文不完整：${missing.join("；")}。`,
        match[0],
      ),
    );
  }
  return findings;
}

interface Occurrence {
  readonly count: number;
  readonly firstOffset: number;
  readonly defined: boolean;
}

function setOccurrence(
  map: Map<string, Occurrence>,
  key: string,
  offset: number,
  defined: boolean,
): void {
  const previous = map.get(key);
  map.set(key, {
    count: (previous?.count ?? 0) + 1,
    firstOffset: previous?.firstOffset ?? offset,
    defined: (previous?.defined ?? false) || defined,
  });
}

function formulaSymbols(formula: string): string[] {
  const symbols: string[] = [];
  for (const match of formula.matchAll(/\\(alpha|beta|delta|eta|lambda|mu|omega|pi|tau|theta)\b/g))
    symbols.push(match[1] ?? "");
  for (const match of formula.matchAll(
    /(?<![A-Za-z\\])([A-Za-z])(?:_[A-Za-z0-9{}]+)?(?![A-Za-z])/g,
  ))
    symbols.push(match[1] ?? "");
  return symbols.filter(Boolean);
}

function undefinedLanguageFindings(
  document: StyleDocument,
  maskedProse: string,
  maskedMath: string,
  config: ContentStyleConfig,
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  const knownTerms = new Set(config.knownTerms.map((term) => term.toLocaleLowerCase("en")));
  const knownSymbols = new Set(config.knownSymbols);
  const terms = new Map<string, Occurrence>();
  const symbols = new Map<string, Occurrence>();
  const negatedDefinition =
    /(?:未|没有|并未|尚未|不曾)[^。！？\n]{0,10}(?:定义|记作|记为|称为|表示)/u;
  const definitionWords = /(?:定义|记作|记为|称为|叫作|表示|即|简称|全称|令|设|取|其中)/u;

  const sentenceContext = (value: string, offset: number, length: number): string => {
    const before = value.slice(0, offset);
    const boundary = Math.max(
      before.lastIndexOf("。"),
      before.lastIndexOf("！"),
      before.lastIndexOf("？"),
      before.lastIndexOf("\n"),
    );
    const tail = value.slice(offset + length);
    const nextBoundary = tail.search(/[。！？\n]/u);
    const end = nextBoundary < 0 ? value.length : offset + length + nextBoundary + 1;
    return value.slice(boundary + 1, end);
  };
  const hasDefinitionCue = (value: string): boolean =>
    definitionWords.test(value) && !negatedDefinition.test(value);

  for (const match of maskedProse.matchAll(/\b(?:[A-Z]{2,8}|[A-Z][a-z]+(?:[A-Z][A-Za-z]*)?)\b/g)) {
    const term = match[0];
    if (knownTerms.has(term.toLocaleLowerCase("en"))) continue;
    const context = sentenceContext(maskedProse, match.index, term.length);
    setOccurrence(terms, term, match.index, hasDefinitionCue(context));
  }

  const formulaPattern = /\$\$([\s\S]*?)\$\$|(?<!\\)\$(?!\$)([\s\S]*?)(?<!\\)\$/g;
  for (const match of maskedMath.matchAll(formulaPattern)) {
    const formula = match[1] ?? match[2] ?? "";
    const prefix = maskedMath.slice(Math.max(0, match.index - 48), match.index);
    const allDefinedByContext = hasDefinitionCue(prefix);
    const left = formula.split(/=|\\coloneqq/u, 1)[0] ?? "";
    const leftSymbols = new Set(
      formula.includes("=") || formula.includes("\\coloneqq") ? formulaSymbols(left) : [],
    );
    formulaSymbols(formula).forEach((symbol) => {
      if (knownSymbols.has(symbol)) return;
      setOccurrence(symbols, symbol, match.index, allDefinedByContext || leftSymbols.has(symbol));
    });
  }

  for (const [term, occurrence] of terms) {
    if (occurrence.defined || occurrence.count < config.thresholds.minimumUndefinedTermOccurrences)
      continue;
    findings.push(
      makeFinding(
        document,
        "suspected-undefined-term",
        "advisory",
        occurrence.firstOffset,
        `术语“${term}”出现 ${occurrence.count} 次，但未命中定义/简称语境；需人工确认。`,
        term,
      ),
    );
  }
  for (const [symbol, occurrence] of symbols) {
    if (
      occurrence.defined ||
      occurrence.count < config.thresholds.minimumUndefinedSymbolOccurrences
    )
      continue;
    findings.push(
      makeFinding(
        document,
        "suspected-undefined-symbol",
        "advisory",
        occurrence.firstOffset,
        `符号“${symbol}”出现 ${occurrence.count} 次，但未命中“令/设/左值定义”启发式；需人工确认。`,
        symbol,
      ),
    );
  }
  return findings;
}

function analyzeOne(document: StyleDocument, config: ContentStyleConfig): WorkingFile {
  const masked = narrativeMask(document.body);
  const maskedCode = codeMask(document.body);
  const maskedProse = proseMask(document.body);
  const paragraphs = extractParagraphs(document, masked);
  const sections = extractSections(document, masked);
  const exampleSections = sections.filter((section) =>
    /^(?:例题|示例|完整例子|完整示例)/u.test(section.title),
  ).length;
  const exampleComponents = [...document.body.matchAll(/<Example(?:\s[^>]*)?>/g)].length;
  const metrics: ContentStyleMetrics = {
    hanCharacters: countHan(masked),
    sections: sections.length,
    completeExamples: Math.max(exampleSections, exampleComponents),
    exercises: [...document.body.matchAll(/<Exercise(?:\s[^>]*)?>/g)].length,
    resources: [...document.body.matchAll(/<ResourceCard\s[^>]*\/?\s*>/g)].length,
    visualizations: [...document.body.matchAll(/<InteractiveFigure\s[^>]*\/?\s*>/g)].length,
  };
  const candidates = [
    ...phraseFindings(document, masked, config.aiPhrases),
    ...lexicalStyleFindings(document, masked, config),
    ...genericFramingFindings(document, paragraphs),
    ...sourceMarkerFindings(document, masked),
    ...headingFindings(document, sections, config),
    ...duplicateFindings(document, paragraphs, config),
    ...singleSentenceFindings(document, paragraphs, config),
    ...structuralFindings(document, metrics, sections, config),
    ...visualizationFindings(document, masked, sections, config),
    ...undefinedLanguageFindings(document, maskedProse, maskedCode, config),
  ];
  return {
    document,
    metrics,
    paragraphs,
    sections,
    candidates,
    ignores: parseIgnoreModel(document),
  };
}

function crossDocumentDuplicateFindings(
  files: readonly WorkingFile[],
  config: ContentStyleConfig,
): void {
  const groups = new Map<string, { readonly file: WorkingFile; readonly paragraph: TextBlock }[]>();
  for (const file of files) {
    for (const paragraph of file.paragraphs) {
      if (paragraph.han < config.thresholds.minimumDuplicateParagraphHan) continue;
      groups.set(paragraph.normalized, [
        ...(groups.get(paragraph.normalized) ?? []),
        { file, paragraph },
      ]);
    }
  }
  for (const occurrences of groups.values()) {
    const distinctFiles = new Set(occurrences.map((item) => item.file.document.file));
    if (distinctFiles.size < 2) continue;
    for (const occurrence of occurrences) {
      const peers = [...distinctFiles]
        .filter((file) => file !== occurrence.file.document.file)
        .sort((left, right) => left.localeCompare(right, "en"));
      occurrence.file.candidates.push(
        makeFinding(
          occurrence.file.document,
          "cross-document-duplicate-paragraph",
          "warning",
          occurrence.paragraph.offset,
          `该段与 ${peers.join("、")} 中的段落完全重复。`,
          occurrence.paragraph.normalized,
        ),
      );
    }
  }
}

function crossDocumentHeadingFindings(
  files: readonly WorkingFile[],
  config: ContentStyleConfig,
): void {
  for (let leftIndex = 0; leftIndex < files.length - 1; leftIndex += 1) {
    const leftFile = files[leftIndex];
    if (!leftFile) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < files.length; rightIndex += 1) {
      const rightFile = files[rightIndex];
      if (!rightFile) continue;
      let best:
        | {
            readonly left: SectionBlock;
            readonly right: SectionBlock;
            readonly similarity: number;
          }
        | undefined;
      for (const left of leftFile.sections) {
        const leftComparable = comparableHeading(
          left.title,
          config.thresholds.minimumComparableHeadingCharacters,
        );
        if (!leftComparable) continue;
        for (const right of rightFile.sections) {
          const rightComparable = comparableHeading(
            right.title,
            config.thresholds.minimumComparableHeadingCharacters,
          );
          if (!rightComparable) continue;
          const similarity = characterDiceSimilarity(leftComparable, rightComparable);
          if (
            similarity >= config.thresholds.crossDocumentHeadingSimilarity &&
            (!best || similarity > best.similarity)
          ) {
            best = { left, right, similarity };
          }
        }
      }
      if (!best) continue;
      leftFile.candidates.push(
        makeFinding(
          leftFile.document,
          "cross-document-heading-similarity",
          "advisory",
          best.left.offset,
          `H2“${best.left.title}”与 ${rightFile.document.file} 的“${best.right.title}”高度相似（${best.similarity.toFixed(2)}）；检查是否为跨文模板复用。`,
          `## ${best.left.title}`,
        ),
      );
      rightFile.candidates.push(
        makeFinding(
          rightFile.document,
          "cross-document-heading-similarity",
          "advisory",
          best.right.offset,
          `H2“${best.right.title}”与 ${leftFile.document.file} 的“${best.left.title}”高度相似（${best.similarity.toFixed(2)}）；检查是否为跨文模板复用。`,
          `## ${best.right.title}`,
        ),
      );
    }
  }
}

function sortFindings(findings: readonly ContentStyleFinding[]): ContentStyleFinding[] {
  return [...findings].sort(
    (left, right) =>
      left.location.line - right.location.line ||
      left.location.column - right.location.column ||
      left.ruleId.localeCompare(right.ruleId, "en") ||
      left.fingerprint.localeCompare(right.fingerprint, "en"),
  );
}

export function analyzeStyleDocuments(
  documents: readonly StyleDocument[],
  config: ContentStyleConfig = contentStyleConfig,
  fatalErrors: readonly ContentStyleFatalError[] = [],
  generatedAt = new Date().toISOString(),
): ContentStyleReport {
  const working = [...documents]
    .sort((left, right) => left.file.localeCompare(right.file, "en"))
    .map((document) => analyzeOne(document, config));
  crossDocumentDuplicateFindings(working, config);
  crossDocumentHeadingFindings(working, config);

  let suppressedFindings = 0;
  const files: ContentStyleFileReport[] = working.map((file) => {
    const findings = file.candidates.filter((candidate) => {
      if (locallyIgnored(file.ignores, candidate)) {
        suppressedFindings += 1;
        return false;
      }
      if (config.allowlist.some((entry) => allowlisted(entry, file.document.file, candidate))) {
        suppressedFindings += 1;
        return false;
      }
      return true;
    });
    return {
      file: file.document.file,
      title: file.document.title,
      metrics: file.metrics,
      findings: sortFindings(findings),
    };
  });
  const allFindings = files.flatMap((file) => [...file.findings]);
  const bySeverity: Record<ContentStyleSeverity, number> = { advisory: 0, warning: 0 };
  const byRule: Record<string, number> = Object.fromEntries(
    contentStyleRuleIds.map((ruleId) => [ruleId, 0]),
  );
  allFindings.forEach((finding) => {
    bySeverity[finding.severity] += 1;
    byRule[finding.ruleId] = (byRule[finding.ruleId] ?? 0) + 1;
  });
  const orderedByRule = Object.fromEntries(
    Object.entries(byRule).sort(([left], [right]) => left.localeCompare(right, "en")),
  );

  return {
    schemaVersion: 1,
    generatedAt,
    source: "content/**/*.mdx",
    configuration: {
      thresholds: config.thresholds,
      aiPhrasePatterns: config.aiPhrases.length,
      allowlistEntries: config.allowlist.length,
      localIgnoreSyntax: [
        "<!-- content-style-ignore-next rule-id[,rule-id] -->",
        "<!-- content-style-ignore-start rule-id[,rule-id] --> ... <!-- content-style-ignore-end -->",
        "<!-- content-style-ignore-file rule-id[,rule-id] -->",
      ],
    },
    summary: {
      filesScanned: files.length,
      filesWithFindings: files.filter((file) => file.findings.length > 0).length,
      totalFindings: allFindings.length,
      suppressedFindings,
      fatalErrors: fatalErrors.length,
      bySeverity,
      byRule: orderedByRule,
    },
    files,
    fatalErrors: [...fatalErrors],
  };
}

function markdownEscape(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderMarkdownReport(report: ContentStyleReport): string {
  const lines = [
    "# One Forth Content Style Report",
    "",
    `> Generated at ${report.generatedAt}. Findings are advisory; only parse or I/O failures make the command fail.`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Files scanned | ${report.summary.filesScanned} |`,
    `| Files with findings | ${report.summary.filesWithFindings} |`,
    `| Advisory findings | ${report.summary.bySeverity.advisory} |`,
    `| Warning findings | ${report.summary.bySeverity.warning} |`,
    `| Suppressed findings | ${report.summary.suppressedFindings} |`,
    `| Fatal parse/I/O errors | ${report.summary.fatalErrors} |`,
    `| Total visible findings | ${report.summary.totalFindings} |`,
    "",
    "## Rule totals",
    "",
    "| Rule | Findings |",
    "| --- | ---: |",
    ...Object.entries(report.summary.byRule).map(([rule, count]) => `| \`${rule}\` | ${count} |`),
  ];

  if (report.fatalErrors.length > 0) {
    lines.push("", "## Fatal errors", "");
    report.fatalErrors.forEach((error) =>
      lines.push(`- \`${markdownEscape(error.file)}\`: ${markdownEscape(error.message)}`),
    );
  }

  for (const file of report.files) {
    const metrics = file.metrics;
    lines.push(
      "",
      `## ${file.title}`,
      "",
      `Source: \`${file.file}\``,
      "",
      `Metrics: ${metrics.hanCharacters} Han characters; ${metrics.sections} sections; ${metrics.completeExamples} complete examples; ${metrics.exercises} exercises; ${metrics.resources} resources; ${metrics.visualizations} visualizations.`,
      "",
    );
    if (file.findings.length === 0) {
      lines.push("No findings.");
      continue;
    }
    lines.push(
      "| Severity | Rule | Location | Summary | Fingerprint |",
      "| --- | --- | --- | --- | --- |",
      ...file.findings.map(
        (finding) =>
          `| ${finding.severity} | \`${finding.ruleId}\` | \`${file.file}:${finding.location.line}:${finding.location.column}\` | ${markdownEscape(finding.summary)} | \`${finding.fingerprint}\` |`,
      ),
    );
  }

  lines.push(
    "",
    "## Suppression controls",
    "",
    "Use a report fingerprint in `scripts/content-style.config.ts` for reviewed repository-level exceptions. For a narrow MDX exception, place `content-style-ignore-next`, paired `content-style-ignore-start` / `content-style-ignore-end`, or `content-style-ignore-file` comments around the relevant prose. `*` suppresses all style rules in that scope. Suppressions never hide parser or I/O failures.",
    "",
  );
  return lines.join("\n");
}

function styleDocumentFromLoaded(document: LoadedContentDocument): StyleDocument {
  return {
    file: document.relativePath,
    title: document.frontmatter.title,
    body: document.body,
    bodyStartLine: document.bodyStartLine,
    declaredVisualizations: document.frontmatter.visualizations,
  };
}

async function writeReports(report: ContentStyleReport): Promise<void> {
  await mkdir(reportsDirectory, { recursive: true });
  const writes = await Promise.allSettled([
    writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(markdownReportPath, renderMarkdownReport(report), "utf8"),
  ]);
  const failures = writes.flatMap((result) =>
    result.status === "rejected" ? [errorMessage(result.reason)] : [],
  );
  if (failures.length > 0)
    throw new Error(`Could not write content style reports: ${failures.join("; ")}`);
}

export async function runContentStyleAudit(): Promise<ContentStyleReport> {
  const fatalErrors: ContentStyleFatalError[] = [];
  let documents: StyleDocument[] = [];
  try {
    const loaded = await loadContentDocuments();
    documents = loaded.documents.map(styleDocumentFromLoaded);
    fatalErrors.push(
      ...loaded.diagnostics.map((diagnostic) => ({
        file: diagnostic.file,
        message: diagnostic.message,
      })),
    );
    if (loaded.documents.length === 0)
      fatalErrors.push({
        file: displayPath(resolve(repositoryRoot, "content")),
        message: "No MDX documents were found.",
      });
  } catch (error) {
    fatalErrors.push({ file: "content", message: errorMessage(error) });
  }

  const report = analyzeStyleDocuments(documents, contentStyleConfig, fatalErrors);
  await writeReports(report);
  return report;
}

async function main(): Promise<void> {
  try {
    const report = await runContentStyleAudit();
    console.log(
      `Content style report: ${report.summary.filesScanned} file(s), ${report.summary.totalFindings} advisory finding(s), ${report.summary.suppressedFindings} suppressed.`,
    );
    console.log(`JSON: ${displayPath(jsonReportPath)}`);
    console.log(`Markdown: ${displayPath(markdownReportPath)}`);
    if (exitCodeForReport(report) !== 0) {
      report.fatalErrors.forEach((error) => console.error(`ERROR ${error.file}: ${error.message}`));
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`lint:content-style: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) void main();
