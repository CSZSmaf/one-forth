import { describe, expect, it } from "vitest";
import { conceptCatalog } from "../concepts";
import { contentRepository, GeneratedContentRepository } from "../index";
import { curriculumData, curriculumVisualizationBindings } from "./data";
import { InMemoryCurriculumRepository } from "./repository";
import { curriculumSectionPlans } from "./section-plans";

const repository = new InMemoryCurriculumRepository(curriculumData, conceptCatalog);

describe("curriculum catalog", () => {
  it("materializes the required four-series, fifty-two-book curriculum", () => {
    expect(curriculumData.schemaVersion).toBe(2);
    expect(curriculumData.series).toHaveLength(4);
    expect(curriculumData.books).toHaveLength(52);
    expect(curriculumData.parts).toHaveLength(156);
    expect(curriculumData.chapters).toHaveLength(312);

    expect(repository.listBooks("mathematics")).toHaveLength(17);
    expect(repository.listBooks("physics")).toHaveLength(13);
    expect(repository.listBooks("computer-science")).toHaveLength(7);
    expect(repository.listBooks("artificial-intelligence")).toHaveLength(15);
  });

  it("gives every book and chapter a complete, topic-specific plan", () => {
    for (const book of curriculumData.books) {
      expect(book.partIds.length, book.id).toBeGreaterThanOrEqual(3);
      expect(book.partIds.length, book.id).toBeLessThanOrEqual(8);
      expect(repository.listChapters(book.id).length, book.id).toBeGreaterThanOrEqual(6);
      expect(repository.getChapter(book.startChapterId), book.id).not.toBeNull();
      expect(repository.getChapter(book.reviewChapterId), book.id).not.toBeNull();
    }

    for (const chapter of curriculumData.chapters) {
      const title = chapter.title["zh-CN"];
      const summary = chapter.summary["zh-CN"].trim();
      expect(title.trim(), chapter.id).not.toBe("");
      expect(summary.length, chapter.id).toBeGreaterThanOrEqual(20);
      expect(summary, chapter.id).toContain(title);
      const topicTerms = [
        ...chapter.keyTerms,
        ...chapter.learningObjectives.map((objective) => objective["zh-CN"]),
        ...chapter.plannedSections.map((section) => section.title["zh-CN"]),
        ...title.split(/[、，：；与及]/u),
      ].filter((term) => term.trim().length >= 2);
      const topicFragments = topicTerms.flatMap((term) => {
        const characters = Array.from(term.replace(/[^\p{L}\p{N}]+/gu, ""));
        return characters
          .slice(0, -1)
          .map((_, index) => characters.slice(index, index + 2).join(""));
      });
      expect(
        topicFragments.some((fragment) => summary.includes(fragment)),
        `${chapter.id}: ${summary}`,
      ).toBe(true);
      expect(chapter.learningObjectives.length, chapter.id).toBeGreaterThanOrEqual(3);
      expect(chapter.plannedSections.length, chapter.id).toBeGreaterThanOrEqual(3);
      expect(chapter.keyTerms.length, chapter.id).toBeGreaterThan(0);
      expect(chapter.plannedDefinitions.length, chapter.id).toBeGreaterThan(0);
      expect(chapter.plannedEquations.length, chapter.id).toBeGreaterThan(0);
      expect(chapter.plannedExamples.length, chapter.id).toBeGreaterThan(0);
      expect(chapter.plannedExercises.length, chapter.id).toBeGreaterThan(0);
      const sectionTitles = chapter.plannedSections.map((section) => section.title["zh-CN"].trim());
      sectionTitles.forEach((sectionTitle, index) =>
        expect(sectionTitle, `${chapter.id}/${chapter.plannedSections[index]?.id}`).not.toBe(""),
      );
      expect(new Set(sectionTitles).size, chapter.id).toBe(sectionTitles.length);
      expect(chapter.plannedDefinitions[0]?.title["zh-CN"], chapter.id).toContain(sectionTitles[0]);
      expect(chapter.plannedEquations[0]?.title["zh-CN"], chapter.id).toContain(sectionTitles[1]);
      expect(chapter.plannedExamples[0]?.title["zh-CN"], chapter.id).toContain(sectionTitles[2]);
      const exerciseTopic = title.includes("复习") ? chapter.keyTerms[0] : title;
      expect(chapter.plannedExercises[0]?.title["zh-CN"], chapter.id).toContain(exerciseTopic);
      [
        `${title}：研究对象、记号与问题设定`,
        `${title}：关键结构、命题与推导`,
        `${title}：例题、反例与适用边界`,
      ].forEach((legacyTitle) => expect(sectionTitles, chapter.id).not.toContain(legacyTitle));
    }

    const allSectionTitles = curriculumData.chapters.flatMap((chapter) =>
      chapter.plannedSections.map((section) => section.title["zh-CN"].trim()),
    );
    expect(allSectionTitles).toHaveLength(936);
    expect(new Set(allSectionTitles).size).toBe(allSectionTitles.length);
  });

  it("requires one explicit, non-template outline for every Chapter", () => {
    const chapterIds = curriculumData.chapters.map((chapter) => chapter.id).sort();
    const plannedChapterIds = Object.keys(curriculumSectionPlans).sort();
    expect(plannedChapterIds).toEqual(chapterIds);

    const outlines = Object.entries(curriculumSectionPlans).map(([chapterId, sections]) => {
      expect(sections, chapterId).toHaveLength(3);
      sections.forEach((section) => {
        expect(section.trim(), chapterId).not.toBe("");
        expect(section, chapterId).not.toMatch(
          /研究对象、记号与问题设定|关键结构、命题与推导|例题、反例与适用边界|综合复习|复习的(?:对象|定义|条件|判据|联系|问题设定|主要关系)/u,
        );
      });
      return sections.join("\u241f");
    });

    expect(new Set(outlines).size).toBe(outlines.length);
  });

  it("keeps every title fragment in generated multi-topic outlines", () => {
    const cases = [
      ["c00-programs-types-control", ["程序", "类型", "控制流", "函数"]],
      ["c01-sequences-trees", ["序列", "栈", "队列", "树", "堆"]],
      ["m07-graphs-connectivity", ["图", "路径", "连通性", "树"]],
      ["p03-wave-parameters-superposition", ["行波", "相位", "叠加", "色散"]],
      ["a00-data-splits-leakage", ["训练", "验证", "测试", "数据泄漏"]],
      ["m09-distributions-sampling", ["广义函数", "采样", "Poisson 求和"]],
    ] as const;

    for (const [chapterId, fragments] of cases) {
      const chapter = repository.getChapter(chapterId);
      expect(chapter, chapterId).not.toBeNull();
      const outline = chapter?.plannedSections.map((section) => section.title["zh-CN"]).join("\n");
      fragments.forEach((fragment) =>
        expect(outline, `${chapterId}/${fragment}`).toContain(fragment),
      );
    }

    expect(repository.getChapter("c01-sequences-trees")?.keyTerms).toContain("堆");
    expect(repository.getChapter("m09-distributions-sampling")?.keyTerms).toContain("Poisson 求和");
  });

  it("turns review labels into subject matter instead of outline filler", () => {
    const reviewChapters = curriculumData.chapters.filter((chapter) =>
      chapter.title["zh-CN"].includes("复习"),
    );
    expect(reviewChapters).toHaveLength(47);
    for (const chapter of reviewChapters) {
      const sectionTitles = chapter.plannedSections.map((section) => section.title["zh-CN"]);
      expect(sectionTitles.join("\n"), chapter.id).not.toContain("综合复习");
      expect(sectionTitles.join("\n"), chapter.id).not.toMatch(
        /复习的(?:对象|定义|条件|判据|联系|问题设定|主要关系)/u,
      );
      const plannedItemTitles = [
        ...chapter.plannedDefinitions,
        ...chapter.plannedEquations,
        ...chapter.plannedExamples,
        ...chapter.plannedExercises,
      ].map((item) => item.title["zh-CN"]);
      expect(plannedItemTitles.join("\n"), chapter.id).not.toContain("复习");
    }
  });

  it("uses canonical terminology and honest Part scope", () => {
    const schedulesChapter = repository.getChapter("a05-schedules-second-order");
    expect(schedulesChapter?.title["zh-CN"]).toBe("学习率调度与二阶近似");
    expect(schedulesChapter?.keyTerms).toContain("学习率调度");
    expect(schedulesChapter?.keyTerms).not.toContain("学习率计划");

    const molecularSimulationPart = repository.getPart("p11-stochastic");
    expect(molecularSimulationPart?.title["zh-CN"]).toBe("第二编 随机模拟与分子动力学");
    expect(molecularSimulationPart?.chapterIds).toContain("p11-molecular-dynamics");
    expect(molecularSimulationPart?.chapterIds).toContain("p11-monte-carlo");
  });

  it("maps every current content document to one unique chapter", async () => {
    const documents = await contentRepository.listDocuments({ locale: "zh-CN" });
    const contentIds = curriculumData.chapters.flatMap((chapter) =>
      chapter.contentId ? [chapter.contentId] : [],
    );
    expect(contentIds).toHaveLength(documents.length);
    expect(new Set(contentIds).size).toBe(documents.length);
    contentIds.forEach((contentId) =>
      expect(repository.getChapterForContent(contentId), contentId).not.toBeNull(),
    );
  });

  it("binds authored dual states and keeps un-authored plans hidden", async () => {
    const documents = await contentRepository.listDocuments({ locale: "zh-CN" });
    const documentsById = new Map(
      documents.map((document) => [document.frontmatter.id, document] as const),
    );
    const authored = curriculumData.chapters.filter((chapter) => chapter.contentId);
    const planned = curriculumData.chapters.filter((chapter) => !chapter.contentId);

    const previewCount = documents.filter(
      (document) => document.frontmatter.publicationStatus === "preview",
    ).length;
    const publishedCount = documents.filter(
      (document) => document.frontmatter.publicationStatus === "published",
    ).length;
    expect(authored).toHaveLength(documents.length);
    expect(planned).toHaveLength(curriculumData.chapters.length - documents.length);
    expect(await contentRepository.listDocuments({ publicationStatus: "preview" })).toHaveLength(
      previewCount,
    );
    expect(await contentRepository.listDocuments({ publicationStatus: "published" })).toHaveLength(
      publishedCount,
    );
    for (const chapter of authored) {
      const document = chapter.contentId ? documentsById.get(chapter.contentId) : undefined;
      expect(document, chapter.id).toBeDefined();
      expect(chapter.publicationStatus, chapter.id).toBe(document?.frontmatter.publicationStatus);
      expect(chapter.editorialStatus, chapter.id).toBe(document?.frontmatter.editorialStatus);
    }
    for (const chapter of planned) {
      expect(chapter.publicationStatus, chapter.id).toBe("hidden");
      expect(chapter.editorialStatus, chapter.id).toBe("planned");
    }
  });

  it("derives every visualization binding from authored content", async () => {
    const documents = await contentRepository.listDocuments({ locale: "zh-CN" });
    const authoredVisualizationIds = [
      ...new Set(documents.flatMap((document) => document.frontmatter.visualizations)),
    ].sort((left, right) => left.localeCompare(right, "en"));
    expect(curriculumVisualizationBindings.map((binding) => binding.visualizationId)).toEqual(
      authoredVisualizationIds,
    );
    expect(authoredVisualizationIds.length).toBeGreaterThanOrEqual(16);
    for (const document of documents) {
      const chapter = repository.getChapterForContent(document.frontmatter.id);
      expect(chapter, document.frontmatter.id).not.toBeNull();
      expect(chapter?.visualizationIds, document.frontmatter.id).toEqual(
        [...document.frontmatter.visualizations].sort((left, right) =>
          left.localeCompare(right, "en"),
        ),
      );
    }

    for (const binding of curriculumVisualizationBindings) {
      expect(repository.getVisualizationBinding(binding.visualizationId)).toEqual(binding);
      expect(repository.getPrimaryChapterForVisualization(binding.visualizationId)?.id).toBe(
        binding.primaryChapterId,
      );
      expect(repository.getChapter(binding.primaryChapterId)?.visualizationIds).toContain(
        binding.visualizationId,
      );
    }
  });

  it("exposes canonical book URLs while retaining legacy learn-slug lookup", async () => {
    const document = await contentRepository.getDocumentBySlug(
      ["mathematics", "linear-algebra", "vectors"],
      "zh-CN",
    );
    expect(document?.frontmatter.id).toBe("vectors");
    expect(document?.slug).toEqual(["mathematics", "linear-algebra", "vectors"]);
    expect(document?.url).toBe("/zh-CN/books/mathematics/linear-algebra/vectors-coordinates");
  });

  it("preserves the source URL when a document has no curriculum mapping", async () => {
    const source = await contentRepository.getDocument("vectors", "zh-CN");
    expect(source).not.toBeNull();
    if (!source) return;
    const unmapped = {
      ...source,
      documentId: "zh-CN/unmapped-document",
      url: "/zh-CN/learn/unmapped-document",
      slug: ["unmapped-document"],
      frontmatter: { ...source.frontmatter, id: "unmapped-document" },
    };
    const isolated = new GeneratedContentRepository([unmapped], conceptCatalog, repository);

    expect((await isolated.getDocument("unmapped-document", "zh-CN"))?.url).toBe(
      "/zh-CN/learn/unmapped-document",
    );
    expect(await isolated.getDocumentBySlug(["unmapped-document"], "zh-CN")).not.toBeNull();
  });

  it("derives route, numbering, breadcrumbs, adjacency and progress", () => {
    const book = curriculumData.books[0];
    expect(book).toBeDefined();
    if (!book) return;
    const chapters = repository.listChapters(book.id);
    const first = chapters[0];
    const second = chapters[1];
    const last = chapters.at(-1);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(last).toBeDefined();
    if (!first || !second || !last) return;

    const context = repository.getChapterContext(second.id, "zh-CN");
    expect(context?.chapterNumber).toBe(2);
    expect(context?.chapterCount).toBe(chapters.length);
    expect(context?.previousChapter?.id).toBe(first.id);
    expect(context?.nextChapter?.id).toBe(chapters[2]?.id);
    expect(context?.breadcrumbs.map((entry) => entry.kind)).toEqual([
      "series",
      "book",
      "part",
      "chapter",
    ]);
    expect(context?.canonicalPath).toMatch(/^\/zh-CN\/books\/[^/]+\/[^/]+\/[^/]+$/);
    expect(context?.canonicalPath.split("/")).not.toContain(context?.part.slug);

    expect(repository.getChapterContext(first.id, "zh-CN")?.previousChapter).toBeUndefined();
    expect(repository.getChapterContext(last.id, "zh-CN")?.nextChapter).toBeUndefined();
    expect(repository.getBookProgress(book.id, new Set([first.id, second.id]), second.id)).toEqual({
      bookId: book.id,
      completedChapters: 2,
      totalChapters: chapters.length,
      percent: 33,
      currentChapterId: second.id,
    });
  });

  it("resolves every concept to a real canonical chapter and reverse index", () => {
    expect(conceptCatalog.length).toBeGreaterThan(0);
    for (const concept of conceptCatalog) {
      const chapter = repository.getChapter(concept.canonicalLocation.chapterId);
      expect(chapter, concept.id).not.toBeNull();
      expect(chapter?.conceptIds, concept.id).toContain(concept.id);
      expect(
        repository.resolveCanonicalLocation(concept.canonicalLocation, "zh-CN"),
        concept.id,
      ).toMatch(/^\/zh-CN\/books\/[^/]+\/[^/]+\/[^/#]+(?:#[^#]+)?$/);
    }
  });
});
