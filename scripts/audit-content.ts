import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { format, resolveConfig } from "prettier";
import {
  conceptCatalog,
  curriculumRepository,
  deriveConceptMaturity,
  equations,
  extractMathFragments,
  learningPaths,
  maskCodeForMath,
  resources,
  symbols,
  type ConceptEntity,
  type MathFragment,
} from "../packages/content/src/index.ts";
import { domainRegistry, subjectRegistry } from "../packages/registry/src/index.ts";
import { visualizationManifest } from "../packages/visualization/src/index.ts";
import {
  displayPath,
  errorMessage,
  loadContentDocuments,
  repositoryRoot,
  type LoadedContentDocument,
} from "./lib/content-files.ts";

export type ContentMaturity = "planned" | "outline" | "draft" | "checked" | "reviewed" | "verified";
export type FindingSeverity = "error" | "warning" | "info";

export interface AuditFinding {
  readonly code: string;
  readonly severity: FindingSeverity;
  readonly path: string;
  readonly evidence: string;
}

export { extractMathFragments, maskCodeForMath, type MathFragment };

interface ReferenceOccurrence {
  readonly id: string;
  readonly line: number;
}

interface MaturityCounts {
  planned: number;
  outline: number;
  draft: number;
  checked: number;
  reviewed: number;
  verified: number;
}

interface BlockCounts {
  definitions: number;
  theorems: number;
  proofs: number;
  examples: number;
  counterExamples: number;
  exercises: number;
  solutions: number;
  misconceptions: number;
}

interface GroupStats {
  readonly id: string;
  readonly label: string;
  concepts: number;
  documents: number;
  hanCharacters: number;
  formulas: number;
  readonly maturity: MaturityCounts;
}

interface OutlineRecord {
  readonly conceptId: string;
  readonly title: string;
  readonly sections: readonly string[];
  readonly signature: string;
  readonly generic: boolean;
}

const outputDirectory = join(repositoryRoot, "reports", "round-5");
const jsonOutputPath = join(outputDirectory, "content-audit.json");
const markdownOutputPath = join(outputDirectory, "content-audit.md");
const semanticTags = [
  "Definition",
  "Theorem",
  "Proof",
  "Example",
  "CounterExample",
  "Exercise",
  "Solution",
  "Misconception",
] as const;
const severityOrder: Readonly<Record<FindingSeverity, number>> = {
  error: 0,
  warning: 1,
  info: 2,
};

function emptyMaturityCounts(): MaturityCounts {
  return { planned: 0, outline: 0, draft: 0, checked: 0, reviewed: 0, verified: 0 };
}

function addMaturity(counts: MaturityCounts, maturity: ContentMaturity): void {
  counts[maturity] += 1;
}

function makeGroupStats(id: string, label: string): GroupStats {
  return {
    id,
    label,
    concepts: 0,
    documents: 0,
    hanCharacters: 0,
    formulas: 0,
    maturity: emptyMaturityCounts(),
  };
}

function lineForOffset(source: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function isEscaped(source: string, offset: number): boolean {
  let slashCount = 0;
  for (let index = offset - 1; index >= 0 && source[index] === "\\"; index -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function countTag(source: string, tag: string): number {
  return [...source.matchAll(new RegExp(`<${tag}(?:\\s|/?>)`, "g"))].length;
}

function countBlocks(source: string): BlockCounts {
  const counts = Object.fromEntries(
    semanticTags.map((tag) => [tag, countTag(source, tag)]),
  ) as Record<(typeof semanticTags)[number], number>;
  return {
    definitions: counts.Definition,
    theorems: counts.Theorem,
    proofs: counts.Proof,
    examples: counts.Example,
    counterExamples: counts.CounterExample,
    exercises: counts.Exercise,
    solutions: counts.Solution,
    misconceptions: counts.Misconception,
  };
}

function addBlocks(target: BlockCounts, source: BlockCounts): void {
  target.definitions += source.definitions;
  target.theorems += source.theorems;
  target.proofs += source.proofs;
  target.examples += source.examples;
  target.counterExamples += source.counterExamples;
  target.exercises += source.exercises;
  target.solutions += source.solutions;
  target.misconceptions += source.misconceptions;
}

function emptyBlockCounts(): BlockCounts {
  return {
    definitions: 0,
    theorems: 0,
    proofs: 0,
    examples: 0,
    counterExamples: 0,
    exercises: 0,
    solutions: 0,
    misconceptions: 0,
  };
}

function extractComponentIds(source: string, component: string): readonly ReferenceOccurrence[] {
  const pattern = new RegExp(`<${component}\\b[^>]*\\bid\\s*=\\s*["']([^"']+)["'][^>]*>`, "g");
  return [...source.matchAll(pattern)].map((match) => ({
    id: match[1] ?? "",
    line: lineForOffset(source, match.index),
  }));
}

function stripNonProse(source: string): string {
  return maskCodeForMath(source)
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$]*\$/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!?(\[[^\]]*\])\([^)]*\)/g, "$1")
    .replace(/[#>*_~|=-]/g, " ");
}

function countHanCharacters(source: string): number {
  return stripNonProse(source).match(/\p{Script=Han}/gu)?.length ?? 0;
}

export function normalizeLatex(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\\displaystyle\b/g, "")
    .replace(/\\begin\{(?:aligned|align\*?|gathered)\}/g, "")
    .replace(/\\end\{(?:aligned|align\*?|gathered)\}/g, "")
    .replace(/\s+/g, "")
    .replace(/[，。；;]+$/g, "");
}

export function inspectLatex(value: string): readonly string[] {
  const issues: string[] = [];
  const control = value.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u);
  if (control) {
    issues.push(
      `contains control character U+${control[0].charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()}`,
    );
  }

  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (isEscaped(value, index)) continue;
    if (value[index] === "{") depth += 1;
    if (value[index] === "}") {
      depth -= 1;
      if (depth < 0) break;
    }
  }
  if (depth !== 0) issues.push("has unbalanced braces");

  const commandNames = [
    "mathbf",
    "boldsymbol",
    "lambda",
    "theta",
    "nabla",
    "partial",
    "operatorname",
    "mathsf",
  ];
  for (const command of commandNames) {
    const lostCommand = new RegExp(`(^|[^\\\\A-Za-z])${command}(?=\\b|\\{)`, "u");
    if (lostCommand.test(value)) issues.push(`looks like \\${command} lost its backslash`);
  }
  return [...new Set(issues)];
}

function controlCharacters(
  source: string,
): readonly { readonly line: number; readonly code: string }[] {
  const matches: { line: number; code: string }[] = [];
  for (const match of source.matchAll(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu)) {
    matches.push({
      line: lineForOffset(source, match.index),
      code: `U+${(match[0]?.charCodeAt(0) ?? 0).toString(16).padStart(4, "0").toUpperCase()}`,
    });
  }
  return matches;
}

function sourceLatexEscapeIssues(
  source: string,
): readonly { readonly line: number; readonly raw: string }[] {
  const issues: { line: number; raw: string }[] = [];
  const literalPattern = /\blatex\s*:\s*"((?:\\.|[^"\\])*)"/gu;
  for (const match of source.matchAll(literalPattern)) {
    const raw = match[1] ?? "";
    for (let index = 0; index < raw.length; index += 1) {
      if (raw[index] !== "\\") continue;
      let end = index;
      while (raw[end] === "\\") end += 1;
      const runLength = end - index;
      const command = /^[A-Za-z]+/.exec(raw.slice(end))?.[0];
      if (command && runLength % 2 === 1) {
        issues.push({ line: lineForOffset(source, match.index), raw });
        break;
      }
      index = end - 1;
    }
  }
  return issues;
}

function maturityForConcept(
  concept: ConceptEntity,
  documents: readonly LoadedContentDocument[],
): ContentMaturity {
  if (documents.length === 0) return concept.maturity;
  const maturity = deriveConceptMaturity(
    documents.map((document) => document.frontmatter.editorialStatus),
    concept.maturity === "outline",
  );
  const requiresHumanReview = maturity === "reviewed" || maturity === "verified";
  const traceable = documents.every(
    (document) =>
      (document.frontmatter.editorialStatus !== "reviewed" &&
        document.frontmatter.editorialStatus !== "verified") ||
      document.frontmatter.review.humanReviewer !== null,
  );
  return requiresHumanReview && !traceable ? "draft" : maturity;
}

function normalizedTitle(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function groupedDuplicates<T>(
  values: readonly T[],
  title: (value: T) => string,
): readonly { readonly title: string; readonly items: readonly T[] }[] {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const key = normalizedTitle(title(value));
    const current = groups.get(key) ?? [];
    current.push(value);
    groups.set(key, current);
  }
  return [...groups.values()]
    .filter((items) => items.length > 1)
    .map((items) => ({ title: title(items[0] as T), items }))
    .sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
}

function replaceTopicNames(value: string, ownTitle: string, allTitles: readonly string[]): string {
  let normalized = value.normalize("NFKC");
  const candidates = [
    ownTitle,
    ...allTitles.filter((title) => title.length >= 3 || /^[A-Za-z]/.test(title)),
  ]
    .filter((title, index, values) => values.indexOf(title) === index)
    .sort((left, right) => right.length - left.length);
  for (const title of candidates) normalized = normalized.replaceAll(title, "<概念>");
  return normalized
    .replace(/「[^」]+」/g, "<概念>")
    .replace(/\b[a-z0-9]+(?:-[a-z0-9]+)+\b/gi, "<概念>")
    .replace(/\d+(?:\.\d+)?/g, "<数值>")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

export function isGenericOutline(sections: readonly string[], title: string): boolean {
  if (sections.length !== 4) return false;
  const normalized = sections.map((section) =>
    replaceTopicNames(section, title, [title]).replaceAll("概念", "主题"),
  );
  const expected = [
    "主题要解决的核心问题与适用边界",
    "主题的基本对象符号和严格定义",
    "主题的典型计算反例与常见误区",
  ];
  const fixedMatches = expected.filter((pattern) => normalized.includes(pattern)).length;
  const derivationMatch = normalized.some(
    (section) =>
      section === "从主题推导主题所需的关键步骤" ||
      section === "主题的最小背景假设与第一个可检验例子",
  );
  return fixedMatches === expected.length && derivationMatch;
}

function outlineSignature(
  sections: readonly string[],
  ownTitle: string,
  allTitles: readonly string[],
): string {
  return sections.map((section) => replaceTopicNames(section, ownTitle, allTitles)).join("\n");
}

function ngrams(value: string, size = 3): ReadonlySet<string> {
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= size) return new Set([compact]);
  const result = new Set<string>();
  for (let index = 0; index <= compact.length - size; index += 1) {
    result.add(compact.slice(index, index + size));
  }
  return result;
}

export function jaccardSimilarity(left: string, right: string): number {
  const leftSet = ngrams(left);
  const rightSet = ngrams(right);
  let intersection = 0;
  for (const item of leftSet) if (rightSet.has(item)) intersection += 1;
  const union = leftSet.size + rightSet.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

function markdownEscape(value: string): string {
  return value.replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

function excerpt(value: string, maximum = 180): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= maximum ? compact : `${compact.slice(0, maximum - 1)}…`;
}

function latexContains(haystack: string, needle: string): boolean {
  if (!needle) return false;
  if (needle.length > 1 || needle.includes("\\")) return haystack.includes(needle);
  const index = haystack.indexOf(needle);
  if (index < 0) return false;
  const before = haystack[index - 1] ?? "";
  const after = haystack[index + 1] ?? "";
  return !/[A-Za-z]/.test(before) && !/[A-Za-z]/.test(after);
}

function finding(
  findings: AuditFinding[],
  code: string,
  severity: FindingSeverity,
  path: string,
  evidence: string,
): void {
  findings.push({ code, severity, path, evidence: excerpt(evidence, 500) });
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && pathToFileURL(resolve(entry ?? "")).href === import.meta.url;
}

async function buildAudit(): Promise<Record<string, unknown>> {
  const findings: AuditFinding[] = [];
  const loaded = await loadContentDocuments();
  for (const diagnostic of loaded.diagnostics) {
    finding(findings, "CONTENT_LOAD_DIAGNOSTIC", "error", diagnostic.file, diagnostic.message);
  }

  const documents = loaded.documents;
  const conceptIds = new Set(conceptCatalog.map((concept) => concept.id));
  const resourceIds = new Set(resources.map((resource) => resource.id));
  const visualizationIds = new Set(visualizationManifest.map((entry) => entry.id));
  const equationIds = new Set(equations.map((equation) => equation.id));
  const symbolIds = new Set(symbols.map((symbol) => symbol.id));
  const pathIds = new Set(learningPaths.map((path) => path.id));
  const documentsByConcept = new Map<string, LoadedContentDocument[]>();
  const documentsByContentId = new Map<string, LoadedContentDocument[]>();
  const documentsByDocumentId = new Map<string, LoadedContentDocument[]>();
  for (const document of documents) {
    const current = documentsByConcept.get(document.frontmatter.conceptId) ?? [];
    current.push(document);
    documentsByConcept.set(document.frontmatter.conceptId, current);
    const contentDocuments = documentsByContentId.get(document.frontmatter.id) ?? [];
    contentDocuments.push(document);
    documentsByContentId.set(document.frontmatter.id, contentDocuments);
    const localizedDocuments = documentsByDocumentId.get(document.documentId) ?? [];
    localizedDocuments.push(document);
    documentsByDocumentId.set(document.documentId, localizedDocuments);
  }

  const maturityByConcept = new Map<string, ContentMaturity>();
  const maturityCounts = emptyMaturityCounts();
  for (const concept of conceptCatalog) {
    const conceptDocuments = [
      ...(documentsByConcept.get(concept.id) ?? []),
      ...concept.documents.flatMap(
        (reference) => documentsByDocumentId.get(reference.documentId) ?? [],
      ),
    ].filter(
      (document, index, boundDocuments) =>
        boundDocuments.findIndex((candidate) => candidate.sourcePath === document.sourcePath) ===
        index,
    );
    const maturity = maturityForConcept(concept, conceptDocuments);
    maturityByConcept.set(concept.id, maturity);
    addMaturity(maturityCounts, maturity);
    const claimsReview =
      concept.maturity === "reviewed" ||
      concept.maturity === "verified" ||
      conceptDocuments.some(
        (document) =>
          document.frontmatter.editorialStatus === "reviewed" ||
          document.frontmatter.editorialStatus === "verified",
      );
    if (claimsReview && maturity !== "reviewed" && maturity !== "verified") {
      finding(
        findings,
        "UNTRACEABLE_REVIEW_STATUS",
        "error",
        `concept:${concept.id}`,
        "The catalog or document claims reviewed/verified status without a traceable human reviewer on every such document; the audit conservatively maps it to draft.",
      );
    }
  }

  const domainStats = new Map<string, GroupStats>();
  const subjectStats = new Map<string, GroupStats>();
  for (const definition of domainRegistry.list()) {
    domainStats.set(definition.id, makeGroupStats(definition.id, definition.title["zh-CN"]));
  }
  for (const definition of subjectRegistry.list()) {
    subjectStats.set(
      `${definition.domainId}/${definition.id}`,
      makeGroupStats(`${definition.domainId}/${definition.id}`, definition.title["zh-CN"]),
    );
  }
  for (const concept of conceptCatalog) {
    const domain = domainStats.get(concept.domain);
    const subject = subjectStats.get(`${concept.domain}/${concept.subject}`);
    const maturity = maturityByConcept.get(concept.id) ?? "planned";
    if (!domain) {
      finding(
        findings,
        "UNREGISTERED_CONCEPT_DOMAIN",
        "error",
        `concept:${concept.id}`,
        `Domain ${concept.domain} is not registered.`,
      );
    } else {
      domain.concepts += 1;
      addMaturity(domain.maturity, maturity);
    }
    if (!subject) {
      finding(
        findings,
        "UNREGISTERED_CONCEPT_SUBJECT",
        "error",
        `concept:${concept.id}`,
        `Subject ${concept.domain}/${concept.subject} is not registered.`,
      );
    } else {
      subject.concepts += 1;
      addMaturity(subject.maturity, maturity);
    }
  }

  const normalizedRegisteredEquations = new Map(
    equations.map((equation) => [normalizeLatex(equation.latex), equation.id] as const),
  );
  const referencedEquationIds = new Set<string>();
  const referencedVisualizationIds = new Set<string>();
  const referencedResourceIds = new Set<string>();
  const documentSymbolCorpus: string[] = [];
  const documentRecords: Record<string, unknown>[] = [];
  const unregisteredDisplayEquations: Record<string, unknown>[] = [];
  const totalBlocks = emptyBlockCounts();
  let totalHanCharacters = 0;
  let totalInlineFormulas = 0;
  let totalDisplayFormulas = 0;
  let totalEquationReferences = 0;
  let totalConceptLinks = 0;
  let totalResourceCards = 0;
  let totalInteractiveFigures = 0;
  let registeredDisplayFormulaUses = 0;
  let duplicateLearningObjectiveSections = 0;

  for (const document of documents) {
    const path = document.relativePath;
    const source = await readFile(document.sourcePath, "utf8");
    for (const control of controlCharacters(source)) {
      finding(
        findings,
        "CONTENT_CONTROL_CHARACTER",
        "error",
        `${path}:${control.line}`,
        `Source contains ${control.code}.`,
      );
    }

    const fragments = extractMathFragments(document.body);
    documentSymbolCorpus.push(...fragments.filter((item) => item.closed).map((item) => item.latex));
    const inline = fragments.filter((fragment) => fragment.kind === "inline");
    const display = fragments.filter((fragment) => fragment.kind === "display");
    const equationReferences = extractComponentIds(document.body, "Equation");
    const conceptLinks = extractComponentIds(document.body, "ConceptLink");
    const resourceCards = extractComponentIds(document.body, "ResourceCard");
    const figures = extractComponentIds(document.body, "InteractiveFigure");
    const blocks = countBlocks(document.body);
    const hanCharacters = countHanCharacters(document.body);
    const duplicateObjectiveHeading = /^##\s+学习目标(?:\s|与|$).*$/mu.exec(document.body);
    if (duplicateObjectiveHeading) {
      duplicateLearningObjectiveSections += 1;
      finding(
        findings,
        "DUPLICATE_LEARNING_OBJECTIVES_SECTION",
        "warning",
        `${path}:${document.bodyStartLine + lineForOffset(document.body, duplicateObjectiveHeading.index) - 1}`,
        "The document already declares frontmatter.learningObjectives; expand a distinct capability section or remove this repeated 学习目标 heading.",
      );
    }
    addBlocks(totalBlocks, blocks);
    totalHanCharacters += hanCharacters;
    totalInlineFormulas += inline.length;
    totalDisplayFormulas += display.length;
    totalEquationReferences += equationReferences.length;
    totalConceptLinks += conceptLinks.length;
    totalResourceCards += resourceCards.length;
    totalInteractiveFigures += figures.length;

    const domain = domainStats.get(document.frontmatter.domain);
    const subject = subjectStats.get(
      `${document.frontmatter.domain}/${document.frontmatter.subject}`,
    );
    const formulaCount = inline.length + display.length + equationReferences.length;
    if (domain) {
      domain.documents += 1;
      domain.hanCharacters += hanCharacters;
      domain.formulas += formulaCount;
    }
    if (subject) {
      subject.documents += 1;
      subject.hanCharacters += hanCharacters;
      subject.formulas += formulaCount;
    }

    const unmatchedForDocument: Record<string, unknown>[] = [];
    for (const fragment of fragments) {
      const absoluteLine = document.bodyStartLine + fragment.line - 1;
      if (!fragment.closed) {
        finding(
          findings,
          "UNCLOSED_MATH_DELIMITER",
          "error",
          `${path}:${absoluteLine}`,
          `${fragment.kind} math delimiter has no closing delimiter: ${excerpt(fragment.latex)}`,
        );
        continue;
      }
      for (const issue of inspectLatex(fragment.latex)) {
        finding(
          findings,
          "BAD_CONTENT_LATEX",
          "error",
          `${path}:${absoluteLine}`,
          `${issue}: ${excerpt(fragment.latex)}`,
        );
      }
      if (fragment.kind === "display") {
        const registeredId = normalizedRegisteredEquations.get(normalizeLatex(fragment.latex));
        if (registeredId) {
          registeredDisplayFormulaUses += 1;
          referencedEquationIds.add(registeredId);
        } else {
          const record = {
            path,
            line: absoluteLine,
            latex: excerpt(fragment.latex, 240),
          };
          unmatchedForDocument.push(record);
          unregisteredDisplayEquations.push(record);
        }
      }
    }
    if (unmatchedForDocument.length > 0) {
      finding(
        findings,
        "UNREGISTERED_DISPLAY_EQUATIONS",
        "warning",
        path,
        `${unmatchedForDocument.length} of ${display.length} display-math instances do not exactly match a registered EquationRecord; see JSON unregisteredDisplayEquations for line-level evidence.`,
      );
    }

    const unresolvedConceptLinks: ReferenceOccurrence[] = [];
    for (const reference of conceptLinks) {
      if (!conceptIds.has(reference.id)) {
        unresolvedConceptLinks.push(reference);
        finding(
          findings,
          "UNRESOLVED_CONCEPT_LINK",
          "error",
          `${path}:${document.bodyStartLine + reference.line - 1}`,
          `ConceptLink targets unknown concept ${reference.id}.`,
        );
      }
    }
    const unresolvedResources: ReferenceOccurrence[] = [];
    for (const id of document.frontmatter.resources) referencedResourceIds.add(id);
    for (const reference of resourceCards) referencedResourceIds.add(reference.id);
    for (const reference of resourceCards) {
      if (!resourceIds.has(reference.id)) {
        unresolvedResources.push(reference);
        finding(
          findings,
          "UNRESOLVED_RESOURCE_REFERENCE",
          "error",
          `${path}:${document.bodyStartLine + reference.line - 1}`,
          `ResourceCard targets unknown resource ${reference.id}.`,
        );
      }
    }
    for (const id of document.frontmatter.resources) {
      if (!resourceIds.has(id)) {
        finding(
          findings,
          "UNRESOLVED_RESOURCE_REFERENCE",
          "error",
          path,
          `frontmatter.resources contains unknown resource ${id}.`,
        );
      }
    }

    const unresolvedFigures: ReferenceOccurrence[] = [];
    for (const id of document.frontmatter.visualizations) referencedVisualizationIds.add(id);
    for (const reference of figures) referencedVisualizationIds.add(reference.id);
    for (const reference of figures) {
      if (!visualizationIds.has(reference.id)) {
        unresolvedFigures.push(reference);
        finding(
          findings,
          "UNRESOLVED_VISUALIZATION_REFERENCE",
          "error",
          `${path}:${document.bodyStartLine + reference.line - 1}`,
          `InteractiveFigure targets unknown visualization ${reference.id}.`,
        );
      }
    }
    for (const id of document.frontmatter.visualizations) {
      if (!visualizationIds.has(id)) {
        finding(
          findings,
          "UNRESOLVED_VISUALIZATION_REFERENCE",
          "error",
          path,
          `frontmatter.visualizations contains unknown visualization ${id}.`,
        );
      }
    }

    const unresolvedEquations: ReferenceOccurrence[] = [];
    for (const reference of equationReferences) {
      if (equationIds.has(reference.id)) {
        referencedEquationIds.add(reference.id);
      } else {
        unresolvedEquations.push(reference);
        finding(
          findings,
          "UNRESOLVED_EQUATION_REFERENCE",
          "error",
          `${path}:${document.bodyStartLine + reference.line - 1}`,
          `Equation targets unknown equation record ${reference.id}.`,
        );
      }
    }

    if (document.body.trim().length === 0) {
      finding(findings, "MISSING_DOCUMENT_BODY", "error", path, "The MDX body is empty.");
    }

    documentRecords.push({
      path,
      documentId: document.documentId,
      conceptId: document.frontmatter.conceptId,
      locale: document.locale,
      title: document.frontmatter.title,
      domain: document.frontmatter.domain,
      subject: document.frontmatter.subject,
      maturity: maturityByConcept.get(document.frontmatter.conceptId) ?? "draft",
      repeatsLearningObjectivesHeading: Boolean(duplicateObjectiveHeading),
      hanCharacters,
      formulas: {
        inline: inline.length,
        display: display.length,
        semanticEquationReferences: equationReferences.length,
        total: formulaCount,
        unregisteredDisplay: unmatchedForDocument.length,
      },
      blocks,
      references: {
        conceptLinks: conceptLinks.length,
        resourceCards: resourceCards.length,
        declaredResources: document.frontmatter.resources.length,
        interactiveFigures: figures.length,
        declaredVisualizations: document.frontmatter.visualizations.length,
      },
      unresolved: {
        conceptLinks: unresolvedConceptLinks.map((item) => item.id),
        resources: unresolvedResources.map((item) => item.id),
        visualizations: unresolvedFigures.map((item) => item.id),
        equations: unresolvedEquations.map((item) => item.id),
      },
    });
  }

  for (const concept of conceptCatalog) {
    for (const prerequisite of concept.prerequisites) {
      if (!conceptIds.has(prerequisite)) {
        finding(
          findings,
          "UNRESOLVED_RELATION_ENDPOINT",
          "error",
          `concept:${concept.id}`,
          `prerequisite targets unknown concept ${prerequisite}.`,
        );
      }
    }
    for (const followUp of concept.followUps) {
      if (!conceptIds.has(followUp)) {
        finding(
          findings,
          "UNRESOLVED_RELATION_ENDPOINT",
          "error",
          `concept:${concept.id}`,
          `followUps targets unknown concept ${followUp}.`,
        );
      }
    }
    for (const relation of concept.relations) {
      if (!conceptIds.has(relation.from) || !conceptIds.has(relation.to)) {
        finding(
          findings,
          "UNRESOLVED_RELATION_ENDPOINT",
          "error",
          `concept:${concept.id}`,
          `${relation.type} relation ${relation.from} -> ${relation.to} has an unknown endpoint.`,
        );
      }
    }
    const mappedDocuments = documentsByConcept.get(concept.id) ?? [];
    for (const reference of concept.documents) {
      const exists = documents.some((document) => document.documentId === reference.documentId);
      if (!exists) {
        finding(
          findings,
          "MISSING_CATALOG_DOCUMENT",
          "error",
          `concept:${concept.id}`,
          `Catalog maps ${reference.locale} to missing document ${reference.documentId}.`,
        );
      }
    }
    if (mappedDocuments.length > 0 && concept.documents.length === 0) {
      finding(
        findings,
        "MISSING_DOCUMENT_CATALOG_MAPPING",
        "error",
        `concept:${concept.id}`,
        `${mappedDocuments.length} document(s) map to this concept but concept.documents is empty.`,
      );
    }
  }
  for (const document of documents) {
    if (!conceptIds.has(document.frontmatter.conceptId)) {
      finding(
        findings,
        "UNRESOLVED_DOCUMENT_CONCEPT",
        "error",
        document.relativePath,
        `Document maps to unknown concept ${document.frontmatter.conceptId}.`,
      );
    }
    for (const prerequisite of document.frontmatter.prerequisites) {
      if (!conceptIds.has(prerequisite)) {
        finding(
          findings,
          "UNRESOLVED_RELATION_ENDPOINT",
          "error",
          document.relativePath,
          `frontmatter prerequisite targets unknown concept ${prerequisite}.`,
        );
      }
    }
    for (const relation of document.frontmatter.relations) {
      if (!conceptIds.has(relation.target)) {
        finding(
          findings,
          "UNRESOLVED_RELATION_ENDPOINT",
          "error",
          document.relativePath,
          `frontmatter ${relation.type} relation targets unknown concept ${relation.target}.`,
        );
      }
    }
  }

  const invalidResourceLinks: Record<string, unknown>[] = [];
  for (const resource of resources) {
    const entries = Object.entries(resource.links);
    if (entries.length === 0) {
      const evidence = `Resource ${resource.id} has no source URL.`;
      invalidResourceLinks.push({
        resourceId: resource.id,
        field: "links",
        value: "",
        reason: evidence,
      });
      finding(findings, "INVALID_RESOURCE_LINK", "error", `resource:${resource.id}`, evidence);
    }
    for (const [field, value] of entries) {
      let reason: string | undefined;
      try {
        const parsed = new URL(value);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          reason = `unsupported protocol ${parsed.protocol}`;
        }
      } catch {
        reason = "not a valid absolute URL";
      }
      if (reason) {
        invalidResourceLinks.push({ resourceId: resource.id, field, value, reason });
        finding(
          findings,
          "INVALID_RESOURCE_LINK",
          "error",
          `resource:${resource.id}`,
          `${field}=${JSON.stringify(value)} is ${reason}.`,
        );
      }
    }
    for (const topic of resource.topics) {
      if (!conceptIds.has(topic)) {
        finding(
          findings,
          "UNRESOLVED_RESOURCE_TOPIC",
          "error",
          `resource:${resource.id}`,
          `topics contains unknown concept ${topic}.`,
        );
      }
    }
  }

  const registrySourcePath = join(repositoryRoot, "packages", "content", "src", "index.ts");
  const registrySource = await readFile(registrySourcePath, "utf8");
  for (const issue of sourceLatexEscapeIssues(registrySource)) {
    finding(
      findings,
      "LATEX_SOURCE_ESCAPE",
      "error",
      `packages/content/src/index.ts:${issue.line}`,
      `LaTeX string literal contains an odd source backslash run and will lose or reinterpret the command at runtime: ${issue.raw}`,
    );
  }
  for (const symbol of symbols) {
    for (const issue of inspectLatex(symbol.latex)) {
      finding(
        findings,
        "BAD_REGISTERED_SYMBOL_LATEX",
        "error",
        `symbol:${symbol.id}`,
        `${issue}: ${JSON.stringify(symbol.latex)}`,
      );
    }
  }
  for (const equation of equations) {
    for (const issue of inspectLatex(equation.latex)) {
      finding(
        findings,
        "BAD_REGISTERED_EQUATION_LATEX",
        "error",
        `equation:${equation.id}`,
        `${issue}: ${JSON.stringify(equation.latex)}`,
      );
    }
    for (const variable of equation.variables) {
      if (!symbolIds.has(variable.symbolId)) {
        finding(
          findings,
          "UNRESOLVED_EQUATION_SYMBOL",
          "error",
          `equation:${equation.id}`,
          `variables references unknown symbol ${variable.symbolId}.`,
        );
      }
    }
    for (const topic of equation.relatedTopics) {
      if (!conceptIds.has(topic)) {
        finding(
          findings,
          "UNRESOLVED_EQUATION_TOPIC",
          "error",
          `equation:${equation.id}`,
          `relatedTopics contains unknown concept ${topic}.`,
        );
      }
    }
  }

  const semanticallyUsedSymbolIds = new Set(
    equations.flatMap((equation) => equation.variables.map((variable) => variable.symbolId)),
  );
  const normalizedCorpus = documentSymbolCorpus.map(normalizeLatex);
  const symbolUsage = symbols.map((symbol) => {
    const normalized = normalizeLatex(symbol.latex);
    const usedInDocuments = normalizedCorpus.some((formula) => latexContains(formula, normalized));
    const usedByRegisteredEquation = semanticallyUsedSymbolIds.has(symbol.id);
    const used = usedInDocuments || usedByRegisteredEquation;
    if (!used) {
      finding(
        findings,
        "UNUSED_REGISTERED_SYMBOL",
        "warning",
        `symbol:${symbol.id}`,
        "The symbol is not referenced by EquationRecord.variables and its normalized LaTeX was not found in document math.",
      );
    }
    return {
      id: symbol.id,
      latex: symbol.latex,
      namespace: symbol.namespace,
      used,
      usedInDocuments,
      usedByRegisteredEquation,
    };
  });

  const conceptTitleDuplicates = groupedDuplicates(conceptCatalog, (concept) =>
    concept.title["zh-CN"].trim(),
  );
  const documentTitleDuplicates = groupedDuplicates(documents, (document) =>
    document.frontmatter.title.trim(),
  );
  for (const duplicate of conceptTitleDuplicates) {
    finding(
      findings,
      "DUPLICATE_CONCEPT_TITLE",
      "warning",
      "packages/content/src/concepts.ts",
      `${JSON.stringify(duplicate.title)} is shared by ${duplicate.items.map((item) => item.id).join(", ")}.`,
    );
  }
  for (const duplicate of documentTitleDuplicates) {
    finding(
      findings,
      "DUPLICATE_DOCUMENT_TITLE",
      "warning",
      "content",
      `${JSON.stringify(duplicate.title)} is shared by ${duplicate.items.map((item) => item.relativePath).join(", ")}.`,
    );
  }

  const allTitles = conceptCatalog.flatMap((concept) => Object.values(concept.title));
  const outlineRecords: OutlineRecord[] = conceptCatalog.map((concept) => {
    const sections = concept.outline.map((section) => section["zh-CN"].trim());
    const title = concept.title["zh-CN"];
    return {
      conceptId: concept.id,
      title,
      sections,
      signature: outlineSignature(sections, title, allTitles),
      generic: isGenericOutline(sections, title),
    };
  });
  const signatureGroups = new Map<string, OutlineRecord[]>();
  for (const record of outlineRecords) {
    const current = signatureGroups.get(record.signature) ?? [];
    current.push(record);
    signatureGroups.set(record.signature, current);
  }
  const exactOutlineGroups = [...signatureGroups.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([signature, records]) => ({
      signature,
      conceptIds: records
        .map((record) => record.conceptId)
        .sort((a, b) => a.localeCompare(b, "en")),
      generic: records.every((record) => record.generic),
    }))
    .sort(
      (left, right) =>
        right.conceptIds.length - left.conceptIds.length ||
        left.conceptIds[0]?.localeCompare(right.conceptIds[0] ?? "", "en") ||
        0,
    );
  const genericConceptIds = outlineRecords
    .filter((record) => record.generic)
    .map((record) => record.conceptId)
    .sort((left, right) => left.localeCompare(right, "en"));
  if (genericConceptIds.length > 0) {
    finding(
      findings,
      "GENERIC_OUTLINE_TEMPLATE",
      "warning",
      "packages/content/src/concepts.ts",
      `${genericConceptIds.length} concepts use the known four-section generic template. First IDs: ${genericConceptIds.slice(0, 20).join(", ")}${genericConceptIds.length > 20 ? ", …" : ""}`,
    );
  }

  const uniqueOutlineGroups = [...signatureGroups.entries()].map(([signature, records]) => ({
    signature,
    conceptIds: records.map((record) => record.conceptId).sort((a, b) => a.localeCompare(b, "en")),
  }));
  const highlySimilarOutlines: Record<string, unknown>[] = [];
  for (let leftIndex = 0; leftIndex < uniqueOutlineGroups.length; leftIndex += 1) {
    const left = uniqueOutlineGroups[leftIndex];
    if (!left) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < uniqueOutlineGroups.length; rightIndex += 1) {
      const right = uniqueOutlineGroups[rightIndex];
      if (!right) continue;
      const similarity = jaccardSimilarity(left.signature, right.signature);
      if (similarity < 0.86) continue;
      const record = {
        similarity: Number(similarity.toFixed(4)),
        leftConceptIds: left.conceptIds,
        rightConceptIds: right.conceptIds,
      };
      highlySimilarOutlines.push(record);
      finding(
        findings,
        "HIGHLY_SIMILAR_OUTLINES",
        "warning",
        "packages/content/src/concepts.ts",
        `Normalized outline similarity ${similarity.toFixed(3)} between [${left.conceptIds.join(", ")}] and [${right.conceptIds.join(", ")}].`,
      );
    }
  }
  highlySimilarOutlines.sort((left, right) => Number(right.similarity) - Number(left.similarity));

  const pathRecords: Record<string, unknown>[] = [];
  const missingPathBodyChapters = new Set<string>();
  let missingPathBodyOccurrences = 0;
  let brokenPathLinks = 0;
  for (const path of learningPaths) {
    const missingBodies: string[] = [];
    const unknownNodes: string[] = [];
    const outOfOrderPrerequisites: Record<string, string>[] = [];
    const seen = new Set(path.prerequisiteChapterIds);
    for (const chapterId of path.chapterIds) {
      const chapter = curriculumRepository.getChapter(chapterId);
      if (!chapter) {
        unknownNodes.push(chapterId);
        brokenPathLinks += 1;
        finding(
          findings,
          "BROKEN_PATH_NODE",
          "error",
          `learning-path:${path.id}`,
          `Path references unknown canonical chapter ${chapterId}.`,
        );
        continue;
      }
      if (
        !chapter.contentId ||
        !(documentsByContentId.get(chapter.contentId) ?? []).some(
          (document) => document.locale === "zh-CN",
        )
      ) {
        missingBodies.push(chapterId);
        missingPathBodyChapters.add(chapterId);
        missingPathBodyOccurrences += 1;
      }
      for (const prerequisite of chapter.prerequisiteChapterIds) {
        if (!seen.has(prerequisite)) {
          outOfOrderPrerequisites.push({ chapterId, prerequisite });
          brokenPathLinks += 1;
          finding(
            findings,
            "BROKEN_PATH_PREREQUISITE_CHAIN",
            "error",
            `learning-path:${path.id}`,
            `${chapterId} requires ${prerequisite}, which is neither earlier in the path nor declared as an external prerequisite.`,
          );
        }
      }
      seen.add(chapterId);
    }
    if (missingBodies.length > 0) {
      finding(
        findings,
        "PATH_NODE_MISSING_BODY",
        "warning",
        `learning-path:${path.id}`,
        `${missingBodies.length} of ${path.chapterIds.length} canonical chapters have no zh-CN MDX body: ${missingBodies.join(", ")}.`,
      );
    }
    const brokenCheckpoints = path.checkpoints
      .filter((checkpoint) => !path.chapterIds.includes(checkpoint.afterChapterId))
      .map((checkpoint) => checkpoint.id);
    const brokenExercises = path.exercises
      .filter((exercise) =>
        exercise.chapterIds.some((chapterId) => !path.chapterIds.includes(chapterId)),
      )
      .map((exercise) => exercise.id);
    if (brokenCheckpoints.length > 0) {
      brokenPathLinks += brokenCheckpoints.length;
      finding(
        findings,
        "BROKEN_PATH_CHECKPOINT",
        "error",
        `learning-path:${path.id}`,
        `Checkpoints do not attach to path nodes: ${brokenCheckpoints.join(", ")}.`,
      );
    }
    if (brokenExercises.length > 0) {
      brokenPathLinks += brokenExercises.length;
      finding(
        findings,
        "BROKEN_PATH_EXERCISE",
        "error",
        `learning-path:${path.id}`,
        `Exercises reference concepts outside the path: ${brokenExercises.join(", ")}.`,
      );
    }
    const brokenNextPath = Boolean(path.nextPath && !pathIds.has(path.nextPath));
    if (brokenNextPath) {
      brokenPathLinks += 1;
      finding(
        findings,
        "BROKEN_NEXT_PATH",
        "error",
        `learning-path:${path.id}`,
        `nextPath targets unknown path ${path.nextPath}.`,
      );
    }
    pathRecords.push({
      id: path.id,
      title: path.title["zh-CN"],
      nodes: path.chapterIds.length,
      missingBodies,
      unknownNodes,
      outOfOrderPrerequisites,
      brokenCheckpoints,
      brokenExercises,
      brokenNextPath,
    });
  }

  const unresolvedRelationFindings = findings.filter((item) =>
    [
      "UNRESOLVED_RELATION_ENDPOINT",
      "UNRESOLVED_CONCEPT_LINK",
      "UNRESOLVED_DOCUMENT_CONCEPT",
      "UNRESOLVED_RESOURCE_TOPIC",
      "UNRESOLVED_EQUATION_TOPIC",
    ].includes(item.code),
  );
  const unresolvedReferenceFindings = findings.filter((item) =>
    [
      "UNRESOLVED_RESOURCE_REFERENCE",
      "UNRESOLVED_VISUALIZATION_REFERENCE",
      "UNRESOLVED_EQUATION_REFERENCE",
      "UNRESOLVED_EQUATION_SYMBOL",
    ].includes(item.code),
  );

  findings.sort(
    (left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] ||
      left.code.localeCompare(right.code, "en") ||
      left.path.localeCompare(right.path, "en") ||
      left.evidence.localeCompare(right.evidence, "en"),
  );
  const findingsBySeverity = {
    error: findings.filter((item) => item.severity === "error").length,
    warning: findings.filter((item) => item.severity === "warning").length,
    info: findings.filter((item) => item.severity === "info").length,
  };

  const concepts = conceptCatalog.map((concept) => ({
    id: concept.id,
    title: concept.title["zh-CN"],
    domain: concept.domain,
    subject: concept.subject,
    maturity: maturityByConcept.get(concept.id) ?? "planned",
    catalogMaturity: concept.maturity,
    legacyArticleStatusProjection: concept.articleStatus,
    legacyReadinessProjection: concept.readiness,
    outlineSections: concept.outline.length,
    genericOutline:
      outlineRecords.find((record) => record.conceptId === concept.id)?.generic ?? false,
    documents: (documentsByConcept.get(concept.id) ?? []).map((document) => document.relativePath),
  }));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: loaded.diagnostics.length === 0 ? "completed" : "completed-with-load-errors",
    source: {
      contentRoot: "content",
      conceptCatalog: "packages/content/src/concepts.ts",
      learningPaths: "packages/content/src/learning-paths.ts",
      registries: [
        "packages/content/src/index.ts",
        "packages/registry/src/index.ts",
        "packages/visualization/src/index.ts",
      ],
    },
    methodology: {
      maturity:
        "Uses the native planned/outline/draft/reviewed/verified model. Concept maturity is the least-mature localized document status, or the catalog status when no document exists. Reviewed/verified claims require a traceable humanReviewer and are conservatively reported as draft otherwise.",
      hanCharacters:
        "Unicode Script=Han characters in the MDX body after removing fenced/inline code, math delimiters and JSX/Markdown syntax.",
      formulas:
        "Counts closed inline $...$, display $$...$$ and semantic <Equation> references. Registration coverage applies only to display math (normalized exact LaTeX match) and <Equation id> references; inline expressions are not treated as registry candidates.",
      semanticBlocks:
        "Counts explicit MDX semantic component opening tags; headings containing words such as definition or example are not inferred as blocks.",
      outlineSimilarity:
        "Concept titles, quoted topic names, kebab-case IDs, punctuation and whitespace are normalized; exact signatures are grouped and distinct signatures with character-trigram Jaccard similarity >= 0.86 are reported.",
      resourceLinks:
        "Checks resource IDs, absolute URL syntax and http(s) protocol. External HTTP reachability is intentionally not checked by this content audit.",
      unusedSymbols:
        "A symbol is used when referenced by EquationRecord.variables or when its normalized LaTeX occurs in document math.",
    },
    summary: {
      concepts: conceptCatalog.length,
      documents: documents.length,
      maturity: maturityCounts,
      domains: domainStats.size,
      subjects: subjectStats.size,
      hanCharacters: totalHanCharacters,
      formulas: {
        inline: totalInlineFormulas,
        display: totalDisplayFormulas,
        semanticEquationReferences: totalEquationReferences,
        total: totalInlineFormulas + totalDisplayFormulas + totalEquationReferences,
        registeredDisplayUses: registeredDisplayFormulaUses,
        unregisteredDisplay: unregisteredDisplayEquations.length,
      },
      registeredSymbols: symbols.length,
      unusedRegisteredSymbols: symbolUsage.filter((item) => !item.used).length,
      registeredEquations: equations.length,
      usedRegisteredEquations: referencedEquationIds.size,
      semanticBlocks: totalBlocks,
      references: {
        conceptLinks: totalConceptLinks,
        resourceCards: totalResourceCards,
        registeredResources: resources.length,
        uniqueReferencedResources: referencedResourceIds.size,
      },
      interactiveFigures: {
        references: totalInteractiveFigures,
        registered: visualizationManifest.length,
        uniqueReferenced: referencedVisualizationIds.size,
      },
      unresolvedInternalRelations: unresolvedRelationFindings.length,
      unresolvedRegistryReferences: unresolvedReferenceFindings.length,
      invalidResourceLinks: invalidResourceLinks.length,
      duplicateConceptTitles: conceptTitleDuplicates.length,
      duplicateDocumentTitles: documentTitleDuplicates.length,
      duplicateLearningObjectiveSections,
      genericOutlines: genericConceptIds.length,
      exactDuplicateOutlineGroups: exactOutlineGroups.length,
      highlySimilarOutlinePairs: highlySimilarOutlines.length,
      pathNodesMissingBodies: missingPathBodyChapters.size,
      pathNodeOccurrencesMissingBodies: missingPathBodyOccurrences,
      brokenPathLinks,
      findings: findingsBySeverity,
    },
    domains: [...domainStats.values()].sort((left, right) => left.id.localeCompare(right.id, "en")),
    subjects: [...subjectStats.values()].sort((left, right) =>
      left.id.localeCompare(right.id, "en"),
    ),
    concepts,
    documents: documentRecords,
    symbols: symbolUsage,
    equations: equations.map((equation) => ({
      id: equation.id,
      latex: equation.latex,
      referenced: referencedEquationIds.has(equation.id),
    })),
    invalidResourceLinks,
    unregisteredDisplayEquations,
    duplicateTitles: {
      concepts: conceptTitleDuplicates.map((group) => ({
        title: group.title,
        conceptIds: group.items.map((item) => item.id),
      })),
      documents: documentTitleDuplicates.map((group) => ({
        title: group.title,
        paths: group.items.map((item) => item.relativePath),
      })),
    },
    outlineQuality: {
      genericConceptIds,
      exactGroups: exactOutlineGroups,
      highlySimilar: highlySimilarOutlines,
    },
    learningPaths: pathRecords,
    findings,
  };
}

function markdownReport(report: Record<string, unknown>): string {
  const summary = report.summary as Record<string, unknown>;
  const maturity = summary.maturity as MaturityCounts;
  const formulas = summary.formulas as Record<string, number>;
  const blocks = summary.semanticBlocks as BlockCounts;
  const references = summary.references as Record<string, number>;
  const figures = summary.interactiveFigures as Record<string, number>;
  const findings = report.findings as readonly AuditFinding[];
  const domainRows = report.domains as readonly GroupStats[];
  const subjectRows = report.subjects as readonly GroupStats[];
  const documents = report.documents as readonly Record<string, unknown>[];
  const outlineQuality = report.outlineQuality as {
    readonly genericConceptIds: readonly string[];
    readonly exactGroups: readonly {
      readonly conceptIds: readonly string[];
      readonly generic: boolean;
    }[];
    readonly highlySimilar: readonly Record<string, unknown>[];
  };
  const paths = report.learningPaths as readonly Record<string, unknown>[];
  const generatedAt = String(report.generatedAt);
  const lines: string[] = [
    "# One Forth 第五轮内容审计",
    "",
    `生成时间：${generatedAt}`,
    "",
    "> 本报告由 `tsx scripts/audit-content.ts` 从实际 MDX、概念目录、学习路径和注册表重建。外部 HTTP 可达性不在本脚本范围内；这里的无效资源链接指未知资源 ID、非法绝对 URL 或非 HTTP(S) 协议。",
    "",
    "## 总览",
    "",
    "| 指标 | 数量 |",
    "| --- | ---: |",
    `| 概念 | ${summary.concepts} |`,
    `| MDX 正文 | ${summary.documents} |`,
    `| 正文汉字 | ${summary.hanCharacters} |`,
    `| 公式实例（行内 + 展示 + Equation 引用） | ${formulas.total} |`,
    `| 已注册符号 / 未使用符号 | ${summary.registeredSymbols} / ${summary.unusedRegisteredSymbols} |`,
    `| 已注册公式 / 被正文使用 | ${summary.registeredEquations} / ${summary.usedRegisteredEquations} |`,
    `| 资源引用 / 注册资源 | ${references.resourceCards} / ${references.registeredResources} |`,
    `| 交互实验引用 / 注册实验 | ${figures.references} / ${figures.registered} |`,
    `| 未解析内部关系 | ${summary.unresolvedInternalRelations} |`,
    `| 无效资源链接 | ${summary.invalidResourceLinks} |`,
    `| 重复“学习目标”正文标题 | ${summary.duplicateLearningObjectiveSections} |`,
    `| 路径中缺正文的节点出现次数 / 唯一概念 | ${summary.pathNodeOccurrencesMissingBodies} / ${summary.pathNodesMissingBodies} |`,
    `| 学习路径断链 | ${summary.brokenPathLinks} |`,
    "",
    "## 五态成熟度",
    "",
    "| planned | outline | draft | checked | reviewed | verified |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    `| ${maturity.planned} | ${maturity.outline} | ${maturity.draft} | ${maturity.checked} | ${maturity.reviewed} | ${maturity.verified} |`,
    "",
    "映射规则：使用原生 `planned / outline / draft / reviewed / verified` 五态。存在多语言正文时取最低成熟度；没有正文时使用目录成熟度。任何 `reviewed` 或 `verified` 声明都必须具有可追溯的 `humanReviewer`，否则审计按 `draft` 保守报告。",
    "",
    "## 学科分布",
    "",
    "### Domain",
    "",
    "| Domain | 名称 | 概念 | 正文 | planned | outline | draft | checked | reviewed | verified | 汉字 | 公式 |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...domainRows.map(
      (row) =>
        `| ${row.id} | ${markdownEscape(row.label)} | ${row.concepts} | ${row.documents} | ${row.maturity.planned} | ${row.maturity.outline} | ${row.maturity.draft} | ${row.maturity.checked} | ${row.maturity.reviewed} | ${row.maturity.verified} | ${row.hanCharacters} | ${row.formulas} |`,
    ),
    "",
    "### Subject",
    "",
    "| Subject | 名称 | 概念 | 正文 | planned | outline | draft | checked | reviewed | verified | 汉字 | 公式 |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...subjectRows.map(
      (row) =>
        `| ${row.id} | ${markdownEscape(row.label)} | ${row.concepts} | ${row.documents} | ${row.maturity.planned} | ${row.maturity.outline} | ${row.maturity.draft} | ${row.maturity.checked} | ${row.maturity.reviewed} | ${row.maturity.verified} | ${row.hanCharacters} | ${row.formulas} |`,
    ),
    "",
    "## 正文与语义块",
    "",
    "| 行内公式 | 展示公式 | Equation 引用 | 未注册展示公式 | Definition | Theorem | Proof | Example | CounterExample | Exercise | Solution |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    `| ${formulas.inline} | ${formulas.display} | ${formulas.semanticEquationReferences} | ${formulas.unregisteredDisplay} | ${blocks.definitions} | ${blocks.theorems} | ${blocks.proofs} | ${blocks.examples} | ${blocks.counterExamples} | ${blocks.exercises} | ${blocks.solutions} |`,
    "",
    "汉字统计排除代码、公式和 JSX/Markdown 标记；语义块只统计显式组件。展示公式注册覆盖使用去空白后的精确 LaTeX 匹配，完整逐式证据见 JSON 的 `unregisteredDisplayEquations`。",
    "",
    "## 文档清单",
    "",
    "| 路径 | 成熟度 | 汉字 | 公式 | 定义 | 定理 | 例题 | 练习 | 引用 | 实验 | 未注册展示公式 |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...documents.map((document) => {
      const documentFormulas = document.formulas as Record<string, number>;
      const documentBlocks = document.blocks as BlockCounts;
      const documentReferences = document.references as Record<string, number>;
      return `| ${markdownEscape(String(document.path))} | ${document.maturity} | ${document.hanCharacters} | ${documentFormulas.total} | ${documentBlocks.definitions} | ${documentBlocks.theorems} | ${documentBlocks.examples} | ${documentBlocks.exercises} | ${documentReferences.resourceCards} | ${documentReferences.interactiveFigures} | ${documentFormulas.unregisteredDisplay} |`;
    }),
    "",
    "## 大纲质量",
    "",
    `- 通用四段模板概念：${outlineQuality.genericConceptIds.length}`,
    `- 归一化后完全重复的大纲组：${outlineQuality.exactGroups.length}`,
    `- 不同签名但相似度不低于 0.86 的组对：${outlineQuality.highlySimilar.length}`,
    "",
  ];

  for (const group of outlineQuality.exactGroups) {
    lines.push(
      `- ${group.generic ? "通用模板" : "重复结构"}（${group.conceptIds.length}）：${group.conceptIds.join(", ")}`,
    );
  }
  if (outlineQuality.exactGroups.length === 0) lines.push("- 未发现完全重复组。");

  lines.push(
    "",
    "## 学习路径",
    "",
    "| 路径 | 节点 | 缺正文 | 未知节点 | 先修断链 | Checkpoint | Exercise | nextPath |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  );
  for (const path of paths) {
    lines.push(
      `| ${path.id} | ${path.nodes} | ${(path.missingBodies as readonly string[]).length} | ${(path.unknownNodes as readonly string[]).length} | ${(path.outOfOrderPrerequisites as readonly unknown[]).length} | ${(path.brokenCheckpoints as readonly string[]).length} | ${(path.brokenExercises as readonly string[]).length} | ${path.brokenNextPath ? "断链" : "正常"} |`,
    );
  }

  lines.push(
    "",
    "## Findings",
    "",
    `共 ${findings.length} 条：error ${(summary.findings as Record<string, number>).error}，warning ${(summary.findings as Record<string, number>).warning}，info ${(summary.findings as Record<string, number>).info}。`,
    "",
    "| 严重度 | Code | 路径 | 证据 |",
    "| --- | --- | --- | --- |",
    ...findings.map(
      (item) =>
        `| ${item.severity} | ${item.code} | ${markdownEscape(item.path)} | ${markdownEscape(item.evidence)} |`,
    ),
    "",
    "## 重复运行",
    "",
    "```bash",
    "pnpm audit:content",
    "```",
    "",
    '对应根 `package.json` 命令为 `"audit:content": "tsx scripts/audit-content.ts"`。需要让 error findings 作为 CI 失败时可运行 `tsx scripts/audit-content.ts --fail-on-error`。',
    "",
  );
  return lines.join("\n");
}

async function main(): Promise<void> {
  const report = await buildAudit();
  const prettierConfig = (await resolveConfig(join(repositoryRoot, "package.json"))) ?? {};
  const [json, markdown] = await Promise.all([
    format(`${JSON.stringify(report, null, 2)}\n`, { ...prettierConfig, parser: "json" }),
    format(markdownReport(report), { ...prettierConfig, parser: "markdown" }),
  ]);
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(jsonOutputPath, json, "utf8"),
    writeFile(markdownOutputPath, markdown, "utf8"),
  ]);
  const summary = report.summary as Record<string, unknown>;
  const findingCounts = summary.findings as Record<string, number>;
  console.log(
    `Content audit wrote ${displayPath(jsonOutputPath)} and ${displayPath(markdownOutputPath)}: ${summary.concepts} concepts, ${summary.documents} documents, ${findingCounts.error} error finding(s), ${findingCounts.warning} warning finding(s).`,
  );
  if (process.argv.includes("--fail-on-error") && Number(findingCounts.error) > 0) {
    process.exitCode = 1;
  }
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    console.error(`audit-content: ${errorMessage(error)}`);
    process.exitCode = 1;
  });
}
