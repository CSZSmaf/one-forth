import type { LocalizedText } from "@one-forth/registry";
import { curriculumSectionPlans } from "./section-plans";
import { curriculumSchemaVersion } from "./types";
import type {
  CurriculumBook,
  CurriculumChapter,
  CurriculumDataset,
  CurriculumLevel,
  CurriculumPart,
  CurriculumSeries,
  PlannedItem,
  PlannedSection,
} from "./types";

export interface ChapterBlueprint {
  readonly slug: string;
  readonly title: string;
  readonly contentId?: string;
  readonly summary?: string;
}

export interface PartBlueprint {
  readonly slug: string;
  readonly title: string;
  readonly chapters: readonly ChapterBlueprint[];
  readonly summary?: string;
}

export interface BookBlueprint {
  readonly code: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly level: CurriculumLevel;
  readonly parts: readonly PartBlueprint[];
  readonly prerequisiteBookIds?: readonly string[];
}

export interface SeriesBlueprint {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly books: readonly BookBlueprint[];
}

export function chapter(
  slug: string,
  title: string,
  contentId?: string,
  summary?: string,
): ChapterBlueprint {
  return {
    slug,
    title,
    ...(contentId ? { contentId } : {}),
    ...(summary ? { summary } : {}),
  };
}

export function part(
  slug: string,
  title: string,
  chapters: readonly ChapterBlueprint[],
  summary?: string,
): PartBlueprint {
  return { slug, title, chapters, ...(summary ? { summary } : {}) };
}

function zh(value: string): LocalizedText {
  return { "zh-CN": value };
}

function termsFor(title: string, partTitle: string, bookTitle: string): readonly string[] {
  const terms = topicFragments(title);
  return [...new Set([...terms, partTitle, bookTitle])].slice(0, 8);
}

function topicFragments(title: string): readonly string[] {
  return title
    .replace(/[（）()]/gu, "")
    .split(/[、，：；]|与|及其|及/gu)
    .map((entry) =>
      entry
        .replace(/^其/u, "")
        .replace(/(?:综合)?复习$/u, "")
        .trim(),
    )
    .filter((entry) => entry.length >= 1);
}

function joinTopics(topics: readonly string[]): string {
  return topics.reduce((result, topic, index) => {
    if (index === 0) return topic;
    const previousEndsInLatin = /[A-Za-z0-9]$/u.test(result);
    const nextStartsInLatin = /^[A-Za-z0-9]/u.test(topic);
    return `${result}${previousEndsInLatin ? " " : ""}与${nextStartsInLatin ? " " : ""}${topic}`;
  }, "");
}

function sectionFocusesFor(chapterId: string): readonly [string, string, string] {
  const plan = curriculumSectionPlans[chapterId];
  if (!plan) throw new Error(`Chapter ${chapterId} is missing a topic-specific section plan`);
  return plan;
}

function plannedSectionsFor(chapterId: string): readonly PlannedSection[] {
  const focuses = sectionFocusesFor(chapterId);
  const summaryVerbs = ["界定", "推导", "检验"] as const;
  return focuses.map((focus, index) => ({
    id: `section-${chapterId}-${index + 1}`,
    title: zh(focus),
    summary: zh(`${summaryVerbs[index] ?? "说明"}${focus}，明确使用的条件、主要结论与可复核步骤。`),
  }));
}

function plannedItem(id: string, title: string, purpose: string): PlannedItem {
  return { id, title: zh(title), purpose: zh(purpose) };
}

function difficultyFor(level: CurriculumLevel): 1 | 2 | 3 | 4 | 5 {
  if (level === "foundation") return 2;
  if (level === "undergraduate") return 3;
  if (level === "advanced") return 4;
  return 5;
}

export function materializeCurriculum(blueprints: readonly SeriesBlueprint[]): CurriculumDataset {
  const series: CurriculumSeries[] = [];
  const books: CurriculumBook[] = [];
  const parts: CurriculumPart[] = [];
  const chapters: CurriculumChapter[] = [];

  for (const [seriesIndex, seriesBlueprint] of blueprints.entries()) {
    const seriesBooks: string[] = [];
    for (const [bookIndex, bookBlueprint] of seriesBlueprint.books.entries()) {
      const bookId = bookBlueprint.code.toLocaleLowerCase("en");
      const partIds: string[] = [];
      const bookChapterIds: string[] = [];
      let previousChapterId: string | undefined;

      for (const [partIndex, partBlueprint] of bookBlueprint.parts.entries()) {
        const partId = `${bookId}-${partBlueprint.slug}`;
        const partChapterIds: string[] = [];
        for (const [chapterIndex, chapterBlueprint] of partBlueprint.chapters.entries()) {
          const chapterId = `${bookId}-${chapterBlueprint.slug}`;
          const keyTerms = termsFor(
            chapterBlueprint.title,
            partBlueprint.title,
            bookBlueprint.title,
          );
          const primaryTerm = keyTerms[0] ?? chapterBlueprint.title;
          const plannedSections = plannedSectionsFor(chapterId);
          const authoredSummary =
            chapterBlueprint.summary ??
            `${chapterBlueprint.title}：${plannedSections.map((section) => section.title["zh-CN"]).join("、")}。`;
          const chapterSummary = authoredSummary.includes(chapterBlueprint.title)
            ? authoredSummary
            : `${chapterBlueprint.title}：${authoredSummary}`;
          const definitionFocus =
            plannedSections[0]?.title["zh-CN"] ?? `${primaryTerm}的对象与定义`;
          const equationFocus =
            plannedSections[1]?.title["zh-CN"] ?? `${chapterBlueprint.title}的主要关系`;
          const exampleFocus =
            plannedSections[2]?.title["zh-CN"] ?? `${chapterBlueprint.title}的适用边界`;
          const chapterPlanTopic = chapterBlueprint.title.includes("复习")
            ? joinTopics(topicFragments(chapterBlueprint.title)) || bookBlueprint.title
            : chapterBlueprint.title;
          const isReviewChapter =
            partIndex === bookBlueprint.parts.length - 1 &&
            chapterIndex === partBlueprint.chapters.length - 1;
          chapters.push({
            schemaVersion: curriculumSchemaVersion,
            id: chapterId,
            kind: "chapter",
            slug: chapterBlueprint.slug,
            order: chapterIndex + 1,
            title: zh(chapterBlueprint.title),
            shortTitle: zh(chapterBlueprint.title),
            summary: zh(chapterSummary),
            bookId,
            partId,
            level: bookBlueprint.level,
            difficulty: difficultyFor(bookBlueprint.level),
            estimatedMinutes: isReviewChapter ? 55 : 40,
            publicationStatus: chapterBlueprint.contentId ? "preview" : "hidden",
            editorialStatus: chapterBlueprint.contentId ? "draft" : "planned",
            ...(chapterBlueprint.contentId ? { contentId: chapterBlueprint.contentId } : {}),
            prerequisiteChapterIds: previousChapterId ? [previousChapterId] : [],
            conceptIds: [],
            visualizationIds: [],
            resourceIds: [],
            learningObjectives: [
              zh(`准确说明${plannedSections[0]?.title["zh-CN"] ?? chapterBlueprint.title}。`),
              zh(
                `完成${plannedSections[1]?.title["zh-CN"] ?? chapterBlueprint.title}所需的推导、证明或算法。`,
              ),
              zh(
                `使用计算、例题或反例检验${plannedSections[2]?.title["zh-CN"] ?? chapterBlueprint.title}。`,
              ),
            ],
            plannedSections,
            keyTerms,
            plannedDefinitions: [
              plannedItem(
                `definition-${chapterId}-${primaryTerm.length}`,
                `${definitionFocus}：对象、记号与前提`,
                `围绕${definitionFocus}列出主要对象、符号、前提与定义边界。`,
              ),
            ],
            plannedEquations: [
              plannedItem(
                `equation-${chapterId}-primary`,
                `${equationFocus}：关系、判据与可复核步骤`,
                `把${equationFocus}整理为可检查的关系、判据或算法步骤；涉及定量模型时写出公式，并说明符号、适用条件，以及需要时的单位或复杂度。`,
              ),
            ],
            plannedExamples: [
              plannedItem(
                `example-${chapterId}-worked`,
                `${exampleFocus}：案例、反例与核验`,
                `围绕${exampleFocus}给出明确输入、前提或数据，逐步分析并用反例、误差、守恒量或边界条件复核。`,
              ),
            ],
            plannedExercises: [
              plannedItem(
                `exercise-${chapterId}-integrated`,
                `${chapterPlanTopic}：定义、关系与边界综合练习`,
                `联结${definitionFocus}、${equationFocus}与${exampleFocus}，分别检验定义辨析、主要步骤和适用边界。`,
              ),
            ],
          });
          partChapterIds.push(chapterId);
          bookChapterIds.push(chapterId);
          previousChapterId = chapterId;
        }
        parts.push({
          schemaVersion: curriculumSchemaVersion,
          id: partId,
          kind: "part",
          slug: partBlueprint.slug,
          order: partIndex + 1,
          title: zh(partBlueprint.title),
          summary: zh(
            partBlueprint.summary ??
              `${partBlueprint.chapters.map((entry) => entry.title).join("、")}。`,
          ),
          bookId,
          chapterIds: partChapterIds,
        });
        partIds.push(partId);
      }

      const previousBook = seriesBlueprint.books[bookIndex - 1];
      const nextBook = seriesBlueprint.books[bookIndex + 1];
      const prerequisiteBookIds =
        bookBlueprint.prerequisiteBookIds ??
        (previousBook ? [previousBook.code.toLocaleLowerCase("en")] : []);
      const relatedBookIds = [previousBook, nextBook]
        .filter((entry): entry is BookBlueprint => Boolean(entry))
        .map((entry) => entry.code.toLocaleLowerCase("en"));
      const startChapterId = bookChapterIds[0];
      const reviewChapterId = bookChapterIds.at(-1);
      if (!startChapterId || !reviewChapterId) {
        throw new Error(`Book ${bookId} must contain chapters`);
      }
      books.push({
        schemaVersion: curriculumSchemaVersion,
        id: bookId,
        kind: "book",
        slug: bookBlueprint.slug,
        order: bookIndex + 1,
        code: bookBlueprint.code,
        title: zh(bookBlueprint.title),
        shortTitle: zh(`${bookBlueprint.code} ${bookBlueprint.title}`),
        summary: zh(bookBlueprint.summary),
        seriesId: seriesBlueprint.id,
        level: bookBlueprint.level,
        introduction: zh(bookBlueprint.summary),
        audience: zh(
          bookBlueprint.level === "foundation"
            ? "适合开始系统学习数学、物理或计算基础的读者。"
            : bookBlueprint.level === "undergraduate"
              ? "适合已具备基础代数与函数知识、希望完成本科层次系统学习的读者。"
              : bookBlueprint.level === "advanced"
                ? "适合完成相关本科基础课程、需要进入高级理论与计算方法的读者。"
                : "适合准备阅读研究文献并需要统一记号、方法和边界条件的读者。",
        ),
        prerequisiteBookIds,
        symbolConventions: [
          zh(`本册在首次使用时定义${bookBlueprint.title}专用符号，并区分标量、向量、算子与单位。`),
          zh("同一符号出现多种约定时明确命名空间、假设和适用章节。"),
        ],
        partIds,
        startChapterId,
        reviewChapterId,
        integratedExercisePlan: [
          zh("每章安排定义辨析、推导计算和结果核验练习。"),
          zh("本册末章安排跨 Part 综合题，并保留可复算的解题检查点。"),
        ],
        referencePlan: [
          zh(
            `TODO：为《${bookBlueprint.title}》逐项核验权威教材、课程页面或原始论文后登记资源 ID。`,
          ),
        ],
        relatedBookIds,
      });
      seriesBooks.push(bookId);
    }
    series.push({
      schemaVersion: curriculumSchemaVersion,
      id: seriesBlueprint.id,
      kind: "series",
      slug: seriesBlueprint.slug,
      order: seriesIndex + 1,
      title: zh(seriesBlueprint.title),
      summary: zh(seriesBlueprint.summary),
      bookIds: seriesBooks,
    });
  }

  return { schemaVersion: curriculumSchemaVersion, series, books, parts, chapters };
}
