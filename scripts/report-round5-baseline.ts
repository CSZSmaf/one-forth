import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

type JsonRecord = Record<string, unknown>;
type PublicationStatus = "hidden" | "preview" | "published";
type EditorialStatus = "planned" | "outline" | "draft" | "checked" | "reviewed" | "verified";

interface RegistrySeries {
  readonly id: string;
  readonly slug: string;
  readonly order: number;
  readonly title: string;
  readonly bookIds: readonly string[];
}

interface RegistryBook {
  readonly id: string;
  readonly code: string;
  readonly slug: string;
  readonly order: number;
  readonly seriesId: string;
  readonly level: string;
  readonly title: string;
  readonly partIds: readonly string[];
}

interface RegistryPart {
  readonly id: string;
  readonly order: number;
  readonly bookId: string;
  readonly title: string;
  readonly chapterIds: readonly string[];
}

interface PlannedItem {
  readonly id: string;
  readonly title: string;
}

interface RegistryChapter {
  readonly id: string;
  readonly slug: string;
  readonly order: number;
  readonly bookId: string;
  readonly partId: string;
  readonly level: string;
  readonly title: string;
  readonly contentId: string | null;
  readonly legacyStatus: EditorialStatus | null;
  readonly publicationStatus: PublicationStatus | null;
  readonly editorialStatus: EditorialStatus | null;
  readonly dependencies: readonly string[];
  readonly plannedDefinitions: readonly PlannedItem[];
  readonly plannedEquations: readonly PlannedItem[];
  readonly plannedExamples: readonly PlannedItem[];
  readonly plannedExercises: readonly PlannedItem[];
  readonly visualizationIds: readonly string[];
  readonly resourceIds: readonly string[];
}

interface RegistrySnapshot {
  readonly schemaVersion: number;
  readonly series: readonly RegistrySeries[];
  readonly books: readonly RegistryBook[];
  readonly parts: readonly RegistryPart[];
  readonly chapters: readonly RegistryChapter[];
}

interface SemanticCounts {
  definitions: number;
  theorems: number;
  proofs: number;
  examples: number;
  counterExamples: number;
  exercises: number;
  solutions: number;
  misconceptions: number;
}

interface FormulaCounts {
  inline: number;
  display: number;
  semanticEquationReferences: number;
  total: number;
}

interface DocumentMetrics {
  readonly path: string;
  readonly id: string;
  readonly conceptId: string | null;
  readonly title: string;
  readonly legacyStatus: string | null;
  readonly body: string;
  readonly hanCharacters: number;
  readonly formulas: FormulaCounts;
  readonly blocks: SemanticCounts;
  readonly resourceCards: number;
  readonly externalLinks: number;
  readonly interactiveFigures: number;
}

interface OrderedChapter {
  readonly globalOrder: number;
  readonly series: RegistrySeries;
  readonly book: RegistryBook;
  readonly part: RegistryPart;
  readonly chapter: RegistryChapter;
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDirectory, "..");
const curriculumPath = join(
  repositoryRoot,
  "content",
  "curriculum",
  "generated",
  "curriculum.json",
);
const contentRoot = join(repositoryRoot, "content");
const legacyStylePath = join(repositoryRoot, "reports", "content-style-report.json");
const reportRoot = join(repositoryRoot, "reports", "round-5");
const fixedAuditTimestamp = "2026-07-13T00:00:00.000Z";

const outputPaths = {
  inventoryJson: join(reportRoot, "content-inventory.json"),
  inventoryMarkdown: join(reportRoot, "content-inventory.md"),
  queueJson: join(reportRoot, "content-production-queue.json"),
  queueMarkdown: join(reportRoot, "content-production-queue.md"),
  styleJson: join(reportRoot, "style-baseline.json"),
  styleMarkdown: join(reportRoot, "style-baseline.md"),
} as const;

function generatedAt(): string {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  if (!epoch) return fixedAuditTimestamp;
  if (!/^\d+$/.test(epoch)) throw new Error("SOURCE_DATE_EPOCH must contain whole seconds");
  const date = new Date(Number(epoch) * 1_000);
  if (!Number.isFinite(date.valueOf())) throw new Error("SOURCE_DATE_EPOCH is outside Date range");
  return date.toISOString();
}

function record(value: unknown, context: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${context} must be an object`);
  }
  return value as JsonRecord;
}

function array(value: unknown, context: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${context} must be an array`);
  return value;
}

function string(value: unknown, context: string): string {
  if (typeof value !== "string") throw new Error(`${context} must be a string`);
  return value;
}

function optionalString(value: unknown, context: string): string | null {
  return value === undefined || value === null ? null : string(value, context);
}

function number(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context} must be a finite number`);
  }
  return value;
}

function stringArray(value: unknown, context: string): readonly string[] {
  return array(value, context).map((entry, index) => string(entry, `${context}[${index}]`));
}

function zh(value: unknown, context: string): string {
  const localized = record(value, context);
  const selected = localized["zh-CN"] ?? localized.en;
  return string(selected, `${context}.zh-CN`);
}

function editorialStatus(value: unknown, context: string): EditorialStatus | null {
  const candidate = optionalString(value, context);
  if (candidate === null) return null;
  if (["planned", "outline", "draft", "checked", "reviewed", "verified"].includes(candidate)) {
    return candidate as EditorialStatus;
  }
  throw new Error(`${context} has unsupported editorial status ${candidate}`);
}

function publicationStatus(value: unknown, context: string): PublicationStatus | null {
  const candidate = optionalString(value, context);
  if (candidate === null) return null;
  if (["hidden", "preview", "published"].includes(candidate)) {
    return candidate as PublicationStatus;
  }
  throw new Error(`${context} has unsupported publication status ${candidate}`);
}

function plannedItems(value: unknown, context: string): readonly PlannedItem[] {
  return array(value, context).map((entry, index) => {
    const item = record(entry, `${context}[${index}]`);
    return {
      id: string(item.id, `${context}[${index}].id`),
      title: zh(item.title, `${context}[${index}].title`),
    };
  });
}

function parseRegistrySnapshot(value: unknown): RegistrySnapshot {
  const root = record(value, "curriculum");
  const parseSeries = (value: unknown, index: number): RegistrySeries => {
    const item = record(value, `curriculum.series[${index}]`);
    return {
      id: string(item.id, `curriculum.series[${index}].id`),
      slug: string(item.slug, `curriculum.series[${index}].slug`),
      order: number(item.order, `curriculum.series[${index}].order`),
      title: zh(item.title, `curriculum.series[${index}].title`),
      bookIds: stringArray(item.bookIds, `curriculum.series[${index}].bookIds`),
    };
  };
  const parseBook = (value: unknown, index: number): RegistryBook => {
    const item = record(value, `curriculum.books[${index}]`);
    return {
      id: string(item.id, `curriculum.books[${index}].id`),
      code: string(item.code, `curriculum.books[${index}].code`),
      slug: string(item.slug, `curriculum.books[${index}].slug`),
      order: number(item.order, `curriculum.books[${index}].order`),
      seriesId: string(item.seriesId, `curriculum.books[${index}].seriesId`),
      level: string(item.level, `curriculum.books[${index}].level`),
      title: zh(item.title, `curriculum.books[${index}].title`),
      partIds: stringArray(item.partIds, `curriculum.books[${index}].partIds`),
    };
  };
  const parsePart = (value: unknown, index: number): RegistryPart => {
    const item = record(value, `curriculum.parts[${index}]`);
    return {
      id: string(item.id, `curriculum.parts[${index}].id`),
      order: number(item.order, `curriculum.parts[${index}].order`),
      bookId: string(item.bookId, `curriculum.parts[${index}].bookId`),
      title: zh(item.title, `curriculum.parts[${index}].title`),
      chapterIds: stringArray(item.chapterIds, `curriculum.parts[${index}].chapterIds`),
    };
  };
  const parseChapter = (value: unknown, index: number): RegistryChapter => {
    const item = record(value, `curriculum.chapters[${index}]`);
    return {
      id: string(item.id, `curriculum.chapters[${index}].id`),
      slug: string(item.slug, `curriculum.chapters[${index}].slug`),
      order: number(item.order, `curriculum.chapters[${index}].order`),
      bookId: string(item.bookId, `curriculum.chapters[${index}].bookId`),
      partId: string(item.partId, `curriculum.chapters[${index}].partId`),
      level: string(item.level, `curriculum.chapters[${index}].level`),
      title: zh(item.title, `curriculum.chapters[${index}].title`),
      contentId: optionalString(item.contentId, `curriculum.chapters[${index}].contentId`),
      legacyStatus: editorialStatus(item.status, `curriculum.chapters[${index}].status`),
      publicationStatus: publicationStatus(
        item.publicationStatus,
        `curriculum.chapters[${index}].publicationStatus`,
      ),
      editorialStatus: editorialStatus(
        item.editorialStatus,
        `curriculum.chapters[${index}].editorialStatus`,
      ),
      dependencies: stringArray(
        item.prerequisiteChapterIds ?? [],
        `curriculum.chapters[${index}].prerequisiteChapterIds`,
      ),
      plannedDefinitions: plannedItems(
        item.plannedDefinitions ?? [],
        `curriculum.chapters[${index}].plannedDefinitions`,
      ),
      plannedEquations: plannedItems(
        item.plannedEquations ?? [],
        `curriculum.chapters[${index}].plannedEquations`,
      ),
      plannedExamples: plannedItems(
        item.plannedExamples ?? [],
        `curriculum.chapters[${index}].plannedExamples`,
      ),
      plannedExercises: plannedItems(
        item.plannedExercises ?? [],
        `curriculum.chapters[${index}].plannedExercises`,
      ),
      visualizationIds: stringArray(
        item.visualizationIds ?? [],
        `curriculum.chapters[${index}].visualizationIds`,
      ),
      resourceIds: stringArray(item.resourceIds ?? [], `curriculum.chapters[${index}].resourceIds`),
    };
  };

  return {
    schemaVersion: number(root.schemaVersion, "curriculum.schemaVersion"),
    series: array(root.series, "curriculum.series").map(parseSeries),
    books: array(root.books, "curriculum.books").map(parseBook),
    parts: array(root.parts, "curriculum.parts").map(parsePart),
    chapters: array(root.chapters, "curriculum.chapters").map(parseChapter),
  };
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(path)));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".mdx") files.push(path);
  }
  return files;
}

function posixPath(value: string): string {
  return value.split(sep).join("/");
}

function parseFrontmatter(
  source: string,
  path: string,
): { readonly frontmatter: string; readonly body: string } {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0]?.trim() !== "---") throw new Error(`${path}: missing opening frontmatter delimiter`);
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) throw new Error(`${path}: missing closing frontmatter delimiter`);
  return { frontmatter: lines.slice(1, end).join("\n"), body: lines.slice(end + 1).join("\n") };
}

function frontmatterScalar(frontmatter: string, key: string): string | null {
  const match = new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m").exec(frontmatter);
  if (!match?.[1]) return null;
  const value = match[1].trim();
  if (value === "null" || value === "~") return null;
  if (value.startsWith('"')) {
    const parsed: unknown = JSON.parse(value);
    return string(parsed, `frontmatter.${key}`);
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replaceAll("''", "'");
  return value;
}

function spacesPreservingLines(value: string): string {
  return value.replace(/[^\n]/g, " ");
}

function maskCode(source: string): string {
  return source
    .replace(
      /^(?: {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?^(?: {0,3})\1[ \t]*$/gm,
      spacesPreservingLines,
    )
    .replace(/`[^`\n]*`/g, spacesPreservingLines);
}

function narrativeMask(source: string): string {
  return maskCode(source)
    .replace(/<!--[\s\S]*?-->/g, spacesPreservingLines)
    .replace(/<\/?[A-Za-z][^>]*>/g, spacesPreservingLines);
}

function proseMask(source: string): string {
  return narrativeMask(source)
    .replace(/\$\$[\s\S]*?\$\$/g, spacesPreservingLines)
    .replace(/(?<!\\)\$(?!\$)[\s\S]*?(?<!\\)\$/g, spacesPreservingLines);
}

function countHan(source: string): number {
  const prose = proseMask(source)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|=-]/g, " ");
  return prose.match(/\p{Script=Han}/gu)?.length ?? 0;
}

function countMatches(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

function isEscaped(source: string, offset: number): boolean {
  let slashes = 0;
  for (let index = offset - 1; index >= 0 && source[index] === "\\"; index -= 1) slashes += 1;
  return slashes % 2 === 1;
}

function formulaCounts(source: string): FormulaCounts {
  const masked = maskCode(source);
  let inline = 0;
  let display = 0;
  let offset = 0;
  while (offset < masked.length) {
    if (masked[offset] !== "$" || isEscaped(masked, offset)) {
      offset += 1;
      continue;
    }
    const isDisplay = masked[offset + 1] === "$";
    const length = isDisplay ? 2 : 1;
    let close = -1;
    for (let cursor = offset + length; cursor < masked.length; cursor += 1) {
      if (masked[cursor] !== "$" || isEscaped(masked, cursor)) continue;
      if (isDisplay && masked[cursor + 1] === "$") {
        close = cursor;
        break;
      }
      if (!isDisplay && masked[cursor - 1] !== "$" && masked[cursor + 1] !== "$") {
        close = cursor;
        break;
      }
    }
    if (isDisplay) display += 1;
    else inline += 1;
    offset = close >= 0 ? close + length : masked.length;
  }
  const semanticEquationReferences = countMatches(source, /<Equation\b[^>]*\bid\s*=/g);
  return {
    inline,
    display,
    semanticEquationReferences,
    total: inline + display + semanticEquationReferences,
  };
}

function semanticCounts(source: string): SemanticCounts {
  const count = (tag: string) => countMatches(source, new RegExp(`<${tag}(?:\\s|/?>)`, "g"));
  return {
    definitions: count("Definition"),
    theorems: count("Theorem"),
    proofs: count("Proof"),
    examples: count("Example"),
    counterExamples: count("CounterExample"),
    exercises: count("Exercise"),
    solutions: count("Solution"),
    misconceptions: count("Misconception"),
  };
}

async function loadDocuments(): Promise<readonly DocumentMetrics[]> {
  const paths = await walkFiles(contentRoot);
  const documents: DocumentMetrics[] = [];
  for (const absolutePath of paths) {
    const path = posixPath(relative(repositoryRoot, absolutePath));
    const parsed = parseFrontmatter(await readFile(absolutePath, "utf8"), path);
    const id = frontmatterScalar(parsed.frontmatter, "id");
    if (!id) throw new Error(`${path}: frontmatter.id is required`);
    documents.push({
      path,
      id,
      conceptId: frontmatterScalar(parsed.frontmatter, "conceptId"),
      title: frontmatterScalar(parsed.frontmatter, "title") ?? id,
      legacyStatus: frontmatterScalar(parsed.frontmatter, "status"),
      body: parsed.body,
      hanCharacters: countHan(parsed.body),
      formulas: formulaCounts(parsed.body),
      blocks: semanticCounts(parsed.body),
      resourceCards: countMatches(parsed.body, /<ResourceCard\b[^>]*\bid\s*=/g),
      externalLinks: countMatches(parsed.body, /\[[^\]]+\]\(https?:\/\/[^)]+\)/g),
      interactiveFigures: countMatches(parsed.body, /<InteractiveFigure\b[^>]*\bid\s*=/g),
    });
  }
  return documents;
}

function orderedChapters(snapshot: RegistrySnapshot): readonly OrderedChapter[] {
  const seriesById = new Map(snapshot.series.map((entry) => [entry.id, entry] as const));
  const booksById = new Map(snapshot.books.map((entry) => [entry.id, entry] as const));
  const partsById = new Map(snapshot.parts.map((entry) => [entry.id, entry] as const));
  const chaptersById = new Map(snapshot.chapters.map((entry) => [entry.id, entry] as const));
  const ordered: OrderedChapter[] = [];
  const series = [...snapshot.series].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id, "en"),
  );
  for (const seriesEntry of series) {
    if (!seriesById.has(seriesEntry.id)) throw new Error(`Unknown series ${seriesEntry.id}`);
    for (const bookId of seriesEntry.bookIds) {
      const book = booksById.get(bookId);
      if (!book) throw new Error(`Series ${seriesEntry.id} references unknown book ${bookId}`);
      for (const partId of book.partIds) {
        const part = partsById.get(partId);
        if (!part) throw new Error(`Book ${book.id} references unknown part ${partId}`);
        for (const chapterId of part.chapterIds) {
          const chapter = chaptersById.get(chapterId);
          if (!chapter) throw new Error(`Part ${part.id} references unknown chapter ${chapterId}`);
          ordered.push({
            globalOrder: ordered.length + 1,
            series: seriesEntry,
            book,
            part,
            chapter,
          });
        }
      }
    }
  }
  if (ordered.length !== snapshot.chapters.length) {
    throw new Error(
      `Ordered ${ordered.length} chapters, registry contains ${snapshot.chapters.length}`,
    );
  }
  const positions = new Map(ordered.map((entry) => [entry.chapter.id, entry.globalOrder] as const));
  for (const entry of ordered) {
    for (const dependency of entry.chapter.dependencies) {
      const dependencyOrder = positions.get(dependency);
      if (!dependencyOrder)
        throw new Error(`${entry.chapter.id} depends on unknown chapter ${dependency}`);
      if (dependencyOrder >= entry.globalOrder) {
        throw new Error(`${entry.chapter.id} is ordered before dependency ${dependency}`);
      }
    }
  }
  return ordered;
}

function sum<T>(items: readonly T[], select: (item: T) => number): number {
  return items.reduce((total, item) => total + select(item), 0);
}

function addSemanticCounts(items: readonly DocumentMetrics[]): SemanticCounts {
  return {
    definitions: sum(items, (item) => item.blocks.definitions),
    theorems: sum(items, (item) => item.blocks.theorems),
    proofs: sum(items, (item) => item.blocks.proofs),
    examples: sum(items, (item) => item.blocks.examples),
    counterExamples: sum(items, (item) => item.blocks.counterExamples),
    exercises: sum(items, (item) => item.blocks.exercises),
    solutions: sum(items, (item) => item.blocks.solutions),
    misconceptions: sum(items, (item) => item.blocks.misconceptions),
  };
}

function addFormulaCounts(items: readonly DocumentMetrics[]): FormulaCounts {
  const inline = sum(items, (item) => item.formulas.inline);
  const display = sum(items, (item) => item.formulas.display);
  const semanticEquationReferences = sum(items, (item) => item.formulas.semanticEquationReferences);
  return {
    inline,
    display,
    semanticEquationReferences,
    total: inline + display + semanticEquationReferences,
  };
}

function countBy(values: readonly (string | null)[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values)
    counts[value ?? "unseparated"] = (counts[value ?? "unseparated"] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, "en")),
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function targetLength(level: string) {
  if (level === "foundation")
    return { minHanCharacters: 1_800, maxHanCharacters: 3_500, classification: "基础定义与方法" };
  if (level === "undergraduate")
    return { minHanCharacters: 3_000, maxHanCharacters: 6_000, classification: "核心理论章节" };
  if (level === "advanced")
    return {
      minHanCharacters: 3_500,
      maxHanCharacters: 7_000,
      classification: "综合应用或高级章节",
    };
  return { minHanCharacters: 4_000, maxHanCharacters: 8_000, classification: "高级理论或研究主题" };
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function buildArtifacts() {
  const [curriculumSource, styleSource, documents] = await Promise.all([
    readFile(curriculumPath, "utf8"),
    readFile(legacyStylePath, "utf8"),
    loadDocuments(),
  ]);
  const snapshot = parseRegistrySnapshot(JSON.parse(curriculumSource) as unknown);
  const styleReport = record(JSON.parse(styleSource) as unknown, "legacy style report");
  const styleSummary = record(styleReport.summary, "legacy style report.summary");
  const styleByRule = record(styleSummary.byRule, "legacy style report.summary.byRule");
  const styleBySeverity = record(styleSummary.bySeverity, "legacy style report.summary.bySeverity");
  const totalFindings = number(
    styleSummary.totalFindings,
    "legacy style report.summary.totalFindings",
  );
  const ruleTotal = sum(Object.values(styleByRule), (value) => number(value, "style byRule value"));
  if (ruleTotal !== totalFindings)
    throw new Error(`Legacy style rule total ${ruleTotal} != ${totalFindings}`);

  const ordered = orderedChapters(snapshot);
  const documentById = new Map<string, DocumentMetrics>();
  for (const document of documents) {
    if (documentById.has(document.id)) throw new Error(`Duplicate MDX id ${document.id}`);
    documentById.set(document.id, document);
  }
  const mappedDocumentIds = new Set<string>();
  for (const entry of ordered) {
    if (!entry.chapter.contentId) continue;
    const document = documentById.get(entry.chapter.contentId);
    if (!document)
      throw new Error(`${entry.chapter.id} maps missing contentId ${entry.chapter.contentId}`);
    if (mappedDocumentIds.has(document.id))
      throw new Error(`Content ${document.id} maps to multiple chapters`);
    mappedDocumentIds.add(document.id);
  }
  const unmappedDocuments = documents.filter((document) => !mappedDocumentIds.has(document.id));
  if (unmappedDocuments.length > 0) {
    throw new Error(
      `Unmapped MDX contentIds: ${unmappedDocuments.map((entry) => entry.id).join(", ")}`,
    );
  }

  const totalBlocks = addSemanticCounts(documents);
  const totalFormulas = addFormulaCounts(documents);
  const bookRecords = snapshot.books
    .map((book) => {
      const series = snapshot.series.find((entry) => entry.id === book.seriesId);
      if (!series) throw new Error(`Book ${book.id} references unknown series ${book.seriesId}`);
      const chapters = ordered.filter((entry) => entry.book.id === book.id);
      const bodies = chapters.flatMap((entry) => {
        const document = entry.chapter.contentId
          ? documentById.get(entry.chapter.contentId)
          : undefined;
        return document ? [document] : [];
      });
      return {
        seriesId: series.id,
        seriesTitle: series.title,
        bookId: book.id,
        code: book.code,
        title: book.title,
        level: book.level,
        chapters: chapters.length,
        chaptersWithBody: bodies.length,
        chaptersWithoutBody: chapters.length - bodies.length,
        hanCharacters: sum(bodies, (document) => document.hanCharacters),
        formulas: addFormulaCounts(bodies).total,
        definitions: addSemanticCounts(bodies).definitions,
        theorems: addSemanticCounts(bodies).theorems,
        examples: addSemanticCounts(bodies).examples,
        exercises: addSemanticCounts(bodies).exercises,
        resources: sum(bodies, (document) => document.resourceCards),
      };
    })
    .sort((left, right) => {
      const leftOrder = snapshot.series.find((entry) => entry.id === left.seriesId)?.order ?? 0;
      const rightOrder = snapshot.series.find((entry) => entry.id === right.seriesId)?.order ?? 0;
      const leftBookOrder = snapshot.books.find((entry) => entry.id === left.bookId)?.order ?? 0;
      const rightBookOrder = snapshot.books.find((entry) => entry.id === right.bookId)?.order ?? 0;
      return (
        leftOrder - rightOrder ||
        leftBookOrder - rightBookOrder ||
        left.bookId.localeCompare(right.bookId, "en")
      );
    });

  const chapterRecords = ordered.map((entry) => {
    const document = entry.chapter.contentId
      ? documentById.get(entry.chapter.contentId)
      : undefined;
    return {
      chapterId: entry.chapter.id,
      bookId: entry.book.id,
      order: entry.globalOrder,
      title: entry.chapter.title,
      contentId: entry.chapter.contentId,
      mappingKey: "chapter.contentId",
      hasBody: Boolean(document),
      bodyPath: document?.path ?? null,
      bodyHanCharacters: document?.hanCharacters ?? 0,
      currentPublicationStatus: entry.chapter.publicationStatus,
      currentEditorialStatus:
        entry.chapter.editorialStatus ?? entry.chapter.legacyStatus ?? "planned",
      legacySingleStatus: entry.chapter.legacyStatus,
      legacyExposure:
        entry.chapter.publicationStatus === null
          ? document
            ? "public-draft-route"
            : "public-planned-route"
          : null,
      recommendedPublicationStatus: document ? "preview" : "hidden",
      canonicalRoute: `/zh-CN/books/${entry.series.slug}/${entry.book.slug}/${entry.chapter.slug}`,
    };
  });

  const inventory = {
    schemaVersion: 1,
    generatedAt: generatedAt(),
    status: "checkpoint-a-baseline-only",
    publicationClaim: "none",
    sources: {
      curriculum: {
        path: posixPath(relative(repositoryRoot, curriculumPath)),
        sha256: sha256(curriculumSource),
        schemaVersion: snapshot.schemaVersion,
      },
      mdx: {
        root: "content",
        files: documents.length,
        aggregateSha256: sha256(
          documents.map((entry) => `${entry.path}\0${entry.body}`).join("\0"),
        ),
      },
      legacyStyleReport: {
        path: posixPath(relative(repositoryRoot, legacyStylePath)),
        sha256: sha256(styleSource),
      },
    },
    methodology: {
      mapping:
        "MDX bodies are mapped only by chapter.contentId; conceptId is retained as metadata and never used as a fallback.",
      hanCharacters:
        "Counts Han characters in MDX body prose after masking code, math, comments, JSX tags and Markdown syntax.",
      semanticBlocks:
        "Counts explicit Definition, Theorem, Proof, Example, CounterExample, Exercise, Solution and Misconception components.",
      baselineBoundary:
        "Legacy single-status exposure is recorded, but no chapter is declared published by this report.",
    },
    summary: {
      series: snapshot.series.length,
      books: snapshot.books.length,
      parts: snapshot.parts.length,
      chapters: snapshot.chapters.length,
      mdxDocuments: documents.length,
      mappedMdxDocuments: mappedDocumentIds.size,
      chaptersWithBody: chapterRecords.filter((entry) => entry.hasBody).length,
      chaptersWithoutBody: chapterRecords.filter((entry) => !entry.hasBody).length,
      hanCharacters: sum(documents, (document) => document.hanCharacters),
      formulas: totalFormulas,
      semanticBlocks: totalBlocks,
      references: {
        resourceCards: sum(documents, (document) => document.resourceCards),
        externalMarkdownLinks: sum(documents, (document) => document.externalLinks),
      },
      interactiveFigures: sum(documents, (document) => document.interactiveFigures),
      publicationStatus: countBy(chapterRecords.map((entry) => entry.currentPublicationStatus)),
      editorialStatus: countBy(chapterRecords.map((entry) => entry.currentEditorialStatus)),
      legacySingleStatus: countBy(chapterRecords.map((entry) => entry.legacySingleStatus)),
    },
    series: snapshot.series.map((series) => {
      const books = bookRecords.filter((book) => book.seriesId === series.id);
      return {
        seriesId: series.id,
        title: series.title,
        books: books.length,
        chapters: sum(books, (book) => book.chapters),
        chaptersWithBody: sum(books, (book) => book.chaptersWithBody),
        hanCharacters: sum(books, (book) => book.hanCharacters),
      };
    }),
    books: bookRecords,
    documents: documents.map(({ body: _body, ...document }) => document),
    chapters: chapterRecords,
    unmappedDocuments: unmappedDocuments.map((entry) => entry.path),
  };

  const tasks = ordered.map((entry) => {
    const document = entry.chapter.contentId
      ? documentById.get(entry.chapter.contentId)
      : undefined;
    const exerciseMinimum = entry.chapter.level === "foundation" ? 4 : 5;
    const exerciseMaximum = entry.chapter.level === "foundation" ? 8 : 10;
    return {
      chapterId: entry.chapter.id,
      bookId: entry.book.id,
      order: entry.globalOrder,
      title: entry.chapter.title,
      contentId: entry.chapter.contentId,
      dependencies: entry.chapter.dependencies,
      currentPublicationStatus: entry.chapter.publicationStatus,
      currentEditorialStatus:
        entry.chapter.editorialStatus ?? entry.chapter.legacyStatus ?? "planned",
      legacyExposure:
        entry.chapter.publicationStatus === null
          ? document
            ? "public-draft-route"
            : "public-planned-route"
          : null,
      recommendedPublicationStatus: document ? "preview" : "hidden",
      targetLength: targetLength(entry.chapter.level),
      requiredDefinitions: {
        minimumCount: Math.max(1, entry.chapter.plannedDefinitions.length),
        plannedItems: entry.chapter.plannedDefinitions,
      },
      requiredEquations: {
        minimumCount: entry.chapter.plannedEquations.length,
        plannedItems: entry.chapter.plannedEquations,
      },
      requiredExamples: { minimumCount: 2, plannedItems: entry.chapter.plannedExamples },
      requiredExercises: {
        minimumCount: exerciseMinimum,
        maximumSuggestedCount: exerciseMaximum,
        plannedItems: entry.chapter.plannedExercises,
      },
      requiredVisualizations: {
        minimumCount: entry.chapter.visualizationIds.length,
        ids: entry.chapter.visualizationIds,
      },
      requiredResources: { minimumCount: 2, verifiedIds: entry.chapter.resourceIds },
      validationStatus: {
        stage: document ? "baseline-body-present-needs-round-5-revision" : "not-started",
        automatedContentValidation: "not-run-for-round-5",
        mathematicalOrScientificValidation: "not-run-for-round-5",
        languageRewrite: "not-run-for-round-5",
        humanEditorialReview: "not-run",
        publicationEligible: false,
      },
    };
  });

  const queue = {
    schemaVersion: 1,
    generatedAt: generatedAt(),
    status: "checkpoint-a-baseline-only",
    publicationClaim: "none",
    mappingKey: "chapter.contentId",
    ordering: [
      "prerequisite chapters before dependents",
      "foundation books before later books according to Registry series/book order",
      "finish one book continuously before starting the next",
      "revise an existing body when its chapter position is reached",
      "do not interleave unrelated subjects",
    ],
    batchPolicy: {
      minimumChapters: 3,
      maximumChapters: 6,
      firstBook: "m00",
      firstBookBatches: [3, 3],
    },
    summary: {
      tasks: tasks.length,
      withExistingBody: tasks.filter((task) => task.contentId !== null).length,
      withoutBody: tasks.filter((task) => task.contentId === null).length,
      recommendedHidden: tasks.filter((task) => task.recommendedPublicationStatus === "hidden")
        .length,
      recommendedPreview: tasks.filter((task) => task.recommendedPublicationStatus === "preview")
        .length,
      publicationEligible: tasks.filter((task) => task.validationStatus.publicationEligible).length,
    },
    tasks,
  };

  const phraseDefinitions = [
    { id: "can", label: "可以", pattern: "可以", kind: "literal" },
    {
      id: "contrast-negative",
      label: "不是/并非……而是……",
      pattern: "(?:不是|并非)[^。！？；\\n]{0,60}而是",
      kind: "regex",
    },
    { id: "not-only", label: "不仅……还……", pattern: "不仅[^。！？；\\n]{0,60}还", kind: "regex" },
    { id: "through-to", label: "通过……来……", pattern: "通过[^。！？；\\n]{0,50}来", kind: "regex" },
    { id: "attention", label: "需要注意的是", pattern: "需要注意的是", kind: "literal" },
    { id: "noteworthy", label: "值得注意的是", pattern: "值得注意的是", kind: "literal" },
    { id: "implication", label: "这意味着", pattern: "这意味着", kind: "literal" },
    { id: "essentially", label: "本质上", pattern: "本质上", kind: "literal" },
    {
      id: "in-other-words",
      label: "换句话说/换言之",
      pattern: "(?:换句话说|换言之)",
      kind: "regex",
    },
    { id: "obvious", label: "显而易见/不难发现", pattern: "(?:显而易见|不难发现)", kind: "regex" },
    { id: "practical", label: "在实际应用中", pattern: "在实际应用中", kind: "literal" },
    {
      id: "chat",
      label: "聊天回答式引导",
      pattern:
        "(?:让我们|你可以把它想象成|接下来我们来看|简单来说|不妨想象|有没有想过|为什么会这样呢|现在问题来了|恭喜你已经)",
      kind: "regex",
    },
    {
      id: "generic-introduction",
      label: "通用导言",
      pattern: "(?:本节将介绍|在本章中，我们将)",
      kind: "regex",
    },
    { id: "generic-conclusion", label: "通用结尾", pattern: "综上所述", kind: "literal" },
    {
      id: "passive-candidate",
      label: "被动语态候选",
      pattern: "被[\\p{Script=Han}]{1,16}(?:为|了|过)?",
      kind: "regex",
    },
    {
      id: "editorial-leakage",
      label: "内部编辑术语",
      pattern:
        "(?:正文计划中|课程规划|尚未写成|待人工审阅|内容成熟度|编辑状态|Schema|Registry|TODO)",
      kind: "regex",
    },
  ] as const;
  const styleDocuments = documents.map((document) => {
    const masked = narrativeMask(document.body);
    return {
      path: document.path,
      hanCharacters: document.hanCharacters,
      frequencies: Object.fromEntries(
        phraseDefinitions.map((phrase) => {
          const source =
            phrase.kind === "literal"
              ? phrase.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
              : phrase.pattern;
          return [phrase.id, countMatches(masked, new RegExp(source, "gu"))] as const;
        }),
      ),
    };
  });
  const phraseTotals = Object.fromEntries(
    phraseDefinitions.map((phrase) => [
      phrase.id,
      sum(styleDocuments, (document) => number(document.frequencies[phrase.id], phrase.id)),
    ]),
  );
  const legacyRules = Object.keys(styleByRule).sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  const requiredCoverage = [
    ["“不是……而是……”频率", "ai-phrase", "partial"],
    ["“可以”频率", "can-frequency", "missing-from-legacy-report"],
    ["“通过……来……”频率", "through-to-construction", "missing-from-legacy-report"],
    ["被动语态候选", "passive-voice-candidate", "missing-from-legacy-report"],
    ["通用导言/结尾", "generic-introduction / generic-conclusion", "missing-from-legacy-report"],
    [
      "重复标题与 H2 序列相似度",
      "duplicate-heading / heading-similarity",
      "missing-from-legacy-report",
    ],
    ["TODO 与内部编辑术语", "todo-marker / editorial-term-leakage", "missing-from-legacy-report"],
    ["短章、短节、单句段", "short-article / short-section / single-sentence-paragraph", "covered"],
    ["例题、练习、资源下限", "complete-example-count / exercise-count / resource-count", "covered"],
    ["术语与符号候选", "suspected-undefined-term / suspected-undefined-symbol", "covered"],
  ].map(([requirement, expectedRule, coverage]) => ({ requirement, expectedRule, coverage }));

  const styleBaseline = {
    schemaVersion: 1,
    generatedAt: generatedAt(),
    status: "checkpoint-a-baseline-only",
    source: {
      path: posixPath(relative(repositoryRoot, legacyStylePath)),
      sha256: sha256(styleSource),
      generatedAt: optionalString(styleReport.generatedAt, "legacy style report.generatedAt"),
    },
    summary: {
      filesScanned: number(styleSummary.filesScanned, "legacy style report.summary.filesScanned"),
      filesWithFindings: number(
        styleSummary.filesWithFindings,
        "legacy style report.summary.filesWithFindings",
      ),
      totalFindings,
      bySeverity: styleBySeverity,
      byRule: styleByRule,
    },
    prescan: {
      methodology:
        "Counts candidate occurrences in MDX bodies after masking fenced/inline code, comments and JSX tags. Counts are review leads, not automatic style violations.",
      phrases: phraseDefinitions.map((phrase) => ({ ...phrase, count: phraseTotals[phrase.id] })),
      documents: styleDocuments,
    },
    legacyLintCoverage: {
      implementedRuleIds: legacyRules,
      gaps: requiredCoverage,
      note: "The 198-finding report predates the Round-5 rule expansion; zero findings for an old rule does not establish full Round-5 coverage.",
    },
  };

  const inventoryMarkdown = `# One Forth 第五轮内容基线\n\n> Checkpoint A 基线；只记录当前 Registry 快照与 MDX 正文，不声明任何章节已发布或完成人工审阅。\n\n## 技术摘要\n\n当前快照包含 ${inventory.summary.series} 个系列、${inventory.summary.books} 册教材、${inventory.summary.parts} 编和 ${inventory.summary.chapters} 章。${inventory.summary.mdxDocuments} 个 MDX 均通过 \`chapter.contentId\` 映射到章节；${inventory.summary.chaptersWithoutBody} 章没有正文。现有正文共 ${inventory.summary.hanCharacters} 个有效汉字。\n\n| 指标 | 数量 |\n| --- | ---: |\n| 有正文 / 无正文章节 | ${inventory.summary.chaptersWithBody} / ${inventory.summary.chaptersWithoutBody} |\n| 行内 / 展示 / Equation 公式 | ${totalFormulas.inline} / ${totalFormulas.display} / ${totalFormulas.semanticEquationReferences} |\n| Definition / Theorem / Proof | ${totalBlocks.definitions} / ${totalBlocks.theorems} / ${totalBlocks.proofs} |\n| Example / Exercise / Solution | ${totalBlocks.examples} / ${totalBlocks.exercises} / ${totalBlocks.solutions} |\n| ResourceCard / 外部 Markdown 链接 | ${inventory.summary.references.resourceCards} / ${inventory.summary.references.externalMarkdownLinks} |\n| InteractiveFigure | ${inventory.summary.interactiveFigures} |\n\n## 48 册正文汉字\n\n| 系列 | 教材 | 章节 | 有正文 | 无正文 | 正文汉字 | 定义 | 定理 | 例题 | 练习 | 资源 |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${bookRecords.map((book) => `| ${markdownCell(book.seriesTitle)} | ${book.code} ${markdownCell(book.title)} | ${book.chapters} | ${book.chaptersWithBody} | ${book.chaptersWithoutBody} | ${book.hanCharacters} | ${book.definitions} | ${book.theorems} | ${book.examples} | ${book.exercises} | ${book.resources} |`).join("\n")}\n\n## 已有 MDX 正文\n\n| contentId | 路径 | 汉字 | 公式 | 定义 | 定理 | 例题 | 练习 | 资源 |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${documents.map((document) => `| ${document.id} | ${document.path} | ${document.hanCharacters} | ${document.formulas.total} | ${document.blocks.definitions} | ${document.blocks.theorems} | ${document.blocks.examples} | ${document.blocks.exercises} | ${document.resourceCards} |`).join("\n")}\n\n## 口径与限制\n\n- 正文映射只使用 \`chapter.contentId\`，不以 \`conceptId\` 猜测章节归属。\n- 汉字数排除 frontmatter、代码、公式、注释、JSX 标签和 Markdown 标记；它是质量预警口径，不是填充目标。\n- 语义块只统计显式组件。自动检查不等同于人工审阅。\n- 双状态尚未写入该 Registry 快照时，\`currentPublicationStatus\` 为 \`null\`，JSON 同时保留旧公开路由暴露类型与建议的 \`hidden/preview\`。\n`;

  const m00 = tasks.filter((task) => task.bookId === "m00");
  const queueMarkdown = `# One Forth 第五轮内容生产队列基线\n\n> 队列共有 ${tasks.length} 个章节任务。它是内部生产计划，不是公开课程完成率；所有任务的 \`publicationEligible\` 在基线均为 \`false\`。完整任务字段见 JSON。\n\n## 排序规则\n\n1. 先修章节在依赖章节之前。\n2. 按 Registry 的系列、教材、编、章顺序推进，整册连续完成。\n3. 已有正文到达其章节位置时优先修订，不跨学科随机跳转。\n4. 每批 3–6 章，经过数学/科学校验、语言重写、内容校验和人工审阅后才讨论发布。\n\n## 首册 M00：3 + 3\n\n### 第一批（第 1–3 章）\n\n| 队列序号 | 章节 | 当前正文 | 当前编辑状态 | 建议公开状态 | 目标汉字 |\n| ---: | --- | --- | --- | --- | ---: |\n${m00
    .slice(0, 3)
    .map(
      (task) =>
        `| ${task.order} | ${task.chapterId} ${markdownCell(task.title)} | ${task.contentId ?? "无"} | ${task.currentEditorialStatus} | ${task.recommendedPublicationStatus} | ${task.targetLength.minHanCharacters}–${task.targetLength.maxHanCharacters} |`,
    )
    .join(
      "\n",
    )}\n\n### 第二批（第 4–6 章）\n\n| 队列序号 | 章节 | 当前正文 | 当前编辑状态 | 建议公开状态 | 目标汉字 |\n| ---: | --- | --- | --- | --- | ---: |\n${m00
    .slice(3, 6)
    .map(
      (task) =>
        `| ${task.order} | ${task.chapterId} ${markdownCell(task.title)} | ${task.contentId ?? "无"} | ${task.currentEditorialStatus} | ${task.recommendedPublicationStatus} | ${task.targetLength.minHanCharacters}–${task.targetLength.maxHanCharacters} |`,
    )
    .join(
      "\n",
    )}\n\n## 逐册工作量\n\n| 教材 | 任务 | 已有正文 | 待写正文 | 当前正文汉字 |\n| --- | ---: | ---: | ---: | ---: |\n${bookRecords.map((book) => `| ${book.code} ${markdownCell(book.title)} | ${book.chapters} | ${book.chaptersWithBody} | ${book.chaptersWithoutBody} | ${book.hanCharacters} |`).join("\n")}\n\n## 验证边界\n\n- JSON 的 ${tasks.length} 个任务均含任务书要求的 13 个字段，并附 \`contentId\`、建议公开状态及分项验证状态。\n- 目标篇幅按章节 level 采用任务书建议区间；主题需要时应在写作前调整，不机械填充。\n- Registry 当前没有资源 ID 的章节仍要求至少 2 个逐字段核验的可靠资源；空数组表示待研究，不表示无需资源。\n`;

  const styleMarkdown = `# One Forth 第五轮文风基线\n\n> 旧版 lint 报告保留 ${totalFindings} 个可见 findings；本文件另做词频预扫，但不把词频命中自动判为错误。\n\n## 旧版检查结果\n\n| 指标 | 数量 |\n| --- | ---: |\n| 扫描文件 | ${styleBaseline.summary.filesScanned} |\n| 有 findings 的文件 | ${styleBaseline.summary.filesWithFindings} |\n| Advisory | ${String(styleBySeverity.advisory ?? 0)} |\n| Warning | ${String(styleBySeverity.warning ?? 0)} |\n| 总 findings | ${totalFindings} |\n\n| 旧规则 | Findings |\n| --- | ---: |\n${Object.entries(
    styleByRule,
  )
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([rule, count]) => `| \`${rule}\` | ${String(count)} |`)
    .join(
      "\n",
    )}\n\n## 第五轮词频预扫\n\n| 候选表达 | 次数 |\n| --- | ---: |\n${styleBaseline.prescan.phrases.map((phrase) => `| ${markdownCell(phrase.label)} | ${String(phrase.count)} |`).join("\n")}\n\n“可以”按正文 narrative mask 统计为 ${String(phraseTotals.can)} 次；代码、注释和 JSX 标签中的字样不计。预扫用于确定重写优先级，保留表达能力、许可或可能性的必要用法。\n\n## 旧 lint 覆盖缺口\n\n| 第五轮要求 | 预期规则 | 旧基线覆盖 |\n| --- | --- | --- |\n${requiredCoverage.map((entry) => `| ${entry.requirement} | \`${entry.expectedRule}\` | ${entry.coverage} |`).join("\n")}\n\n旧报告的 198 个 findings 主要来自短节、单句段和术语/符号候选。它早于第五轮规则扩展，因此不能用旧报告中 \`ai-phrase: 0\` 推断“可以”、被动语态、通用导言、TODO 或内部编辑术语已经通过检查。\n`;

  return { inventory, inventoryMarkdown, queue, queueMarkdown, styleBaseline, styleMarkdown };
}

async function main(): Promise<void> {
  const artifacts = await buildArtifacts();
  await mkdir(reportRoot, { recursive: true });
  const files = [
    [outputPaths.inventoryJson, json(artifacts.inventory)],
    [outputPaths.inventoryMarkdown, artifacts.inventoryMarkdown],
    [outputPaths.queueJson, json(artifacts.queue)],
    [outputPaths.queueMarkdown, artifacts.queueMarkdown],
    [outputPaths.styleJson, json(artifacts.styleBaseline)],
    [outputPaths.styleMarkdown, artifacts.styleMarkdown],
  ] as const;
  await Promise.all(
    files.map(([path, source]) =>
      writeFile(path, source.endsWith("\n") ? source : `${source}\n`, "utf8"),
    ),
  );
  const queueTasks = array(record(artifacts.queue, "queue").tasks, "queue.tasks");
  const chapterCount = number(
    record(record(artifacts.inventory, "inventory").summary, "inventory.summary").chapters,
    "inventory.summary.chapters",
  );
  if (queueTasks.length !== chapterCount)
    throw new Error(`Queue has ${queueTasks.length} tasks for ${chapterCount} chapters`);
  process.stdout.write(
    `Round-5 baseline: ${chapterCount} chapters, ${String(record(artifacts.inventory.summary, "summary").mdxDocuments)} MDX, ${String(record(artifacts.styleBaseline.summary, "style summary").totalFindings)} legacy style findings.\n`,
  );
}

await main();
