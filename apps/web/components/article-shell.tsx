import { siteConfig, type SupportedLocale } from "@one-forth/config";
import {
  isRecentUpdateRevision,
  readerConceptById,
  readerCurriculumRepository,
  type ContentDocument,
  type RevisionHistoryEntry,
} from "@one-forth/content";
import { localize } from "@one-forth/registry";
import { BookOpen, ChevronLeft, ChevronRight, Clock3, ListTree } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { TableOfContentsItem } from "@/lib/content-utils";
import { resolveConceptLabel } from "@/lib/labels";
import { getConceptChapterMigrationMap } from "@/lib/learning-migration";
import { ArticleBookNavigation, type ArticleBookNavigationPart } from "./article-book-navigation";
import { ArticleProgress } from "./article-progress";
import { ArticleTableOfContents } from "./article-toc";
import { AnchorCopyEnhancer } from "./anchor-copy-enhancer";
import { ChapterLearningProvider } from "./chapter-learning-context";
import { MathRichTextContent } from "./math-rich-text";

interface ArticleShellProps {
  readonly document: ContentDocument;
  /** @deprecated Textbook order is derived from CurriculumRepository. */
  readonly documents?: readonly ContentDocument[];
  readonly tableOfContents: readonly TableOfContentsItem[];
  readonly children: ReactNode;
}

function latestSubstantiveRevision(
  revisions: readonly RevisionHistoryEntry[],
): RevisionHistoryEntry | undefined {
  return revisions.reduce<RevisionHistoryEntry | undefined>((latest, revision) => {
    if (!isRecentUpdateRevision(revision)) return latest;
    return !latest || revision.date > latest.date ? revision : latest;
  }, undefined);
}

function chapterHref(chapterId: string, locale: SupportedLocale): string {
  const context = readerCurriculumRepository.getChapterContext(chapterId, locale);
  if (!context) throw new Error(`Curriculum context is missing for chapter ${chapterId}`);
  return context.canonicalPath;
}

export function ArticleShell({ document, tableOfContents, children }: ArticleShellProps) {
  const { frontmatter } = document;
  const locale = document.locale;
  const conceptChapterMap = getConceptChapterMigrationMap(locale);
  const chapter = readerCurriculumRepository.getChapterForContent(frontmatter.id);
  if (!chapter) {
    throw new Error(`Document ${frontmatter.id} is not assigned to a curriculum chapter`);
  }
  const chapterContext = readerCurriculumRepository.getChapterContext(chapter.id, locale);
  if (!chapterContext) {
    throw new Error(`Curriculum context is incomplete for chapter ${chapter.id}`);
  }
  const { series, book, part } = chapterContext;
  const legacyConceptIds = Object.keys(conceptChapterMap).filter(
    (id) => conceptChapterMap[id] === chapterContext.canonicalPath,
  );
  const bookChapters = readerCurriculumRepository.listChapters(book.id);
  const parts: readonly ArticleBookNavigationPart[] = readerCurriculumRepository
    .listParts(book.id)
    .map((entry) => ({
      title: localize(entry.title, locale),
      current: entry.id === part.id,
      chapters: entry.chapterIds.map((chapterId) => {
        const entryChapter = readerCurriculumRepository.getChapter(chapterId);
        if (!entryChapter) throw new Error(`Curriculum chapter ${chapterId} is missing`);
        return {
          title: localize(entryChapter.shortTitle ?? entryChapter.title, locale),
          href: chapterHref(entryChapter.id, locale),
          current: entryChapter.id === chapter.id,
          number: bookChapters.findIndex((item) => item.id === entryChapter.id) + 1,
        };
      }),
    }));
  const previous = chapterContext.previousChapter;
  const next = chapterContext.nextChapter;
  const substantiveRevision = latestSubstantiveRevision(frontmatter.revisionHistory);
  const reportErrorUrl = new URL(`/${locale}/contribute`, `${siteConfig.url}/`);
  reportErrorUrl.searchParams.set("topic", frontmatter.title);
  reportErrorUrl.searchParams.set(
    "source",
    new URL(chapterContext.canonicalPath, `${siteConfig.url}/`).toString(),
  );
  const prerequisiteLinks = [
    ...chapter.prerequisiteChapterIds.map((chapterId) => {
      const prerequisite = readerCurriculumRepository.getChapter(chapterId);
      return prerequisite
        ? {
            id: chapterId,
            label: localize(prerequisite.shortTitle ?? prerequisite.title, locale),
            href: chapterHref(chapterId, locale),
          }
        : null;
    }),
    ...frontmatter.prerequisites.map((conceptId) => {
      const concept = readerConceptById.get(conceptId);
      const href = concept
        ? readerCurriculumRepository.resolveCanonicalLocation(concept.canonicalLocation, locale)
        : null;
      return href ? { id: conceptId, label: resolveConceptLabel(conceptId, locale), href } : null;
    }),
  ].filter(
    (entry, index, entries): entry is NonNullable<typeof entry> =>
      entry !== null && entries.findIndex((candidate) => candidate?.href === entry.href) === index,
  );

  return (
    <ChapterLearningProvider
      value={{
        chapterId: chapterContext.canonicalPath,
        legacyDocumentPath: `/${locale}/learn/${document.slug.join("/")}`,
      }}
    >
      <main id="main-content" className="article-layout">
        <ArticleBookNavigation
          locale={locale}
          bookTitle={`${book.code} · ${localize(book.title, locale)}`}
          bookHref={`/${locale}/books/${series.slug}/${book.slug}`}
          chapterPosition={`第 ${chapterContext.chapterNumber}/${chapterContext.chapterCount} 章`}
          parts={parts}
        />
        <article className="article-main">
          <AnchorCopyEnhancer />
          <nav className="breadcrumbs" aria-label="面包屑">
            <Link href={`/${locale}`}>首页</Link>
            <span>/</span>
            <Link href={`/${locale}/books`}>教材</Link>
            <span>/</span>
            <Link href={`/${locale}/books/${series.slug}`}>{localize(series.title, locale)}</Link>
            <span>/</span>
            <Link href={`/${locale}/books/${series.slug}/${book.slug}`}>
              {localize(book.title, locale)}
            </Link>
            <span>/</span>
            <span aria-current="page">第 {chapterContext.chapterNumber} 章</span>
          </nav>
          <header className="article-header">
            <p className="article-chapter-number">
              {book.code} · 第 {chapterContext.chapterNumber} 章 · {localize(part.title, locale)}
            </p>
            <h1>{frontmatter.title}</h1>
            <p className="lead">{frontmatter.summary}</p>
            <div className="article-meta">
              <span>
                <BookOpen aria-hidden="true" size={15} />
                难度 {frontmatter.difficulty}/5
              </span>
              <span>
                <Clock3 aria-hidden="true" size={15} />约 {frontmatter.estimatedMinutes} 分钟
              </span>
              {substantiveRevision ? <span>最近修订 {substantiveRevision.date}</span> : null}
              <a className="article-report-link" href={reportErrorUrl.toString()}>
                报告页面错误
              </a>
            </div>
            {prerequisiteLinks.length > 0 ? (
              <div className="article-prerequisites">
                <span>预备知识</span>
                {prerequisiteLinks.map((item) => (
                  <Link key={`${item.id}-${item.href}`} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
            <section className="learning-objectives" aria-labelledby="learning-objectives-title">
              <h2 id="learning-objectives-title">本章目标</h2>
              <ol>
                {frontmatter.learningObjectives.map((objective) => (
                  <li key={objective}>
                    <MathRichTextContent value={objective} />
                  </li>
                ))}
              </ol>
            </section>
            <ArticleProgress
              chapterId={chapterContext.canonicalPath}
              legacyConceptIds={legacyConceptIds}
              conceptChapterMap={conceptChapterMap}
              bookChapterIds={bookChapters.map((entry) => chapterHref(entry.id, locale))}
            />
            <details className="article-mobile-toc">
              <summary>
                <ListTree aria-hidden="true" size={16} />
                本页目录
              </summary>
              <ArticleTableOfContents
                chapterId={chapterContext.canonicalPath}
                legacyConceptIds={legacyConceptIds}
                items={tableOfContents}
                ariaLabel="移动端页内目录"
                viewport="mobile"
              />
            </details>
          </header>
          <div id="article-overview" className="article-prose">
            {children}
          </div>
          <nav className="article-pagination" aria-label="前后章节">
            {previous ? (
              <Link href={chapterHref(previous.id, locale)} rel="prev">
                <ChevronLeft aria-hidden="true" size={17} />
                <span>
                  <small>上一章</small>
                  {localize(previous.shortTitle ?? previous.title, locale)}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                className="article-pagination__next"
                href={chapterHref(next.id, locale)}
                rel="next"
              >
                <span>
                  <small>下一章</small>
                  {localize(next.shortTitle ?? next.title, locale)}
                </span>
                <ChevronRight aria-hidden="true" size={17} />
              </Link>
            ) : (
              <Link
                className="article-pagination__next"
                href={`/${locale}/books/${series.slug}/${book.slug}`}
              >
                <span>
                  <small>完成本册</small>
                  返回本册目录
                </span>
                <ChevronRight aria-hidden="true" size={17} />
              </Link>
            )}
          </nav>
        </article>
        <aside className="article-right" aria-label="页内目录">
          <div className="article-side__label">本页目录</div>
          <ArticleTableOfContents
            chapterId={chapterContext.canonicalPath}
            legacyConceptIds={legacyConceptIds}
            items={tableOfContents}
            ariaLabel="文章页内目录"
            viewport="desktop"
          />
        </aside>
      </main>
    </ChapterLearningProvider>
  );
}
