import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import {
  curriculumRepository,
  publicCurriculumRepository,
  resources,
  type ResourceRecord,
} from "../packages/content/src/index.ts";
import { visualizationManifest } from "../packages/visualization/src/index.ts";
import {
  analyzeStyleDocuments,
  type ContentStyleFileReport,
  type StyleDocument,
} from "./content-style.ts";
import {
  displayPath,
  loadContentDocuments,
  repositoryRoot,
  type LoadedContentDocument,
} from "./lib/content-files.ts";

interface PublicationFailure {
  readonly file: string;
  readonly contentId: string;
  readonly rule: string;
  readonly message: string;
}

interface PublicationValidationReport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly summary: {
    readonly documents: number;
    readonly published: number;
    readonly passed: number;
    readonly failed: number;
    readonly failures: number;
  };
  readonly failures: readonly PublicationFailure[];
}

const reportsRoot = join(repositoryRoot, "reports", "round-5");
const currentFile = fileURLToPath(import.meta.url);
const jsonPath = join(reportsRoot, "publication-validation.json");
const markdownPath = join(reportsRoot, "publication-validation.md");

const forbiddenBodyPatterns = [
  /\b(?:planned|outline|draft)\b/iu,
  /TODO/iu,
  /正文计划中/u,
  /课程规划/u,
  /尚未完成/u,
  /待审阅/u,
  /待检查/u,
  /待核验/u,
  /审阅状态/u,
  /编辑状态/u,
  /humanReviewer/iu,
  /schemaVersion/iu,
  /publicationStatus/iu,
  /editorialStatus/iu,
] as const;

const blockingStyleRules = new Set([
  "complete-example-count",
  "cross-document-duplicate-paragraph",
  "duplicate-paragraph",
  "duplicate-sentence",
  "editorial-term-leakage",
  "exercise-count",
  "generic-conclusion",
  "generic-introduction",
  "resource-count",
  "short-article",
  "todo-marker",
]);

function countOpeningTags(body: string, component: string): number {
  return [...body.matchAll(new RegExp(`<${component}(?:\\s[^>]*)?>`, "gu"))].length;
}

export function hasNonSpecificTopicHeading(body: string): boolean {
  const headings = [...body.matchAll(/^##(?:[ \t]+(.*))?$/gmu)].map(
    (match) => match[1]?.trim() ?? "",
  );
  return headings.some(
    (heading) => heading.length === 0 || /^(?:正文|内容|其他|更多)$/u.test(heading),
  );
}

export function hasNonSpecificChapterTitle(title: string): boolean {
  const normalized = title.trim();
  return normalized.length === 0 || /^(?:导论|概述|基础|复习)$/u.test(normalized);
}

export function countExplicitSolutions(body: string): number {
  const solutionBlocks = countOpeningTags(body, "Solution");
  const exerciseSolutionSlots = countOpeningTags(body, "ExerciseSolution");
  const exerciseSolutionAttributes = [...body.matchAll(/<Exercise\b[\s\S]*?>/gu)].filter((match) =>
    /\bsolution\s*=/u.test(match[0]),
  ).length;
  return solutionBlocks + exerciseSolutionSlots + exerciseSolutionAttributes;
}

function resourceIsTraceable(resource: ResourceRecord | undefined): boolean {
  return Boolean(
    resource?.verifiedAt &&
      Object.values(resource.links).some(
        (value) => typeof value === "string" && /^https:\/\//u.test(value),
      ),
  );
}

function push(
  failures: PublicationFailure[],
  document: LoadedContentDocument,
  rule: string,
  message: string,
): void {
  failures.push({
    file: document.relativePath,
    contentId: document.frontmatter.id,
    rule,
    message,
  });
}

export function validatePublishedDocument(
  document: LoadedContentDocument,
  style: ContentStyleFileReport,
  resourceById: ReadonlyMap<string, ResourceRecord>,
  visualizationIds: ReadonlySet<string>,
): readonly PublicationFailure[] {
  const failures: PublicationFailure[] = [];
  const { frontmatter, body } = document;
  const chapter = curriculumRepository.getChapterForContent(frontmatter.id);

  if (frontmatter.publicationStatus !== "published") return failures;
  if (!chapter) {
    push(failures, document, "curriculum-location", "正文没有对应教材章节。");
    return failures;
  }
  if (chapter.publicationStatus !== "published") {
    push(failures, document, "state-binding", "正文与教材章节的发布状态不一致。");
  }
  const publicContext = publicCurriculumRepository.getChapterContext(chapter.id, document.locale);
  if (!publicContext) {
    push(failures, document, "public-route", "published 正文没有可解析的公开教材路由。");
  }
  if (
    frontmatter.editorialStatus === "planned" ||
    frontmatter.editorialStatus === "outline" ||
    frontmatter.editorialStatus === "draft"
  ) {
    push(failures, document, "editorial-readiness", "published 正文至少需要 checked 编辑状态。");
  }
  if (hasNonSpecificChapterTitle(frontmatter.title)) {
    push(failures, document, "specific-title", "章节标题不够具体。");
  }
  if (style.metrics.hanCharacters < 1_800) {
    push(
      failures,
      document,
      "complete-body",
      `正文只有 ${style.metrics.hanCharacters} 个有效汉字，低于基础章节预警下限 1800。`,
    );
  }

  const headings = [...body.matchAll(/^##\s+(.+)$/gmu)].map((match) => match[1]?.trim() ?? "");
  if (headings.length < 4) {
    push(failures, document, "topic-outline", `正文只有 ${headings.length} 个二级标题。`);
  }
  if (hasNonSpecificTopicHeading(body)) {
    push(failures, document, "topic-headings", "存在不具体或与主题无关的二级标题。");
  }

  for (const pattern of forbiddenBodyPatterns) {
    const match = pattern.exec(body);
    if (match) {
      push(failures, document, "placeholder-or-editorial-copy", `正文包含“${match[0]}”。`);
    }
  }

  const examples = countOpeningTags(body, "Example");
  const exercises = countOpeningTags(body, "Exercise");
  const solutions = countExplicitSolutions(body);
  if (examples < 2) {
    push(failures, document, "complete-examples", `只有 ${examples} 个显式例题，至少需要 2 个。`);
  }
  if (exercises < 3) {
    push(failures, document, "relevant-exercises", `只有 ${exercises} 道练习，至少需要 3 道。`);
  }
  if (solutions < exercises) {
    push(
      failures,
      document,
      "checked-solutions",
      `${exercises} 道练习只有 ${solutions} 个显式解答。`,
    );
  }

  if (frontmatter.resources.length < 2) {
    push(failures, document, "traceable-resources", "公开正文至少需要 2 项可核实资源。");
  }
  for (const resourceId of frontmatter.resources) {
    if (!resourceIsTraceable(resourceById.get(resourceId))) {
      push(
        failures,
        document,
        "traceable-resources",
        `资源 ${resourceId} 缺少核验日期或 HTTPS 来源。`,
      );
    }
  }
  for (const visualizationId of frontmatter.visualizations) {
    if (!visualizationIds.has(visualizationId)) {
      push(failures, document, "visualization-reference", `可视化 ${visualizationId} 不存在。`);
    }
  }

  const reviewChecks = [
    ["数学", frontmatter.review.mathematicalStatus],
    ["数值", frontmatter.review.numericalStatus],
    ["来源", frontmatter.review.sourceStatus],
    ["无障碍", frontmatter.review.accessibilityStatus],
  ] as const;
  for (const [label, status] of reviewChecks) {
    if (status !== "checked") {
      push(failures, document, "required-checks", `${label}检查尚未通过。`);
    }
  }

  for (const finding of style.findings) {
    if (finding.severity === "warning" || blockingStyleRules.has(finding.ruleId)) {
      push(
        failures,
        document,
        `content-style:${finding.ruleId}`,
        `${finding.location.line}:${finding.location.column} ${finding.summary}`,
      );
    }
  }

  return failures;
}

function markdown(report: PublicationValidationReport): string {
  const rows = report.failures
    .map(
      (failure) =>
        `| ${failure.file.replace(/\|/gu, "\\|")} | ${failure.rule} | ${failure.message.replace(/\|/gu, "\\|")} |`,
    )
    .join("\n");
  return `# One Forth 发布门槛验证\n\n- 正文：${report.summary.documents}\n- published：${report.summary.published}\n- 通过：${report.summary.passed}\n- 未通过：${report.summary.failed}\n- 失败项：${report.summary.failures}\n\n| 文件 | 规则 | 结果 |\n| --- | --- | --- |\n${rows || "| — | — | 所有 published 正文通过自动发布门槛。 |"}\n`;
}

export async function runPublicationValidation(): Promise<PublicationValidationReport> {
  const loaded = await loadContentDocuments();
  if (loaded.diagnostics.length > 0) {
    throw new Error(loaded.diagnostics.map((item) => `${item.file}: ${item.message}`).join("\n"));
  }
  const styleDocuments: StyleDocument[] = loaded.documents.map((document) => ({
    file: document.relativePath,
    title: document.frontmatter.title,
    body: document.body,
    bodyStartLine: document.bodyStartLine,
    declaredVisualizations: document.frontmatter.visualizations,
  }));
  const style = analyzeStyleDocuments(styleDocuments, undefined, [], "validation-run");
  const styleByFile = new Map(style.files.map((file) => [file.file, file] as const));
  const resourceById = new Map(resources.map((resource) => [resource.id, resource] as const));
  const visualizationIds = new Set(visualizationManifest.map((entry) => entry.id));
  const published = loaded.documents.filter(
    (document) => document.frontmatter.publicationStatus === "published",
  );
  const failures = published.flatMap((document) => {
    const styleFile = styleByFile.get(document.relativePath);
    if (!styleFile) {
      return [
        {
          file: displayPath(document.sourcePath),
          contentId: document.frontmatter.id,
          rule: "style-analysis",
          message: "正文没有文风分析结果。",
        },
      ];
    }
    return validatePublishedDocument(document, styleFile, resourceById, visualizationIds);
  });
  if (published.length === 0) {
    failures.push({
      file: "content",
      contentId: "__public_library__",
      rule: "non-empty-public-library",
      message: "没有任何 published 正文；发布门槛不能以空集合通过。",
    });
  }
  const failedDocuments = new Set(failures.map((failure) => failure.contentId));
  const report: PublicationValidationReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      documents: loaded.documents.length,
      published: published.length,
      passed: published.length - failedDocuments.size,
      failed: failedDocuments.size,
      failures: failures.length,
    },
    failures,
  };
  await mkdir(reportsRoot, { recursive: true });
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, markdown(report), "utf8"),
  ]);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  try {
    const report = await runPublicationValidation();
    if (report.summary.failures > 0) {
      console.error(
        `Publication validation failed: ${report.summary.failed}/${report.summary.published} published document(s), ${report.summary.failures} failure(s).`,
      );
      process.exitCode = 1;
    } else {
      console.log(
        `Publication validation passed: ${report.summary.published}/${report.summary.published} published document(s).`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
