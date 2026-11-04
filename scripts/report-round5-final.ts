import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { format, resolveConfig } from "prettier";
import {
  curriculumRepository,
  publicContentRepository,
  publicCurriculumRepository,
  type ContentDocument,
  type CurriculumBook,
  type CurriculumChapter,
} from "../packages/content/src/index.ts";
import { extractMathFragments, maskCodeForMath } from "./audit-content.ts";
import { analyzeStyleDocuments, type ContentStyleMetrics } from "./content-style.ts";
import {
  errorMessage,
  loadContentDocuments,
  repositoryRoot,
  type LoadedContentDocument,
} from "./lib/content-files.ts";

const reportLocale = "zh-CN" as const;
const reportDirectory = join(repositoryRoot, "reports", "round-5");
const jsonReportPath = join(reportDirectory, "final-content-metrics.json");
const markdownReportPath = join(reportDirectory, "final-content-metrics.md");

type PublicationStatus = "hidden" | "preview" | "published";
type BookPublicationState = "complete" | "partial" | "unpublished";

interface StatusCounts {
  hidden: number;
  preview: number;
  published: number;
}

interface SemanticCounts {
  Definition: number;
  Theorem: number;
  Lemma: number;
  Proof: number;
  Derivation: number;
  Example: number;
  Exercise: number;
  Solution: number;
}

interface MathFragmentCounts {
  inline: number;
  display: number;
  total: number;
  unclosed: number;
}

interface PublishedDocumentMetrics {
  readonly documentId: string;
  readonly contentId: string;
  readonly chapterId: string;
  readonly bookId: string;
  readonly canonicalPath: string;
  readonly title: string;
  readonly effectiveHanCharacters: number;
  readonly h2: number;
  readonly semanticBlocks: SemanticCounts;
  readonly mathFragments: MathFragmentCounts;
  readonly resourceReferences: number;
  readonly uniqueResourceIds: readonly string[];
  readonly interactiveFigures: number;
  readonly uniqueVisualizationIds: readonly string[];
}

interface BookMetrics {
  readonly registryPosition: number;
  readonly seriesId: string;
  readonly seriesTitle: string;
  readonly bookId: string;
  readonly code: string;
  readonly title: string;
  readonly publicationState: BookPublicationState;
  readonly sourceChapters: number;
  readonly publicChapters: number;
  readonly previewChapters: number;
  readonly hiddenChapters: number;
  readonly remainingUnpublishedChapters: number;
  readonly effectiveHanCharacters: number;
}

const semanticTags = [
  "Definition",
  "Theorem",
  "Lemma",
  "Proof",
  "Derivation",
  "Example",
  "Exercise",
  "Solution",
] as const satisfies readonly (keyof SemanticCounts)[];

function emptyStatusCounts(): StatusCounts {
  return { hidden: 0, preview: 0, published: 0 };
}

function emptySemanticCounts(): SemanticCounts {
  return {
    Definition: 0,
    Theorem: 0,
    Lemma: 0,
    Proof: 0,
    Derivation: 0,
    Example: 0,
    Exercise: 0,
    Solution: 0,
  };
}

function incrementStatus(counts: StatusCounts, status: PublicationStatus): void {
  counts[status] += 1;
}

function addSemanticCounts(target: SemanticCounts, source: SemanticCounts): void {
  for (const tag of semanticTags) target[tag] += source[tag];
}

function countSemanticBlocks(body: string): SemanticCounts {
  const counts = emptySemanticCounts();
  for (const tag of semanticTags) {
    counts[tag] = [...body.matchAll(new RegExp(`<${tag}(?:\\s|/?>)`, "g"))].length;
  }
  return counts;
}

function countH2(body: string): number {
  return [...maskCodeForMath(body).matchAll(/^##(?!#)[ \t]+\S.*$/gm)].length;
}

function componentIds(body: string, component: "ResourceCard" | "InteractiveFigure"): string[] {
  return [...body.matchAll(new RegExp(`<${component}\\b[^>]*\\bid=["']([^"']+)["'][^>]*>`, "g"))]
    .map((match) => match[1])
    .filter((id): id is string => Boolean(id));
}

function countComponent(body: string, component: "ResourceCard" | "InteractiveFigure"): number {
  return [...body.matchAll(new RegExp(`<${component}(?:\\s|/?>)`, "g"))].length;
}

function countMathFragments(body: string): MathFragmentCounts {
  const fragments = extractMathFragments(body);
  const inline = fragments.filter((fragment) => fragment.kind === "inline").length;
  const display = fragments.filter((fragment) => fragment.kind === "display").length;
  return {
    inline,
    display,
    total: fragments.length,
    unclosed: fragments.filter((fragment) => !fragment.closed).length,
  };
}

function localizedText(value: Readonly<Record<string, string>>): string {
  return value[reportLocale] ?? value.en ?? Object.values(value)[0] ?? "";
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

function assertSameIds(
  label: string,
  expected: readonly string[],
  actual: readonly string[],
): void {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = sortedUnique(expected.filter((id) => !actualSet.has(id)));
  const extra = sortedUnique(actual.filter((id) => !expectedSet.has(id)));
  if (missing.length === 0 && extra.length === 0) return;
  throw new Error(
    `${label} mismatch; missing [${missing.join(", ")}], extra [${extra.join(", ")}]`,
  );
}

function styleMetricsByFile(
  documents: readonly LoadedContentDocument[],
  snapshotDate: string,
): ReadonlyMap<string, ContentStyleMetrics> {
  const styleReport = analyzeStyleDocuments(
    documents.map((document) => ({
      file: document.relativePath,
      title: document.frontmatter.title,
      body: document.body,
      bodyStartLine: document.bodyStartLine,
      declaredVisualizations: document.frontmatter.visualizations,
    })),
    undefined,
    [],
    `${snapshotDate}T00:00:00.000Z`,
  );
  return new Map(styleReport.files.map((file) => [file.file, file.metrics] as const));
}

function statusCounts(chapters: readonly CurriculumChapter[]): StatusCounts {
  const counts = emptyStatusCounts();
  for (const chapter of chapters) incrementStatus(counts, chapter.publicationStatus);
  return counts;
}

function documentStatusCounts(documents: readonly LoadedContentDocument[]): StatusCounts {
  const counts = emptyStatusCounts();
  for (const document of documents) incrementStatus(counts, document.frontmatter.publicationStatus);
  return counts;
}

function orderedBooks(): readonly CurriculumBook[] {
  return curriculumRepository
    .listSeries()
    .flatMap((series) => curriculumRepository.listBooks(series.id));
}

function publicationState(sourceChapters: number, publicChapters: number): BookPublicationState {
  if (publicChapters === 0) return "unpublished";
  return publicChapters === sourceChapters ? "complete" : "partial";
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function maxRevisionDate(documents: readonly LoadedContentDocument[]): string {
  return (
    documents
      .flatMap((document) => document.frontmatter.revisionHistory.map((revision) => revision.date))
      .sort(compareStrings)
      .at(-1) ?? "1970-01-01"
  );
}

async function buildReport(): Promise<{
  readonly report: Record<string, unknown>;
  readonly markdown: string;
}> {
  const loaded = await loadContentDocuments();
  if (loaded.diagnostics.length > 0) {
    throw new Error(
      `Cannot report invalid content:\n${loaded.diagnostics
        .map((diagnostic) => `- ${diagnostic.file}: ${diagnostic.message}`)
        .join("\n")}`,
    );
  }

  const sourceDocuments = loaded.documents.filter((document) => document.locale === reportLocale);
  const sourcePublishedDocuments = sourceDocuments.filter(
    (document) => document.frontmatter.publicationStatus === "published",
  );
  const publicDocuments = await publicContentRepository.listDocuments({ locale: reportLocale });
  const sourceChapters = curriculumRepository.listChapters();
  const publicChapters = publicCurriculumRepository.listChapters();

  assertSameIds(
    "published source/public repository documents",
    sourcePublishedDocuments.map((document) => document.documentId),
    publicDocuments.map((document) => document.documentId),
  );
  assertSameIds(
    "published source/public curriculum chapters",
    sourceChapters
      .filter((chapter) => chapter.publicationStatus === "published")
      .map((chapter) => chapter.id),
    publicChapters.map((chapter) => chapter.id),
  );

  const sourceByDocumentId = new Map(
    sourcePublishedDocuments.map((document) => [document.documentId, document] as const),
  );
  for (const publicDocument of publicDocuments) {
    const source = sourceByDocumentId.get(publicDocument.documentId);
    if (!source || source.hash !== publicDocument.hash) {
      throw new Error(
        `${publicDocument.documentId}: generated public document is stale; run pnpm generate:content`,
      );
    }
  }
  for (const chapter of publicChapters) {
    if (!chapter.contentId) throw new Error(`${chapter.id}: published chapter has no contentId`);
    const document = sourcePublishedDocuments.find(
      (candidate) => candidate.frontmatter.id === chapter.contentId,
    );
    if (!document) throw new Error(`${chapter.id}: published chapter has no published source body`);
  }

  const snapshotDate = maxRevisionDate(sourceDocuments);
  const stylesByFile = styleMetricsByFile(sourcePublishedDocuments, snapshotDate);
  const publishedDocumentMetrics: PublishedDocumentMetrics[] = publicDocuments
    .map((publicDocument: ContentDocument): PublishedDocumentMetrics => {
      const source = sourceByDocumentId.get(publicDocument.documentId);
      if (!source) throw new Error(`${publicDocument.documentId}: source body is missing`);
      const style = stylesByFile.get(source.relativePath);
      if (!style) throw new Error(`${source.relativePath}: content-style metrics are missing`);
      const chapter = publicCurriculumRepository.getChapterForContent(source.frontmatter.id);
      if (!chapter) throw new Error(`${source.relativePath}: public curriculum binding is missing`);
      const context = publicCurriculumRepository.getChapterContext(chapter.id, source.locale);
      if (!context) throw new Error(`${chapter.id}: public canonical context is missing`);
      const resourceIds = componentIds(source.body, "ResourceCard");
      const visualizationIds = componentIds(source.body, "InteractiveFigure");
      return {
        documentId: source.documentId,
        contentId: source.frontmatter.id,
        chapterId: chapter.id,
        bookId: chapter.bookId,
        canonicalPath: context.canonicalPath,
        title: source.frontmatter.title,
        effectiveHanCharacters: style.hanCharacters,
        h2: countH2(source.body),
        semanticBlocks: countSemanticBlocks(source.body),
        mathFragments: countMathFragments(source.body),
        resourceReferences: countComponent(source.body, "ResourceCard"),
        uniqueResourceIds: sortedUnique(resourceIds),
        interactiveFigures: countComponent(source.body, "InteractiveFigure"),
        uniqueVisualizationIds: sortedUnique(visualizationIds),
      };
    })
    .sort((left, right) => left.canonicalPath.localeCompare(right.canonicalPath, "en"));

  const documentMetricsByBook = new Map<string, PublishedDocumentMetrics[]>();
  for (const document of publishedDocumentMetrics) {
    documentMetricsByBook.set(document.bookId, [
      ...(documentMetricsByBook.get(document.bookId) ?? []),
      document,
    ]);
  }

  const books: BookMetrics[] = orderedBooks().map((book, index) => {
    const series = curriculumRepository.getSeries(book.seriesId);
    if (!series) throw new Error(`${book.id}: source series is missing`);
    const chapters = curriculumRepository.listChapters(book.id);
    const counts = statusCounts(chapters);
    const published = publicCurriculumRepository.listChapters(book.id).length;
    return {
      registryPosition: index + 1,
      seriesId: series.id,
      seriesTitle: localizedText(series.title),
      bookId: book.id,
      code: book.code,
      title: localizedText(book.title),
      publicationState: publicationState(chapters.length, published),
      sourceChapters: chapters.length,
      publicChapters: published,
      previewChapters: counts.preview,
      hiddenChapters: counts.hidden,
      remainingUnpublishedChapters: chapters.length - published,
      effectiveHanCharacters: sum(
        (documentMetricsByBook.get(book.id) ?? []).map(
          (document) => document.effectiveHanCharacters,
        ),
      ),
    };
  });

  const chapterStatuses = statusCounts(sourceChapters);
  const sourceDocumentStatuses = documentStatusCounts(sourceDocuments);
  const remainingUnpublishedChapters = sourceChapters.length - publicChapters.length;
  if (remainingUnpublishedChapters !== chapterStatuses.preview + chapterStatuses.hidden) {
    throw new Error("Chapter publication counts do not reconcile");
  }

  const totalsSemantic = emptySemanticCounts();
  for (const document of publishedDocumentMetrics) {
    addSemanticCounts(totalsSemantic, document.semanticBlocks);
  }
  const allResourceIds = sortedUnique(
    publishedDocumentMetrics.flatMap((document) => document.uniqueResourceIds),
  );
  const allVisualizationIds = sortedUnique(
    publishedDocumentMetrics.flatMap((document) => document.uniqueVisualizationIds),
  );
  const publishedTotals = {
    effectiveHanCharacters: sum(
      publishedDocumentMetrics.map((document) => document.effectiveHanCharacters),
    ),
    h2: sum(publishedDocumentMetrics.map((document) => document.h2)),
    semanticBlocks: totalsSemantic,
    mathFragments: {
      inline: sum(publishedDocumentMetrics.map((document) => document.mathFragments.inline)),
      display: sum(publishedDocumentMetrics.map((document) => document.mathFragments.display)),
      total: sum(publishedDocumentMetrics.map((document) => document.mathFragments.total)),
      unclosed: sum(publishedDocumentMetrics.map((document) => document.mathFragments.unclosed)),
    },
    resourceReferences: sum(
      publishedDocumentMetrics.map((document) => document.resourceReferences),
    ),
    uniqueResources: allResourceIds.length,
    resourceIds: allResourceIds,
    interactiveFigures: sum(
      publishedDocumentMetrics.map((document) => document.interactiveFigures),
    ),
    uniqueInteractiveFigures: allVisualizationIds.length,
    visualizationIds: allVisualizationIds,
  };

  const remainingBooks = books.filter((book) => book.remainingUnpublishedChapters > 0);
  const nextBookSequence = remainingBooks.map((book, index) => ({
    sequence: index + 1,
    registryPosition: book.registryPosition,
    seriesId: book.seriesId,
    bookId: book.bookId,
    code: book.code,
    title: book.title,
    currentState: book.publicationState,
    publicChapters: book.publicChapters,
    remainingChapters: book.remainingUnpublishedChapters,
  }));
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        documents: sourceDocuments.map((document) => ({
          documentId: document.documentId,
          hash: document.hash,
          publicationStatus: document.frontmatter.publicationStatus,
        })),
        chapters: sourceChapters.map((chapter) => ({
          id: chapter.id,
          contentId: chapter.contentId ?? null,
          publicationStatus: chapter.publicationStatus,
        })),
      }),
      "utf8",
    )
    .digest("hex");

  const report = {
    schemaVersion: 1,
    round: 5,
    locale: reportLocale,
    snapshotDate,
    sourceFingerprint: fingerprint,
    definitions: {
      sourceChapter:
        "A Chapter in the complete editorial curriculum, regardless of publication status or body availability.",
      publicChapter:
        "A Chapter physically present in publicCurriculumRepository; the script verifies that every one is published and has a matching published source body.",
      effectiveHanCharacters:
        "Han characters in MDX narrative after the content-style narrative mask removes code, math, comments, JSX tags and Markdown syntax.",
      h2: "Exact level-two Markdown headings (##, excluding ###) after fenced and inline code are masked.",
      semanticBlocks:
        "Opening MDX component occurrences for Definition, Theorem, Lemma, Proof, Derivation, Example, Exercise and Solution.",
      mathFragments:
        "Inline $...$ and display $$...$$ fragments returned by extractMathFragments; unclosed fragments are reported separately.",
      resources:
        "Resource references are ResourceCard component occurrences; unique resources are distinct ResourceCard id values.",
      interactiveFigures:
        "InteractiveFigure is the number of component occurrences; unique IDs are reported separately.",
      completeBook:
        "Every registered Chapter in the Book is present in publicCurriculumRepository.",
      partialBook:
        "At least one, but not every, registered Chapter in the Book is present in publicCurriculumRepository.",
      nextBookSequence:
        "All Books with unpublished Chapters, in the source Registry series/book order; the first entry is the next whole-book production target.",
    },
    counts: {
      chapters: {
        source: sourceChapters.length,
        public: publicChapters.length,
        preview: chapterStatuses.preview,
        hidden: chapterStatuses.hidden,
        remainingUnpublished: remainingUnpublishedChapters,
      },
      sourceDocuments: {
        total: sourceDocuments.length,
        published: sourceDocumentStatuses.published,
        preview: sourceDocumentStatuses.preview,
        hidden: sourceDocumentStatuses.hidden,
      },
      books: {
        source: books.length,
        public: books.filter((book) => book.publicChapters > 0).length,
        complete: books.filter((book) => book.publicationState === "complete").length,
        partial: books.filter((book) => book.publicationState === "partial").length,
        unpublished: books.filter((book) => book.publicationState === "unpublished").length,
      },
    },
    publishedTotals,
    books,
    publishedDocuments: publishedDocumentMetrics,
    nextBook: nextBookSequence[0] ?? null,
    nextBookSequence,
  };

  const markdown = `# One Forth 第五轮最终内容指标\n\n> 快照日期 ${snapshotDate}；locale 为 \`${reportLocale}\`。本报告只把 \`publicCurriculumRepository\` 和 \`publicContentRepository\` 中物理存在的记录计为公开内容，并校验它们与源 MDX 哈希一致。\n\n## 总览\n\n| 指标 | 数量 |\n| --- | ---: |\n| 源章节 | ${sourceChapters.length} |\n| 公开章节 | ${publicChapters.length} |\n| Preview 章节 | ${chapterStatuses.preview} |\n| Hidden 章节 | ${chapterStatuses.hidden} |\n| 剩余未发布章节 | ${remainingUnpublishedChapters} |\n| 完整 / 部分 / 未公开教材 | ${books.filter((book) => book.publicationState === "complete").length} / ${books.filter((book) => book.publicationState === "partial").length} / ${books.filter((book) => book.publicationState === "unpublished").length} |\n| 公开正文有效汉字 | ${publishedTotals.effectiveHanCharacters} |\n| H2 | ${publishedTotals.h2} |\n| 公式片段（行内 / 展示 / 合计） | ${publishedTotals.mathFragments.inline} / ${publishedTotals.mathFragments.display} / ${publishedTotals.mathFragments.total} |\n| 资源引用 / 唯一资源 | ${publishedTotals.resourceReferences} / ${publishedTotals.uniqueResources} |\n| InteractiveFigure / 唯一 ID | ${publishedTotals.interactiveFigures} / ${publishedTotals.uniqueInteractiveFigures} |\n\n## 语义块\n\n| Definition | Theorem | Lemma | Proof | Derivation | Example | Exercise | Solution |\n| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n| ${semanticTags.map((tag) => publishedTotals.semanticBlocks[tag]).join(" | ")} |\n\n## 每册公开量\n\n| 顺序 | 系列 | 教材 | 状态 | 源章节 | 公开 | Preview | Hidden | 剩余 | 有效汉字 |\n| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${books.map((book) => `| ${book.registryPosition} | ${markdownCell(book.seriesTitle)} | ${book.code} ${markdownCell(book.title)} | ${book.publicationState} | ${book.sourceChapters} | ${book.publicChapters} | ${book.previewChapters} | ${book.hiddenChapters} | ${book.remainingUnpublishedChapters} | ${book.effectiveHanCharacters} |`).join("\n")}\n\n## 已公开正文\n\n| 教材 | 章节 | 正文 | 有效汉字 | H2 | 公式 | 资源 | Figure |\n| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |\n${publishedDocumentMetrics.map((document) => `| ${document.bookId} | ${document.chapterId} | ${markdownCell(document.title)} | ${document.effectiveHanCharacters} | ${document.h2} | ${document.mathFragments.total} | ${document.resourceReferences} | ${document.interactiveFigures} |`).join("\n")}\n\n## 下一册顺序\n\n> 这里按 Registry 的系列/教材顺序列出仍有未发布章节的教材；第一项是下一册整册生产目标。代表性章节提前公开不会改变顺序。\n\n| 顺序 | Registry 位置 | 教材 | 当前状态 | 已公开 | 剩余 |\n| ---: | ---: | --- | --- | ---: | ---: |\n${nextBookSequence.map((book) => `| ${book.sequence} | ${book.registryPosition} | ${book.code} ${markdownCell(book.title)} | ${book.currentState} | ${book.publicChapters} | ${book.remainingChapters} |`).join("\n")}\n\n## 指标口径\n\n- **源章节**：完整编辑 Registry 中的 Chapter，不论公开状态或是否已有正文；**公开章节**：published-only 仓库中物理存在的 Chapter。脚本要求公开仓库 ID、源 \`publicationStatus: published\` 和正文哈希三者一致。\n- **有效汉字**：复用 content-style 的 narrative mask，排除代码、公式、注释、JSX 标签和 Markdown 标记。它是可复核的正文规模指标，不是机械字数目标。\n- **H2**：代码掩码后只统计 Markdown 二级标题 \`##\`，不把 \`###\` 计入。\n- **语义块**：只统计正文中显式的 \`Definition/Theorem/Lemma/Proof/Derivation/Example/Exercise/Solution\` 组件起始标签。\n- **公式片段**：复用 \`extractMathFragments\`，分别统计 \`$…$\` 与 \`$$…$$\`；未闭合片段另存于 JSON 的 \`unclosed\`。\n- **资源**：引用数是 \`ResourceCard\` 出现次数，唯一资源数是去重后的 \`id\`；**InteractiveFigure** 同理统计组件出现次数并另列唯一 ID。\n- **完整教材**：该册所有源章节均已进入 published-only 仓库；**部分教材**：至少一章公开但未整册公开。\n- **下一册顺序**：排除完整教材后保持 Registry 系列/教材顺序；JSON 保存完整顺序和首个 \`nextBook\`。\n- \`snapshotDate\` 取源正文 revision history 的最大日期，\`sourceFingerprint\` 对正文哈希、章节绑定和公开状态做 SHA-256；内容不变时报告稳定。\n`;

  return { report, markdown };
}

async function main(): Promise<void> {
  const { report, markdown } = await buildReport();
  const prettierConfig = (await resolveConfig(join(repositoryRoot, "package.json"))) ?? {};
  const [jsonSource, markdownSource] = await Promise.all([
    format(json(report), { ...prettierConfig, parser: "json" }),
    format(markdown, { ...prettierConfig, parser: "markdown" }),
  ]);
  await mkdir(reportDirectory, { recursive: true });
  await Promise.all([
    writeFile(jsonReportPath, jsonSource, "utf8"),
    writeFile(markdownReportPath, markdownSource, "utf8"),
  ]);
  const counts = report.counts as {
    readonly chapters: { readonly source: number; readonly public: number };
    readonly books: { readonly complete: number; readonly partial: number };
  };
  process.stdout.write(
    `Round-5 final metrics: ${counts.chapters.public}/${counts.chapters.source} public chapters; ${counts.books.complete} complete and ${counts.books.partial} partial Books.\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`report:round5-final: ${errorMessage(error)}\n`);
  process.exitCode = 1;
});
