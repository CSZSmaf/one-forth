import type { SupportedLocale } from "@one-forth/config";
import {
  conceptById,
  curriculumRepository,
  type CurriculumChapterContext,
} from "@one-forth/content";
import { localize } from "@one-forth/registry";
import { visualizationManifest } from "@one-forth/visualization";
import Link from "next/link";
import { AnchorCopyEnhancer } from "./anchor-copy-enhancer";

interface PlannedChapterPageProps {
  readonly context: CurriculumChapterContext;
  readonly locale: SupportedLocale;
}

function PlannedGroup({
  title,
  items,
  locale,
}: Readonly<{
  title: string;
  items: CurriculumChapterContext["chapter"]["plannedDefinitions"];
  locale: SupportedLocale;
}>) {
  return (
    <section className="planned-chapter-group">
      <h2>{title}</h2>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <h3>{localize(item.title, locale)}</h3>
            <p>{localize(item.purpose, locale)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PlannedChapterPage({ context, locale }: PlannedChapterPageProps) {
  const { book, chapter, part, previousChapter, nextChapter } = context;
  const bookPath = context.canonicalPath.slice(0, -`/${chapter.slug}`.length);
  const chapterHref = (chapterSlug: string): string => `${bookPath}/${chapterSlug}`;
  const locatedConcepts = chapter.conceptIds.flatMap((conceptId) => {
    const concept = conceptById.get(conceptId);
    if (!concept || concept.canonicalLocation.chapterId !== chapter.id) return [];
    return [{ concept, anchorId: concept.canonicalLocation.anchorId ?? `concept-${concept.id}` }];
  });
  const prerequisiteContexts = chapter.prerequisiteChapterIds.flatMap((chapterId) => {
    const prerequisiteContext = curriculumRepository.getChapterContext(chapterId, locale);
    return prerequisiteContext ? [prerequisiteContext] : [];
  });
  const plannedVisualizations = chapter.visualizationIds.flatMap((visualizationId) => {
    const visualization = visualizationManifest.find((entry) => entry.id === visualizationId);
    return visualization ? [visualization] : [];
  });

  return (
    <main id="main-content" className="planned-chapter-page">
      <AnchorCopyEnhancer />
      <header className="planned-chapter-hero">
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link href={`/${locale}`}>首页</Link>
          <span>/</span>
          <Link href={`/${locale}/books`}>教材目录</Link>
          <span>/</span>
          <Link href={`/${locale}/books/${context.series.slug}`}>
            {localize(context.series.title, locale)}
          </Link>
          <span>/</span>
          <Link href={`/${locale}/books/${context.series.slug}/${book.slug}`}>
            {localize(book.title, locale)}
          </Link>
          <span>/</span>
          <span aria-current="page">{localize(chapter.title, locale)}</span>
        </nav>
        <p className="eyebrow">
          {book.code} · 第 {context.chapterNumber} 章 · 课程规划页
        </p>
        <h1>{localize(chapter.title, locale)}</h1>
        <p>{localize(chapter.summary, locale)}</p>
        <dl className="planned-chapter-facts">
          <div>
            <dt>所在 Part</dt>
            <dd>{localize(part.title, locale)}</dd>
          </div>
          <div>
            <dt>预计学习</dt>
            <dd>{chapter.estimatedMinutes} 分钟</dd>
          </div>
          <div>
            <dt>建设状态</dt>
            <dd>已规划，尚无正式正文</dd>
          </div>
        </dl>
      </header>

      <aside className="planned-chapter-notice" aria-label="内容状态说明">
        本页公开课程设计范围，帮助读者判断学习顺序；它不是已经完成或经过审阅的教材正文。
      </aside>

      <section className="planned-chapter-support" aria-labelledby="chapter-preparation">
        <div>
          <h2 id="chapter-preparation">预备知识</h2>
          {prerequisiteContexts.length > 0 ? (
            <ol>
              {prerequisiteContexts.map((prerequisite) => (
                <li key={prerequisite.chapter.id}>
                  <Link href={prerequisite.canonicalPath}>
                    {prerequisite.book.code} · 第 {prerequisite.chapterNumber} 章{" "}
                    {localize(prerequisite.chapter.title, locale)}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p>本章没有登记站内章节先修，可按本册顺序进入。</p>
          )}
        </div>
        <div>
          <h2>计划实验</h2>
          {plannedVisualizations.length > 0 ? (
            <ol>
              {plannedVisualizations.map((visualization) => (
                <li key={visualization.id}>
                  <Link
                    href={`/${locale}/playground?figure=${visualization.id}#figure-${visualization.id}`}
                  >
                    {localize(visualization.title, locale)}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p>本章未登记独立交互实验；定义、公式和例题仍按下列提纲规划。</p>
          )}
        </div>
      </section>

      <section className="planned-chapter-objectives" aria-labelledby="chapter-objectives">
        <p className="eyebrow">LEARNING OBJECTIVES</p>
        <h2 id="chapter-objectives">完成本章后应能</h2>
        <ol>
          {chapter.learningObjectives.map((objective, index) => (
            <li key={objective["zh-CN"]}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {localize(objective, locale)}
            </li>
          ))}
        </ol>
      </section>

      <section className="planned-chapter-sections" aria-labelledby="chapter-sections">
        <p className="eyebrow">PLANNED SECTIONS</p>
        <h2 id="chapter-sections">计划章节结构</h2>
        <ol>
          {chapter.plannedSections.map((section, index) => (
            <li key={section.id} id={section.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{localize(section.title, locale)}</h3>
                <p>{localize(section.summary, locale)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="planned-chapter-groups">
        <PlannedGroup title="计划定义" items={chapter.plannedDefinitions} locale={locale} />
        <PlannedGroup title="计划公式" items={chapter.plannedEquations} locale={locale} />
        <PlannedGroup title="计划例题" items={chapter.plannedExamples} locale={locale} />
        <PlannedGroup title="计划练习" items={chapter.plannedExercises} locale={locale} />
      </div>

      {locatedConcepts.length > 0 ? (
        <section className="planned-chapter-concepts" aria-labelledby="chapter-concepts">
          <h2 id="chapter-concepts">本章概念落点</h2>
          <p>以下位置是术语、搜索和知识图谱引用本计划章节时使用的稳定链接。</p>
          <ol>
            {locatedConcepts.map(({ concept, anchorId }) => (
              <li
                key={concept.id}
                id={anchorId}
                className="article-concept-anchor"
                aria-label={localize(concept.title, locale)}
              >
                <strong>{localize(concept.title, locale)}</strong>
                <span>{localize(concept.summary, locale)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="planned-chapter-terms" aria-labelledby="chapter-terms">
        <h2 id="chapter-terms">关键词</h2>
        <p>{chapter.keyTerms.join("、")}</p>
      </section>

      <nav className="planned-chapter-adjacent" aria-label="相邻章节">
        {previousChapter ? (
          <Link href={chapterHref(previousChapter.slug)}>
            <span>上一章</span>
            {localize(previousChapter.title, locale)}
          </Link>
        ) : (
          <span />
        )}
        {nextChapter ? (
          <Link href={chapterHref(nextChapter.slug)}>
            <span>下一章</span>
            {localize(nextChapter.title, locale)}
          </Link>
        ) : (
          <Link href={`/${locale}/books/${context.series.slug}/${book.slug}`}>
            <span>本册结束</span>
            返回完整目录
          </Link>
        )}
      </nav>
    </main>
  );
}
