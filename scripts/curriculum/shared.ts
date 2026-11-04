import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { format, resolveConfig } from "prettier";
import { conceptCatalog } from "../../packages/content/src/concepts.ts";
import {
  curriculumData,
  curriculumVisualizationBindings,
} from "../../packages/content/src/curriculum/data/index.ts";
import { InMemoryCurriculumRepository } from "../../packages/content/src/curriculum/repository.ts";
import type {
  CurriculumBook,
  CurriculumChapter,
  CurriculumDataset,
} from "../../packages/content/src/curriculum/types.ts";
import { curriculumSchemaVersion } from "../../packages/content/src/curriculum/types.ts";
import {
  editorialStatusValues,
  publicationStatusValues,
} from "../../packages/content/src/maturity.ts";
import type { LoadedContentDocument } from "../lib/content-files.ts";
import { repositoryRoot } from "../lib/content-files.ts";
import { collectAuthoredAnchors, validateCanonicalAnchorTarget } from "../lib/anchor-validation.ts";
import { visualizationManifest } from "../../packages/visualization/src/index.ts";

export const curriculumGeneratedRoot = join(repositoryRoot, "content", "curriculum", "generated");
export const curriculumSnapshotPath = join(curriculumGeneratedRoot, "curriculum.json");
export const curriculumCoverageJsonPath = join(curriculumGeneratedRoot, "coverage.json");
export const curriculumCoverageMarkdownPath = join(curriculumGeneratedRoot, "coverage.md");

export const curriculumRepository = new InMemoryCurriculumRepository(
  curriculumData,
  conceptCatalog,
);

export interface CurriculumStats {
  readonly schemaVersion: number;
  readonly series: number;
  readonly books: number;
  readonly parts: number;
  readonly chapters: number;
  readonly mappedDocuments: number;
  readonly concepts: number;
  readonly locatedConcepts: number;
  readonly visualizationsReferenced: number;
  readonly visualizationBindings: number;
  readonly visualizationManifestEntries: number;
  readonly bySeries: readonly {
    readonly id: string;
    readonly books: number;
    readonly parts: number;
    readonly chapters: number;
  }[];
}

export function collectCurriculumStats(
  dataset: CurriculumDataset = curriculumData,
): CurriculumStats {
  const visualizationIds = new Set(
    dataset.chapters.flatMap((chapter) => [...chapter.visualizationIds]),
  );
  return {
    schemaVersion: dataset.schemaVersion,
    series: dataset.series.length,
    books: dataset.books.length,
    parts: dataset.parts.length,
    chapters: dataset.chapters.length,
    mappedDocuments: dataset.chapters.filter((chapter) => chapter.contentId).length,
    concepts: conceptCatalog.length,
    locatedConcepts: conceptCatalog.filter((concept) =>
      Boolean(curriculumRepository.getChapter(concept.canonicalLocation.chapterId)),
    ).length,
    visualizationsReferenced: visualizationIds.size,
    visualizationBindings: curriculumVisualizationBindings.length,
    visualizationManifestEntries: visualizationManifest.length,
    bySeries: dataset.series.map((series) => {
      const books = dataset.books.filter((book) => book.seriesId === series.id);
      const bookIds = new Set(books.map((book) => book.id));
      return {
        id: series.id,
        books: books.length,
        parts: dataset.parts.filter((part) => bookIds.has(part.bookId)).length,
        chapters: dataset.chapters.filter((chapter) => bookIds.has(chapter.bookId)).length,
      };
    }),
  };
}

function nonEmpty(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function duplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function cycleNodes(
  ids: readonly string[],
  dependencies: (id: string) => readonly string[],
): readonly string[] {
  const state = new Map<string, "visiting" | "complete">();
  const cyclic = new Set<string>();
  const visit = (id: string): void => {
    if (state.get(id) === "visiting") {
      cyclic.add(id);
      return;
    }
    if (state.get(id) === "complete") return;
    state.set(id, "visiting");
    dependencies(id).forEach(visit);
    state.set(id, "complete");
  };
  ids.forEach(visit);
  return [...cyclic].sort();
}

function validateBook(book: CurriculumBook, errors: string[]): void {
  const parts = curriculumRepository.listParts(book.id);
  const chapters = curriculumRepository.listChapters(book.id);
  if (parts.length < 3 || parts.length > 8) {
    errors.push(`${book.id}: expected 3-8 Parts, received ${parts.length}`);
  }
  if (chapters.length === 0) errors.push(`${book.id}: has no Chapters`);
  if (!nonEmpty(book.introduction["zh-CN"])) errors.push(`${book.id}: missing introduction`);
  if (!nonEmpty(book.audience["zh-CN"])) errors.push(`${book.id}: missing audience`);
  if (book.symbolConventions.length === 0) errors.push(`${book.id}: missing symbol conventions`);
  if (book.integratedExercisePlan.length === 0) {
    errors.push(`${book.id}: missing integrated exercise plan`);
  }
  if (book.referencePlan.length === 0) errors.push(`${book.id}: missing reference plan`);
  if (chapters[0]?.id !== book.startChapterId) {
    errors.push(`${book.id}: startChapterId is not the first derived Chapter`);
  }
  if (chapters.at(-1)?.id !== book.reviewChapterId) {
    errors.push(`${book.id}: reviewChapterId is not the last derived Chapter`);
  }
}

function validateChapter(chapter: CurriculumChapter, errors: string[]): void {
  const title = chapter.title["zh-CN"];
  if (!nonEmpty(title)) errors.push(`${chapter.id}: missing title`);
  if (!nonEmpty(chapter.summary["zh-CN"]) || !chapter.summary["zh-CN"].includes(title)) {
    errors.push(`${chapter.id}: summary is empty or not topic-specific`);
  }
  if (chapter.learningObjectives.length < 3) {
    errors.push(`${chapter.id}: expected at least 3 learning objectives`);
  }
  if (chapter.plannedSections.length < 3) {
    errors.push(`${chapter.id}: expected at least 3 planned sections`);
  }
  const genericTitles = new Set([
    "引言",
    "导论",
    "概述",
    "基本概念",
    "基础知识",
    "核心概念",
    "主要内容",
    "重点难点",
    "例题",
    "练习",
    "应用",
    "总结",
    "小结",
    "复习",
    "扩展阅读",
  ]);
  const legacyGenericFrame = new Set([
    `${title}：研究对象、记号与问题设定`,
    `${title}：关键结构、命题与推导`,
    `${title}：例题、反例与适用边界`,
  ]);
  const sectionTitles = new Set<string>();
  for (const section of chapter.plannedSections) {
    const sectionTitle = section.title["zh-CN"].trim();
    if (!nonEmpty(sectionTitle)) {
      errors.push(`${chapter.id}/${section.id}: missing section title`);
    } else if (genericTitles.has(sectionTitle) || legacyGenericFrame.has(sectionTitle)) {
      errors.push(`${chapter.id}/${section.id}: section title uses a generic frame`);
    } else if (
      sectionTitle.includes("综合复习") ||
      /复习的(?:对象|定义|条件|判据|联系|问题设定|主要关系)/u.test(sectionTitle)
    ) {
      errors.push(`${chapter.id}/${section.id}: review label leaked into the topic outline`);
    }
    if (sectionTitles.has(sectionTitle)) {
      errors.push(`${chapter.id}/${section.id}: duplicate section title within Chapter`);
    }
    sectionTitles.add(sectionTitle);
    if (!nonEmpty(section.summary["zh-CN"])) {
      errors.push(`${chapter.id}/${section.id}: missing section summary`);
    }
  }
  if (chapter.keyTerms.length === 0 || chapter.keyTerms.some((term) => !nonEmpty(term))) {
    errors.push(`${chapter.id}: missing key terms`);
  }
  const plans = [
    ["definitions", chapter.plannedDefinitions],
    ["equations", chapter.plannedEquations],
    ["examples", chapter.plannedExamples],
    ["exercises", chapter.plannedExercises],
  ] as const;
  for (const [label, items] of plans) {
    if (items.length === 0) errors.push(`${chapter.id}: missing planned ${label}`);
    for (const item of items) {
      if (!nonEmpty(item.title["zh-CN"]) || !nonEmpty(item.purpose["zh-CN"])) {
        errors.push(`${chapter.id}/${item.id}: incomplete planned ${label} item`);
      }
    }
  }
  const primaryPlanTitles = [
    ["definition", chapter.plannedDefinitions[0]?.title["zh-CN"], [...sectionTitles][0]],
    ["equation", chapter.plannedEquations[0]?.title["zh-CN"], [...sectionTitles][1]],
    ["example", chapter.plannedExamples[0]?.title["zh-CN"], [...sectionTitles][2]],
    [
      "exercise",
      chapter.plannedExercises[0]?.title["zh-CN"],
      title.includes("复习") ? chapter.keyTerms[0] : title,
    ],
  ] as const;
  for (const [label, planTitle, expectedTopic] of primaryPlanTitles) {
    if (planTitle && expectedTopic && !planTitle.includes(expectedTopic)) {
      errors.push(`${chapter.id}: primary planned ${label} title is not topic-specific`);
    }
  }
  if (
    title.includes("复习") &&
    plans.some(([, items]) => items.some((item) => item.title["zh-CN"].includes("复习")))
  ) {
    errors.push(`${chapter.id}: review label leaked into a planned item title`);
  }
  const localizedValues = [
    title,
    chapter.summary["zh-CN"],
    ...chapter.learningObjectives.map((objective) => objective["zh-CN"]),
    ...chapter.plannedSections.flatMap((section) => [
      section.title["zh-CN"],
      section.summary["zh-CN"],
    ]),
    ...plans.flatMap(([, items]) =>
      items.flatMap((item) => [item.title["zh-CN"], item.purpose["zh-CN"]]),
    ),
  ];
  if (
    localizedValues.some(
      (value) =>
        value.includes("\uFFFD") || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value),
    )
  ) {
    errors.push(`${chapter.id}: localized plan contains malformed Unicode or control characters`);
  }
  if (chapter.estimatedMinutes <= 0) errors.push(`${chapter.id}: invalid estimatedMinutes`);
  if (!Array.isArray(chapter.visualizationIds)) {
    errors.push(`${chapter.id}: visualizationIds must be an array`);
  }
}

export function validateCurriculum(documents: readonly LoadedContentDocument[]): readonly string[] {
  const errors: string[] = [];
  const expectedSeries = [
    ["mathematics", 17],
    ["physics", 13],
    ["computer-science", 7],
    ["artificial-intelligence", 15],
  ] as const;
  const allNodes = [
    ...curriculumData.series,
    ...curriculumData.books,
    ...curriculumData.parts,
    ...curriculumData.chapters,
  ];

  if (curriculumData.schemaVersion !== curriculumSchemaVersion) {
    errors.push(`curriculum schemaVersion must be ${curriculumSchemaVersion}`);
  }
  if (curriculumData.series.length !== 4) errors.push("expected exactly 4 Series");
  if (curriculumData.books.length !== 52) errors.push("expected exactly 52 Books");
  if (curriculumData.parts.length < 156) errors.push("expected at least 156 Parts");
  if (curriculumData.chapters.length < 312) errors.push("expected at least 312 Chapters");

  for (const [seriesId, expectedBooks] of expectedSeries) {
    if (curriculumRepository.listBooks(seriesId).length !== expectedBooks) {
      errors.push(`${seriesId}: expected ${expectedBooks} Books`);
    }
  }
  for (const id of duplicates(allNodes.map((node) => node.id))) {
    errors.push(`${id}: duplicate curriculum node ID`);
  }
  for (const node of allNodes) {
    if (node.schemaVersion !== curriculumSchemaVersion) {
      errors.push(`${node.id}: schemaVersion must be ${curriculumSchemaVersion}`);
    }
    if (!nonEmpty(node.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(node.slug)) {
      errors.push(`${node.id}: invalid slug`);
    }
    if (!nonEmpty(node.title["zh-CN"]) || !nonEmpty(node.summary["zh-CN"])) {
      errors.push(`${node.id}: missing localized title or summary`);
    }
  }

  curriculumData.books.forEach((book) => validateBook(book, errors));
  curriculumData.chapters.forEach((chapter) => validateChapter(chapter, errors));
  duplicates(
    curriculumData.chapters.map((chapter) =>
      chapter.plannedSections.map((section) => section.title["zh-CN"].trim()).join("\u241f"),
    ),
  ).forEach((outline) => errors.push(`duplicate Chapter outline: ${outline}`));
  duplicates(
    curriculumData.chapters.flatMap((chapter) =>
      chapter.plannedSections.map((section) => section.title["zh-CN"].trim()),
    ),
  ).forEach((title) => errors.push(`duplicate planned section title: ${title}`));

  const bookIds = new Set(curriculumData.books.map((book) => book.id));
  const partIds = new Set(curriculumData.parts.map((part) => part.id));
  const chapterIds = new Set(curriculumData.chapters.map((chapter) => chapter.id));
  for (const series of curriculumData.series) {
    series.bookIds.forEach((id) => {
      if (!bookIds.has(id)) errors.push(`${series.id}: unknown Book ${id}`);
    });
  }
  for (const book of curriculumData.books) {
    if (!curriculumRepository.getSeries(book.seriesId)) {
      errors.push(`${book.id}: unknown Series ${book.seriesId}`);
    }
    book.partIds.forEach((id) => {
      if (!partIds.has(id)) errors.push(`${book.id}: unknown Part ${id}`);
    });
    [...book.prerequisiteBookIds, ...book.relatedBookIds].forEach((id) => {
      if (!bookIds.has(id)) errors.push(`${book.id}: unknown related/prerequisite Book ${id}`);
    });
  }
  for (const part of curriculumData.parts) {
    if (!bookIds.has(part.bookId)) errors.push(`${part.id}: unknown Book ${part.bookId}`);
    part.chapterIds.forEach((id) => {
      if (!chapterIds.has(id)) errors.push(`${part.id}: unknown Chapter ${id}`);
    });
  }
  for (const chapter of curriculumData.chapters) {
    if (!bookIds.has(chapter.bookId)) errors.push(`${chapter.id}: unknown Book ${chapter.bookId}`);
    if (!partIds.has(chapter.partId)) errors.push(`${chapter.id}: unknown Part ${chapter.partId}`);
    if (!publicationStatusValues.includes(chapter.publicationStatus)) {
      errors.push(`${chapter.id}: invalid publicationStatus ${String(chapter.publicationStatus)}`);
    }
    if (!editorialStatusValues.includes(chapter.editorialStatus)) {
      errors.push(`${chapter.id}: invalid editorialStatus ${String(chapter.editorialStatus)}`);
    }
    chapter.prerequisiteChapterIds.forEach((id) => {
      if (!chapterIds.has(id)) errors.push(`${chapter.id}: unknown prerequisite Chapter ${id}`);
    });
    const context = curriculumRepository.getChapterContext(chapter.id, "zh-CN");
    if (!context) {
      errors.push(`${chapter.id}: cannot derive Chapter context`);
    } else if (
      !/^\/zh-CN\/books\/[^/]+\/[^/]+\/[^/]+$/u.test(context.canonicalPath) ||
      context.canonicalPath.includes(`/${context.part.slug}/`)
    ) {
      errors.push(`${chapter.id}: invalid canonical Chapter route ${context.canonicalPath}`);
    }
  }

  cycleNodes(
    [...bookIds],
    (id) => curriculumRepository.getBook(id)?.prerequisiteBookIds ?? [],
  ).forEach((id) => errors.push(`${id}: Book prerequisite cycle`));
  cycleNodes(
    [...chapterIds],
    (id) => curriculumRepository.getChapter(id)?.prerequisiteChapterIds ?? [],
  ).forEach((id) => errors.push(`${id}: Chapter prerequisite cycle`));

  const documentIds = documents.map((document) => document.frontmatter.id);
  duplicates(documentIds).forEach((id) => errors.push(`${id}: duplicate MDX content ID`));
  const curriculumContentIds = curriculumData.chapters.flatMap((chapter) =>
    chapter.contentId ? [chapter.contentId] : [],
  );
  duplicates(curriculumContentIds).forEach((id) =>
    errors.push(`${id}: mapped by more than one Chapter`),
  );
  for (const document of documents) {
    const chapter = curriculumRepository.getChapterForContent(document.frontmatter.id);
    if (!chapter) {
      errors.push(`${document.frontmatter.id}: MDX document has no curriculum Chapter`);
    } else if (
      chapter.publicationStatus !== document.frontmatter.publicationStatus ||
      chapter.editorialStatus !== document.frontmatter.editorialStatus
    ) {
      errors.push(
        `${document.frontmatter.id}: Chapter publication/editorial state ${chapter.publicationStatus}/${chapter.editorialStatus} does not match MDX ${document.frontmatter.publicationStatus}/${document.frontmatter.editorialStatus}`,
      );
    }
  }
  for (const contentId of curriculumContentIds) {
    if (!documentIds.includes(contentId))
      errors.push(`${contentId}: mapped content does not exist`);
  }

  const visualizationManifestIds = new Set(visualizationManifest.map((entry) => entry.id));
  const visualizationSources = new Map<
    string,
    { readonly contentId: string; readonly chapterId: string }[]
  >();
  for (const document of documents) {
    const chapter = curriculumRepository.getChapterForContent(document.frontmatter.id);
    const authoredVisualizationIds = [...document.frontmatter.visualizations].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
    duplicates(document.frontmatter.visualizations).forEach((visualizationId) =>
      errors.push(`${document.frontmatter.id}: duplicate visualization ${visualizationId}`),
    );
    for (const visualizationId of authoredVisualizationIds) {
      if (!visualizationManifestIds.has(visualizationId)) {
        errors.push(`${document.frontmatter.id}: unknown visualization ${visualizationId}`);
      }
      if (chapter) {
        const sources = visualizationSources.get(visualizationId) ?? [];
        sources.push({ contentId: document.frontmatter.id, chapterId: chapter.id });
        visualizationSources.set(visualizationId, sources);
      }
    }
    if (chapter) {
      const boundVisualizationIds = [...chapter.visualizationIds].sort((left, right) =>
        left.localeCompare(right, "en"),
      );
      if (boundVisualizationIds.join("\u241f") !== authoredVisualizationIds.join("\u241f")) {
        errors.push(
          `${document.frontmatter.id}: Chapter visualizationIds do not match MDX frontmatter`,
        );
      }
    }
  }

  for (const visualizationId of visualizationManifestIds) {
    if (!visualizationSources.has(visualizationId)) {
      errors.push(`${visualizationId}: manifest visualization has no authored Chapter reference`);
    }
  }
  duplicates(curriculumVisualizationBindings.map((binding) => binding.visualizationId)).forEach(
    (visualizationId) => errors.push(`${visualizationId}: duplicate curriculum binding`),
  );
  for (const binding of curriculumVisualizationBindings) {
    if (!visualizationManifestIds.has(binding.visualizationId)) {
      errors.push(`${binding.visualizationId}: curriculum binding is absent from manifest`);
    }
    const expectedSources = [...(visualizationSources.get(binding.visualizationId) ?? [])].sort(
      (left, right) => left.contentId.localeCompare(right.contentId, "en"),
    );
    const expectedContentIds = expectedSources.map((source) => source.contentId);
    const expectedChapterIds = expectedSources.map((source) => source.chapterId);
    if (binding.contentIds.join("\u241f") !== expectedContentIds.join("\u241f")) {
      errors.push(`${binding.visualizationId}: binding content provenance does not match MDX`);
    }
    if (binding.chapterIds.join("\u241f") !== expectedChapterIds.join("\u241f")) {
      errors.push(`${binding.visualizationId}: binding Chapters do not match MDX ownership`);
    }
    if (!expectedContentIds.includes(binding.primaryContentId)) {
      errors.push(`${binding.visualizationId}: primary content is not an authored reference`);
    }
    const primaryChapter = curriculumRepository.getPrimaryChapterForVisualization(
      binding.visualizationId,
    );
    if (!primaryChapter || primaryChapter.id !== binding.primaryChapterId) {
      errors.push(`${binding.visualizationId}: primary Chapter cannot be resolved`);
    } else {
      if (primaryChapter.contentId !== binding.primaryContentId) {
        errors.push(`${binding.visualizationId}: primary Chapter/content provenance mismatch`);
      }
      if (!primaryChapter.visualizationIds.includes(binding.visualizationId)) {
        errors.push(
          `${binding.visualizationId}: primary Chapter lacks visualization reverse index`,
        );
      }
      const context = curriculumRepository.getChapterContext(primaryChapter.id, "zh-CN");
      if (!context || !context.canonicalPath.startsWith("/zh-CN/books/")) {
        errors.push(`${binding.visualizationId}: primary Chapter lacks canonical books URL`);
      }
    }
  }
  for (const visualizationId of visualizationSources.keys()) {
    if (!curriculumRepository.getVisualizationBinding(visualizationId)) {
      errors.push(`${visualizationId}: authored visualization has no curriculum binding`);
    }
  }
  if (curriculumVisualizationBindings.length !== visualizationManifest.length) {
    errors.push(
      `expected ${visualizationManifest.length} visualization bindings, received ${curriculumVisualizationBindings.length}`,
    );
  }

  const authoredAnchorsByContentId = new Map(
    documents.map((document) => [
      document.frontmatter.id,
      collectAuthoredAnchors(document.body, document.documentId).anchors,
    ]),
  );
  for (const concept of conceptCatalog) {
    if (concept.schemaVersion !== 2) errors.push(`${concept.id}: concept schemaVersion must be 2`);
    const chapter = curriculumRepository.getChapter(concept.canonicalLocation.chapterId);
    if (!chapter) {
      errors.push(`${concept.id}: canonical Chapter does not exist`);
      continue;
    }
    if (!chapter.conceptIds.includes(concept.id)) {
      errors.push(`${concept.id}: missing from Chapter reverse concept index`);
    }
    const authoredAnchors = chapter.contentId
      ? authoredAnchorsByContentId.get(chapter.contentId)
      : undefined;
    const targetError = validateCanonicalAnchorTarget({
      conceptId: concept.id,
      chapterId: chapter.id,
      chapterConceptIds: chapter.conceptIds,
      ...(concept.canonicalLocation.anchorId
        ? { anchorId: concept.canonicalLocation.anchorId }
        : {}),
      ...(chapter.contentId ? { chapterContentId: chapter.contentId } : {}),
      ...(authoredAnchors ? { authoredAnchors } : {}),
    });
    if (targetError) errors.push(`${concept.id}: ${targetError.message}`);
  }

  return errors;
}

async function formatArtifact(source: string, path: string): Promise<string> {
  const config = (await resolveConfig(path)) ?? {};
  return format(source, { ...config, filepath: path });
}

export async function curriculumSnapshot(
  dataset: CurriculumDataset = curriculumData,
): Promise<string> {
  return formatArtifact(JSON.stringify(dataset), curriculumSnapshotPath);
}

export async function writeCurriculumSnapshot(): Promise<void> {
  await mkdir(curriculumGeneratedRoot, { recursive: true });
  await writeFile(curriculumSnapshotPath, await curriculumSnapshot(), "utf8");
}

export async function curriculumSnapshotMatches(): Promise<boolean> {
  try {
    return (await readFile(curriculumSnapshotPath, "utf8")) === (await curriculumSnapshot());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function curriculumCoverageMarkdown(stats: CurriculumStats): string {
  const rows = stats.bySeries
    .map((entry) => `| ${entry.id} | ${entry.books} | ${entry.parts} | ${entry.chapters} |`)
    .join("\n");
  return `# Curriculum coverage\n\nGenerated from the versioned curriculum registry. Do not edit manually.\n\n| Metric | Count |\n| --- | ---: |\n| Series | ${stats.series} |\n| Books | ${stats.books} |\n| Parts | ${stats.parts} |\n| Chapters | ${stats.chapters} |\n| Mapped MDX documents | ${stats.mappedDocuments} |\n| Located concepts | ${stats.locatedConcepts}/${stats.concepts} |\n| Referenced visualizations | ${stats.visualizationsReferenced} |\n| Visualization bindings | ${stats.visualizationBindings}/${stats.visualizationManifestEntries} |\n\n| Series | Books | Parts | Chapters |\n| --- | ---: | ---: | ---: |\n${rows}\n`;
}

export async function writeCurriculumCoverageReport(): Promise<CurriculumStats> {
  const stats = collectCurriculumStats();
  await mkdir(curriculumGeneratedRoot, { recursive: true });
  const [json, markdown] = await Promise.all([
    formatArtifact(JSON.stringify(stats), curriculumCoverageJsonPath),
    formatArtifact(curriculumCoverageMarkdown(stats), curriculumCoverageMarkdownPath),
  ]);
  await Promise.all([
    writeFile(curriculumCoverageJsonPath, json, "utf8"),
    writeFile(curriculumCoverageMarkdownPath, markdown, "utf8"),
  ]);
  return stats;
}
