import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  displayPath,
  loadContentDocuments,
  repositoryRoot,
  walkFiles,
} from "./lib/content-files.ts";
import { findForbiddenContentPackageImports } from "./lib/public-repository-boundary.ts";

interface PublicContentLeak {
  readonly source:
    | "public-data"
    | "public-curriculum-copy"
    | "public-document-copy"
    | "visible-copy"
    | "client-contract"
    | "repository-boundary";
  readonly location: string;
  readonly match: string;
  readonly message: string;
}

interface PublicContentAuditReport {
  readonly schemaVersion: 2;
  readonly generatedAt: string;
  readonly summary: {
    readonly sourceDocuments: number;
    readonly readableDocuments: number;
    readonly publishedDocuments: number;
    readonly previewDocuments: number;
    readonly readerSeries: number;
    readonly readerBooks: number;
    readonly readerParts: number;
    readonly readerChapters: number;
    readonly indexableSeries: number;
    readonly indexableBooks: number;
    readonly indexableParts: number;
    readonly indexableChapters: number;
    readonly reachableUiModules: number;
    readonly leaks: number;
  };
  readonly leaks: readonly PublicContentLeak[];
}

const currentFile = fileURLToPath(import.meta.url);
const webRoot = join(repositoryRoot, "apps", "web");
const appRoot = join(webRoot, "app");
const reportsRoot = join(repositoryRoot, "reports", "round-5");
const jsonPath = join(reportsRoot, "public-content-audit.json");
const markdownPath = join(reportsRoot, "public-content-audit.md");

const forbiddenDocumentPatterns = [
  /\bTODO\b/iu,
  /正文计划中/u,
  /课程规划/u,
  /规划章节/u,
  /(?:新增正文|新增内容|所有新增内容|正文|本章).{0,48}(?:待审阅|待数学、数值、来源|四项审阅|草稿状态|草稿阶段)/u,
  /内容生产/u,
  /建设进度/u,
  /构建状态/u,
  /编辑状态/u,
  /审阅状态/u,
  /Schema\s+v?\d+/iu,
] as const;

// Reader UI intentionally labels preview pages as pending human review. The
// patterns above target process copy rather than that truthful status notice.
const forbiddenUiPatterns = forbiddenDocumentPatterns;

const forbiddenClientFields = [
  "bookId",
  "conceptId",
  "contentId",
  "editorialStatus",
  "maturity",
  "partId",
  "publicationStatus",
  "schemaVersion",
  "seriesId",
  "statusLabel",
] as const;

function candidateModulePaths(specifier: string, importer: string): string[] {
  const base = specifier.startsWith("@/")
    ? join(webRoot, specifier.slice(2))
    : resolve(dirname(importer), specifier);
  if (extname(base)) return [base];
  return [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
}

function localSpecifiers(source: string): readonly string[] {
  const matches = [
    ...source.matchAll(/(?:from\s*|import\s*\()\s*["'](@\/[^"']+|\.{1,2}\/[^"']+)["']/gu),
  ];
  return [...new Set(matches.flatMap((match) => (match[1] ? [match[1]] : [])))];
}

async function collectReachableUiModules(): Promise<ReadonlyMap<string, string>> {
  const appFiles = await walkFiles(appRoot, new Set([".ts", ".tsx"]));
  const queue = appFiles.filter((file) => {
    const normalized = file.replace(/\\/gu, "/");
    return !normalized.includes("/[locale]/design-system/");
  });
  const allWebFiles = new Set(await walkFiles(webRoot, new Set([".ts", ".tsx"])));
  const visited = new Map<string, string>();

  while (queue.length > 0) {
    const file = queue.shift();
    if (!file || visited.has(file) || !allWebFiles.has(file)) continue;
    const source = await readFile(file, "utf8");
    visited.set(file, source);
    for (const specifier of localSpecifiers(source)) {
      const candidate = candidateModulePaths(specifier, file).find((path) => allWebFiles.has(path));
      if (candidate && !visited.has(candidate)) queue.push(candidate);
    }
  }
  return visited;
}

function visibleLiterals(source: string): readonly string[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//gu, " ").replace(/^\s*\/\/.*$/gmu, " ");
  const quoted = [...withoutComments.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/gu)].flatMap(
    (match) => (match[2] ? [match[2]] : []),
  );
  const jsxText = [...withoutComments.matchAll(/>([^<>{}\n][^<>{}]*)</gu)].flatMap((match) =>
    match[1] ? [match[1].trim()] : [],
  );
  return [...quoted, ...jsxText].filter(Boolean);
}

export async function runPublicContentAudit(): Promise<PublicContentAuditReport> {
  const {
    isContentReadable,
    isRecentUpdateRevision,
    publicContentRepository,
    publicCurriculumRepository,
    readerContentRepository,
    readerCurriculumRepository,
  } = await import("../packages/content/src/index.ts");
  const loaded = await loadContentDocuments();
  if (loaded.diagnostics.length > 0) {
    throw new Error(loaded.diagnostics.map((item) => `${item.file}: ${item.message}`).join("\n"));
  }
  const leaks: PublicContentLeak[] = [];
  const publicDocuments = await publicContentRepository.listDocuments();
  const readerDocuments = await readerContentRepository.listDocuments();
  const readerDocumentIds = new Set(readerDocuments.map((document) => document.frontmatter.id));
  for (const document of readerDocuments) {
    if (!isContentReadable(document.frontmatter.publicationStatus)) {
      leaks.push({
        source: "public-data",
        location: document.url,
        match: document.frontmatter.publicationStatus,
        message: "读者内容仓库包含不可公开阅读的正文。",
      });
    }
    const readerText = [
      document.frontmatter.title,
      document.frontmatter.shortTitle,
      document.frontmatter.summary,
      ...document.frontmatter.learningObjectives,
      ...document.frontmatter.revisionHistory
        .filter(isRecentUpdateRevision)
        .map((revision) => revision.summary),
      document.body,
    ].join("\n");
    for (const pattern of forbiddenDocumentPatterns) {
      const match = pattern.exec(readerText);
      if (!match) continue;
      leaks.push({
        source: "public-document-copy",
        location: document.url,
        match: match[0],
        message: "上架正文或其可见元数据包含内部编辑、构建或占位文案。",
      });
    }
  }
  for (const document of publicDocuments) {
    if (document.frontmatter.publicationStatus !== "published") {
      leaks.push({
        source: "public-data",
        location: document.url,
        match: document.frontmatter.publicationStatus,
        message: "可索引内容仓库包含非 published 正文。",
      });
    }
  }
  for (const chapter of readerCurriculumRepository.listChapters()) {
    if (!isContentReadable(chapter.publicationStatus) || !chapter.contentId) {
      leaks.push({
        source: "public-data",
        location: chapter.slug,
        match: `${chapter.publicationStatus}/${chapter.contentId ?? "missing"}`,
        message: "读者课程仓库包含不可阅读或无正文的章节。",
      });
    } else if (!readerDocumentIds.has(chapter.contentId)) {
      leaks.push({
        source: "public-data",
        location: chapter.slug,
        match: chapter.contentId,
        message: "读者课程章节没有对应上架正文。",
      });
    }
  }
  for (const chapter of publicCurriculumRepository.listChapters()) {
    if (chapter.publicationStatus !== "published" || !chapter.contentId) {
      leaks.push({
        source: "public-data",
        location: chapter.slug,
        match: `${chapter.publicationStatus}/${chapter.contentId ?? "missing"}`,
        message: "可索引课程仓库包含非 published 或无正文的章节。",
      });
    }
  }
  const readerCurriculumCopy = [
    ...readerCurriculumRepository.listSeries().map((series) => ({
      location: series.slug,
      values: [...Object.values(series.title), ...Object.values(series.summary)],
    })),
    ...readerCurriculumRepository.listBooks().map((book) => ({
      location: book.slug,
      values: [
        ...Object.values(book.title),
        ...Object.values(book.summary),
        ...Object.values(book.introduction),
        ...Object.values(book.audience),
        ...book.symbolConventions.flatMap((item) => Object.values(item)),
        ...book.integratedExercisePlan.flatMap((item) => Object.values(item)),
        ...book.referencePlan.flatMap((item) => Object.values(item)),
      ],
    })),
    ...readerCurriculumRepository.listParts().map((part) => ({
      location: part.slug,
      values: [...Object.values(part.title), ...Object.values(part.summary)],
    })),
    ...readerCurriculumRepository.listChapters().map((chapter) => ({
      location: chapter.slug,
      values: [...Object.values(chapter.title), ...Object.values(chapter.summary)],
    })),
  ];
  for (const record of readerCurriculumCopy) {
    const readerText = record.values.join("\n");
    for (const pattern of forbiddenDocumentPatterns) {
      const match = pattern.exec(readerText);
      if (!match) continue;
      leaks.push({
        source: "public-curriculum-copy",
        location: record.location,
        match: match[0],
        message: "上架教材导航数据包含内部编辑、构建或占位文案。",
      });
    }
  }

  const modules = await collectReachableUiModules();
  for (const [file, source] of modules) {
    const location = displayPath(file);
    for (const repositoryImport of findForbiddenContentPackageImports(source)) {
      leaks.push({
        source: "repository-boundary",
        location,
        match: repositoryImport.match,
        message: `公开可达模块导入完整编辑仓库 ${repositoryImport.binding}；应改用 public* 可索引 facade 或 reader* 可阅读 facade。`,
      });
    }
    const literals = visibleLiterals(source);
    for (const literal of literals) {
      for (const pattern of forbiddenUiPatterns) {
        const match = pattern.exec(literal);
        if (match) {
          leaks.push({
            source: "visible-copy",
            location,
            match: match[0],
            message: `公开可达模块包含内部编辑或占位文案：“${literal.slice(0, 120)}”。`,
          });
        }
      }
    }
    if (/^\s*["']use client["'];/mu.test(source)) {
      for (const field of forbiddenClientFields) {
        if (new RegExp(`\\b${field}\\b`, "u").test(source)) {
          leaks.push({
            source: "client-contract",
            location,
            match: field,
            message: `公开客户端模块仍声明内部字段 ${field}。`,
          });
        }
      }
    }
  }

  const report: PublicContentAuditReport = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    summary: {
      sourceDocuments: loaded.documents.length,
      readableDocuments: readerDocuments.length,
      publishedDocuments: publicDocuments.length,
      previewDocuments: readerDocuments.filter(
        (document) => document.frontmatter.publicationStatus === "preview",
      ).length,
      readerSeries: readerCurriculumRepository.listSeries().length,
      readerBooks: readerCurriculumRepository.listBooks().length,
      readerParts: readerCurriculumRepository.listParts().length,
      readerChapters: readerCurriculumRepository.listChapters().length,
      indexableSeries: publicCurriculumRepository.listSeries().length,
      indexableBooks: publicCurriculumRepository.listBooks().length,
      indexableParts: publicCurriculumRepository.listParts().length,
      indexableChapters: publicCurriculumRepository.listChapters().length,
      reachableUiModules: modules.size,
      leaks: leaks.length,
    },
    leaks,
  };
  await mkdir(reportsRoot, { recursive: true });
  const rows = leaks
    .map(
      (leak) =>
        `| ${leak.source} | ${leak.location.replace(/\|/gu, "\\|")} | ${leak.match.replace(/\|/gu, "\\|")} | ${leak.message.replace(/\|/gu, "\\|")} |`,
    )
    .join("\n");
  const markdown = `# One Forth 公开内容审计\n\n- 源正文：${report.summary.sourceDocuments}\n- 已上架正文：${report.summary.readableDocuments}（published ${report.summary.publishedDocuments} / preview ${report.summary.previewDocuments}）\n- 读者 Series / Book / Part / Chapter：${report.summary.readerSeries} / ${report.summary.readerBooks} / ${report.summary.readerParts} / ${report.summary.readerChapters}\n- 可索引 Series / Book / Part / Chapter：${report.summary.indexableSeries} / ${report.summary.indexableBooks} / ${report.summary.indexableParts} / ${report.summary.indexableChapters}\n- 可达 UI 模块：${report.summary.reachableUiModules}\n- 泄漏：${report.summary.leaks}\n\n| 来源 | 位置 | 命中 | 说明 |\n| --- | --- | --- | --- |\n${rows || "| — | — | — | 未发现公开编辑信息或占位内容泄漏。 |"}\n`;
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, markdown, "utf8"),
  ]);
  return report;
}

async function main(): Promise<void> {
  try {
    const report = await runPublicContentAudit();
    if (report.summary.leaks > 0) {
      console.error(`Public content audit failed: ${report.summary.leaks} leak(s).`);
      process.exitCode = 1;
    } else {
      console.log(
        `Public content audit passed: ${report.summary.readableDocuments} readable document(s) (${report.summary.publishedDocuments} published, ${report.summary.previewDocuments} preview), ${report.summary.reachableUiModules} reachable UI module(s).`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) void main();
