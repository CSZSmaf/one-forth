import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { format, resolveConfig } from "prettier";
import {
  conceptCatalog,
  contentRepository,
  curriculumData,
  curriculumRedirects,
  curriculumRepository,
  equations,
  learningPathAliases,
  learningPaths,
  legacyLearningPathsV2,
  resources,
  symbols,
} from "../../packages/content/src/index.ts";
import { visualizationManifest } from "../../packages/visualization/src/index.ts";
import { repositoryRoot } from "../lib/content-files.ts";

const reportRoot = join(repositoryRoot, "reports", "round-4");
export const round4CoverageJsonPath = join(reportRoot, "curriculum-coverage.json");
export const round4CoverageMarkdownPath = join(reportRoot, "curriculum-coverage.md");
export const round4MigrationJsonPath = join(reportRoot, "content-migration-map.json");
export const round4MigrationMarkdownPath = join(reportRoot, "content-migration-map.md");

async function formatArtifact(source: string, path: string): Promise<string> {
  const config = (await resolveConfig(path)) ?? {};
  return format(source, { ...config, filepath: path });
}

function zh(text: Readonly<Record<string, string>>): string {
  return text["zh-CN"] ?? text.en ?? "";
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function bookPath(bookId: string): string | null {
  const book = curriculumRepository.getBook(bookId);
  const series = book ? curriculumRepository.getSeries(book.seriesId) : null;
  return book && series ? `/zh-CN/books/${series.slug}/${book.slug}` : null;
}

function chapterRecord(chapterId: string) {
  const context = curriculumRepository.getChapterContext(chapterId, "zh-CN");
  if (!context) throw new Error(`Cannot report missing curriculum Chapter ${chapterId}`);
  return {
    seriesId: context.series.id,
    seriesTitle: zh(context.series.title),
    bookId: context.book.id,
    bookCode: context.book.code,
    bookTitle: zh(context.book.title),
    partId: context.part.id,
    partTitle: zh(context.part.title),
    chapterId: context.chapter.id,
    chapterNumber: context.chapterNumber,
    chapterTitle: zh(context.chapter.title),
    targetUrl: context.canonicalPath,
  };
}

function countBy<T extends string>(values: readonly T[]): Readonly<Record<T, number>> {
  return values.reduce<Record<T, number>>(
    (counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    },
    {} as Record<T, number>,
  );
}

export async function buildRound4Artifacts() {
  const documents = await contentRepository.listDocuments({ locale: "zh-CN" });
  const documentMigrations = documents.map((document) => {
    const chapter = curriculumRepository.getChapterForContent(document.frontmatter.id);
    if (!chapter) throw new Error(`Cannot report unmapped content ${document.frontmatter.id}`);
    const location = chapterRecord(chapter.id);
    const concept = conceptCatalog.find(
      (candidate) => candidate.id === document.frontmatter.conceptId,
    );
    return {
      originalContentId: document.frontmatter.id,
      conceptId: document.frontmatter.conceptId,
      originalUrl: `/zh-CN/learn/${document.slug.join("/")}`,
      originalPublicationStatus: document.frontmatter.publicationStatus,
      originalEditorialStatus: document.frontmatter.editorialStatus,
      ...location,
      anchorId:
        concept?.canonicalLocation.chapterId === chapter.id
          ? (concept.canonicalLocation.anchorId ?? null)
          : null,
      migration: "permanent-redirect-to-canonical-chapter",
      preserveOriginalUrl: true,
      targetStatus: "confirmed",
    };
  });

  const conceptMigrations = conceptCatalog.map((concept) => {
    const location = chapterRecord(concept.canonicalLocation.chapterId);
    const targetUrl = curriculumRepository.resolveCanonicalLocation(
      concept.canonicalLocation,
      "zh-CN",
    );
    if (!targetUrl) throw new Error(`Cannot report concept location ${concept.id}`);
    return {
      conceptId: concept.id,
      originalUrl: `/zh-CN/concepts/${concept.id}`,
      originalMaturity: concept.maturity,
      ...location,
      targetUrl,
      anchorId: concept.canonicalLocation.anchorId ?? null,
      migration: concept.canonicalLocation.anchorId
        ? "permanent-redirect-to-chapter-anchor"
        : "permanent-redirect-to-chapter",
      preserveOriginalUrl: true,
      targetStatus: "confirmed",
    };
  });

  const visualizationMigrations = visualizationManifest.map((visualization) => {
    const binding = curriculumRepository.getVisualizationBinding(visualization.id);
    if (!binding) throw new Error(`Cannot report visualization binding ${visualization.id}`);
    return {
      visualizationId: visualization.id,
      originalUrl: `/zh-CN/playground?figure=${visualization.id}`,
      ...chapterRecord(binding.primaryChapterId),
      primaryContentId: binding.primaryContentId,
      allChapterIds: binding.chapterIds,
      migration: "bind-auxiliary-experiment-to-primary-chapter",
      preserveOriginalUrl: true,
      targetStatus: "confirmed",
    };
  });

  const activePathById = new Map(learningPaths.map((path) => [path.id, path] as const));
  const aliasById = new Map(learningPathAliases.map((alias) => [alias.id, alias] as const));
  const learningPathMigrations = legacyLearningPathsV2.map((legacy) => {
    const alias = aliasById.get(legacy.id);
    const active = activePathById.get(legacy.id);
    if (!alias && !active) throw new Error(`Cannot report legacy learning path ${legacy.id}`);
    return alias
      ? {
          learningPathId: legacy.id,
          originalUrl: `/zh-CN/paths/${legacy.id}`,
          targetUrl: bookPath(alias.targetBookId),
          targetBookId: alias.targetBookId,
          chapterIds: [] as readonly string[],
          migration: "permanent-book-alias",
          preserveOriginalUrl: true,
          targetStatus: "confirmed",
        }
      : {
          learningPathId: legacy.id,
          originalUrl: `/zh-CN/paths/${legacy.id}`,
          targetUrl: `/zh-CN/paths/${legacy.id}`,
          targetBookId: null,
          chapterIds: active?.chapterIds ?? [],
          migration: "retain-topical-route-with-canonical-chapter-references",
          preserveOriginalUrl: true,
          targetStatus: "confirmed",
        };
  });

  const publicationStatusCounts = countBy(
    curriculumData.chapters.map((chapter) => chapter.publicationStatus),
  );
  const editorialStatusCounts = countBy(
    curriculumData.chapters.map((chapter) => chapter.editorialStatus),
  );
  const sectionTitles = curriculumData.chapters.flatMap((chapter) =>
    chapter.plannedSections.map((section) => zh(section.title)),
  );
  const seriesCoverage = curriculumData.series.map((series) => {
    const books = curriculumRepository.listBooks(series.id);
    const bookIds = new Set(books.map((book) => book.id));
    return {
      seriesId: series.id,
      title: zh(series.title),
      books: books.length,
      parts: curriculumData.parts.filter((part) => bookIds.has(part.bookId)).length,
      chapters: curriculumData.chapters.filter((chapter) => bookIds.has(chapter.bookId)).length,
    };
  });
  const coverage = {
    schemaVersion: 1,
    generatedAt: "2026-07-13",
    status: "implemented-and-validated",
    productionBaseline: { sitesVersion: 6, source: "02b76b6", sitemapUrls: 253 },
    inventory: {
      documents: documents.length,
      concepts: conceptCatalog.length,
      legacyLearningPaths: legacyLearningPathsV2.length,
      activeTopicalPaths: learningPaths.filter((path) => path.routeKind === "topic").length,
      activeSeriesPaths: learningPaths.filter((path) => path.routeKind === "series").length,
      retiredPathAliases: learningPathAliases.length,
      resources: resources.length,
      visualizations: visualizationManifest.length,
      symbols: symbols.length,
      equations: equations.length,
    },
    curriculum: {
      schemaVersion: curriculumData.schemaVersion,
      series: curriculumData.series.length,
      books: curriculumData.books.length,
      parts: curriculumData.parts.length,
      chapters: curriculumData.chapters.length,
      publicationStatusCounts,
      editorialStatusCounts,
      mappedDocuments: documentMigrations.length,
      locatedConcepts: conceptMigrations.length,
      boundVisualizations: visualizationMigrations.length,
      plannedSectionTitles: sectionTitles.length,
      uniquePlannedSectionTitles: new Set(sectionTitles).size,
      seriesCoverage,
    },
    redirects: {
      total: curriculumRedirects.length,
      byKind: countBy(curriculumRedirects.map((redirect) => redirect.kind)),
    },
    unassigned: {
      documents: documents.length - documentMigrations.length,
      concepts: conceptCatalog.length - conceptMigrations.length,
      visualizations: visualizationManifest.length - visualizationMigrations.length,
    },
    reviewTruth: {
      reviewedChapters: editorialStatusCounts.reviewed ?? 0,
      verifiedChapters: editorialStatusCounts.verified ?? 0,
      note: "计划目录、草稿和自动验证均不等同于独立人工审阅。",
    },
  };
  const migration = {
    schemaVersion: 2,
    generatedAt: "2026-07-13",
    status: "implemented",
    canonicalScheme: {
      library: "/{locale}/books",
      book: "/{locale}/books/{seriesSlug}/{bookSlug}",
      chapter: "/{locale}/books/{seriesSlug}/{bookSlug}/{chapterSlug}",
      section: "/{locale}/books/{seriesSlug}/{bookSlug}/{chapterSlug}#{semanticAnchor}",
    },
    counts: {
      documents: documentMigrations.length,
      legacyLearningPaths: learningPathMigrations.length,
      visualizations: visualizationMigrations.length,
      concepts: conceptMigrations.length,
      totalLegacyEntities:
        documentMigrations.length +
        learningPathMigrations.length +
        visualizationMigrations.length +
        conceptMigrations.length,
      confirmedTargets:
        documentMigrations.length +
        learningPathMigrations.length +
        visualizationMigrations.length +
        conceptMigrations.length,
      pendingTargets: 0,
      permanentRedirects: curriculumRedirects.length,
    },
    documents: documentMigrations,
    learningPaths: learningPathMigrations,
    newTopicalPaths: learningPaths
      .filter((path) => !legacyLearningPathsV2.some((legacy) => legacy.id === path.id))
      .map((path) => ({ id: path.id, chapterIds: path.chapterIds })),
    visualizations: visualizationMigrations,
    concepts: conceptMigrations,
  };
  return { coverage, migration };
}

function coverageMarkdown(coverage: Awaited<ReturnType<typeof buildRound4Artifacts>>["coverage"]) {
  const seriesRows = coverage.curriculum.seriesCoverage
    .map(
      (series) =>
        `| ${series.seriesId} | ${series.title} | ${series.books} | ${series.parts} | ${series.chapters} |`,
    )
    .join("\n");
  return `# One Forth 第四轮课程覆盖

> 由当前版本化课程注册表生成；计划目录和草稿不等同于人工审阅。

| 指标 | 数量 |
| --- | ---: |
| Series | ${coverage.curriculum.series} |
| Book | ${coverage.curriculum.books} |
| Part | ${coverage.curriculum.parts} |
| Chapter | ${coverage.curriculum.chapters} |
| 已映射 MDX | ${coverage.curriculum.mappedDocuments}/${coverage.inventory.documents} |
| 已定位 Concept | ${coverage.curriculum.locatedConcepts}/${coverage.inventory.concepts} |
| 已绑定实验 | ${coverage.curriculum.boundVisualizations}/${coverage.inventory.visualizations} |
| planned section 标题 | ${coverage.curriculum.uniquePlannedSectionTitles}/${coverage.curriculum.plannedSectionTitles} 唯一 |
| 永久重定向 | ${coverage.redirects.total} |

发布状态：${Object.entries(coverage.curriculum.publicationStatusCounts)
    .map(([status, count]) => `${status} ${count}`)
    .join("、")}；编辑状态：${Object.entries(coverage.curriculum.editorialStatusCounts)
    .map(([status, count]) => `${status} ${count}`)
    .join(
      "、",
    )}；reviewed ${coverage.reviewTruth.reviewedChapters}、verified ${coverage.reviewTruth.verifiedChapters}。

| Series ID | 系列 | Book | Part | Chapter |
| --- | --- | ---: | ---: | ---: |
${seriesRows}

未归档正文 ${coverage.unassigned.documents}、未定位概念 ${coverage.unassigned.concepts}、未绑定实验 ${coverage.unassigned.visualizations}。
`;
}

function migrationMarkdown(
  migration: Awaited<ReturnType<typeof buildRound4Artifacts>>["migration"],
) {
  const documentRows = migration.documents
    .map(
      (item) =>
        `| ${item.originalContentId} | ${item.originalUrl} | ${item.bookCode} ${escapeCell(item.bookTitle)} | ${escapeCell(item.partTitle)} | ${item.chapterId} · ${escapeCell(item.chapterTitle)} | ${item.anchorId ?? "—"} | ${item.migration} | 是 |`,
    )
    .join("\n");
  const pathRows = migration.learningPaths
    .map(
      (item) =>
        `| ${item.learningPathId} | ${item.originalUrl} | ${item.targetBookId ?? `${item.chapterIds.length} 个 Chapter`} | ${item.targetUrl} | ${item.migration} | 是 |`,
    )
    .join("\n");
  const visualizationRows = migration.visualizations
    .map(
      (item) =>
        `| ${item.visualizationId} | ${item.originalUrl} | ${item.bookCode} | ${item.chapterId} · ${escapeCell(item.chapterTitle)} | ${item.targetUrl} | 是 |`,
    )
    .join("\n");
  const conceptRows = migration.concepts
    .map(
      (item) =>
        `| ${item.conceptId} | ${item.originalUrl} | ${item.bookCode} | ${item.chapterId} · ${escapeCell(item.chapterTitle)} | ${item.anchorId ?? "—"} | ${item.targetUrl} | 是 |`,
    )
    .join("\n");
  return `# One Forth 第四轮内容迁移图

> 状态：已实施。旧实体 ${migration.counts.totalLegacyEntities} 个，确认目标 ${migration.counts.confirmedTargets} 个，pending ${migration.counts.pendingTargets} 个；永久单跳映射 ${migration.counts.permanentRedirects} 条。

## 1. 正文（${migration.counts.documents}）

| 原内容 ID | 原 URL | 新教材 | 新 Part | 新 Chapter | 新锚点 | 迁移方式 | 保留旧 URL |
| --- | --- | --- | --- | --- | --- | --- | --- |
${documentRows}

## 2. 原学习路径（${migration.counts.legacyLearningPaths}）

| 原路径 ID | 原 URL | 新归属 | 目标 | 迁移方式 | 保留旧 URL |
| --- | --- | --- | --- | --- | --- |
${pathRows}

## 3. 实验（${migration.counts.visualizations}）

| 实验 ID | 原 URL | 新教材 | 主要 Chapter | 正文目标 | 保留实验 URL |
| --- | --- | --- | --- | --- | --- |
${visualizationRows}

## 4. 概念（${migration.counts.concepts}）

| Concept ID | 原 URL | 新教材 | 新 Chapter | 新锚点 | canonical 目标 | 保留旧 URL |
| --- | --- | --- | --- | --- | --- | --- |
${conceptRows}
`;
}

export async function writeRound4Artifacts() {
  const artifacts = await buildRound4Artifacts();
  await mkdir(reportRoot, { recursive: true });
  const [coverageJson, coverageMarkdownArtifact, migrationJson, migrationMarkdownArtifact] =
    await Promise.all([
      formatArtifact(JSON.stringify(artifacts.coverage), round4CoverageJsonPath),
      formatArtifact(coverageMarkdown(artifacts.coverage), round4CoverageMarkdownPath),
      formatArtifact(JSON.stringify(artifacts.migration), round4MigrationJsonPath),
      formatArtifact(migrationMarkdown(artifacts.migration), round4MigrationMarkdownPath),
    ]);
  await Promise.all([
    writeFile(round4CoverageJsonPath, coverageJson, "utf8"),
    writeFile(round4CoverageMarkdownPath, coverageMarkdownArtifact, "utf8"),
    writeFile(round4MigrationJsonPath, migrationJson, "utf8"),
    writeFile(round4MigrationMarkdownPath, migrationMarkdownArtifact, "utf8"),
  ]);
  return artifacts;
}
