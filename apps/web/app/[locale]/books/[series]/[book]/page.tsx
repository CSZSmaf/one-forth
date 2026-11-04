import { BookCover } from "@one-forth/ui";
import { ArrowUpRight } from "lucide-react";
import { getBookShelfEntries } from "@/lib/bookshelf";
import { getBookReferences } from "@/lib/book-references";
import { siteConfig, uiText } from "@one-forth/config";
import { readerCurriculumRepository } from "@one-forth/content";
import { localize } from "@one-forth/registry";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCurriculumAction } from "@/components/book-curriculum-action";
import { createPageMetadata } from "@/lib/metadata";

interface BookPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en"; series: string; book: string }>;
}

export function generateStaticParams() {
  return readerCurriculumRepository.listSeries().flatMap((series) =>
    readerCurriculumRepository.listBooks(series.id).map((book) => ({
      locale: "zh-CN",
      series: series.slug,
      book: book.slug,
    })),
  );
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { locale, series, book } = await params;
  const entry = readerCurriculumRepository.getBookByRoute(series, book);
  const chapters = entry ? readerCurriculumRepository.listChapters(entry.id) : [];
  const hasPublishedDescendant = chapters.some(
    (chapter) => chapter.publicationStatus === "published",
  );
  return entry
    ? createPageMetadata({
        title: localize(entry.title, locale),
        description: localize(entry.summary, locale),
        path: `/${locale}/books/${series}/${book}`,
        publicationStatus: hasPublishedDescendant ? "published" : "preview",
      })
    : {};
}

export default async function BookPage({ params }: BookPageProps) {
  const { locale, series: seriesSlug, book: bookSlug } = await params;
  const book = readerCurriculumRepository.getBookByRoute(seriesSlug, bookSlug);
  const series = readerCurriculumRepository.getSeriesBySlug(seriesSlug);
  if (!book || !series) notFound();
  const parts = readerCurriculumRepository.listParts(book.id);
  const chapters = readerCurriculumRepository.listChapters(book.id);
  const startChapter = readerCurriculumRepository.getChapter(book.startChapterId);
  if (!startChapter) notFound();
  const relatedBooks = book.relatedBookIds.flatMap((relatedBookId) => {
    const relatedBook = readerCurriculumRepository.getBook(relatedBookId);
    const relatedSeries = relatedBook
      ? readerCurriculumRepository.getSeries(relatedBook.seriesId)
      : null;
    return relatedBook && relatedSeries ? [{ book: relatedBook, series: relatedSeries }] : [];
  });
  const bookHref = `/${locale}/books/${series.slug}/${book.slug}`;
  const chapterHref = (slug: string) => `${bookHref}/${slug}`;
  const bookActionChapters = chapters.map((chapter) => ({
    chapterId: chapterHref(chapter.slug),
    chapterNumber:
      readerCurriculumRepository.getChapterContext(chapter.id, locale)?.chapterNumber ??
      chapter.order,
    title: localize(chapter.title, locale),
    href: chapterHref(chapter.slug),
  }));
  const startActionChapter = bookActionChapters.find(
    (chapter) => chapter.href === chapterHref(startChapter.slug),
  );
  if (!startActionChapter) notFound();
  const text = uiText[locale].readerInterface;
  const references = await getBookReferences(book.id, locale);
  const [cover] = await getBookShelfEntries(locale, [book]);
  if (!cover) notFound();
  return (
    <main id="main-content" className="book-page">
      <nav className="breadcrumbs book-breadcrumbs" aria-label={text.breadcrumbs}>
        <Link href={`/${locale}`}>{uiText[locale].home}</Link>
        <span>/</span>
        <Link href={`/${locale}/books#${series.slug}`}>{text.library}</Link>
        <span>/</span>
        <span aria-current="page">{localize(book.title, locale)}</span>
      </nav>
      <div className="book-reading-layout">
        <header className="book-overview">
          <BookCover
            code={cover.code}
            title={cover.title}
            series={cover.seriesTitle}
            publisher={siteConfig.brand.wordmark}
            color={cover.color}
            variant={cover.variant}
            titleAs="h1"
          />
          <div className="book-overview__details">
            <p className="book-overview__summary">{cover.summary}</p>
            <p className="book-overview__structure">{cover.structure}</p>
            <BookCurriculumAction
              locale={locale}
              startChapter={startActionChapter}
              chapters={bookActionChapters}
            />
          </div>
        </header>

        <section className="book-contents" aria-labelledby="book-contents-title">
          <header className="book-contents__heading">
            <h2 id="book-contents-title">{text.bookContents}</h2>
            <span>{text.chaptersCount.replace("{count}", String(chapters.length))}</span>
          </header>
          {parts.map((part) => (
            <section key={part.id} id={part.id} className="book-part">
              <h3>{localize(part.title, locale)}</h3>
              <ol>
                {part.chapterIds.map((chapterId) => {
                  const chapter = readerCurriculumRepository.getChapter(chapterId);
                  if (!chapter) return null;
                  const context = readerCurriculumRepository.getChapterContext(chapter.id, locale);
                  return (
                    <li key={chapter.id}>
                      <Link href={chapterHref(chapter.slug)}>
                        <span className="book-part__number">
                          {String(context?.chapterNumber ?? chapter.order).padStart(2, "0")}
                        </span>
                        <h4>{localize(chapter.title, locale)}</h4>
                        <span className="book-part__leader" aria-hidden="true" />
                        <ArrowUpRight aria-hidden="true" size={15} />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </section>
      </div>

      <section className="book-closing">
        {book.prerequisiteBookIds.length > 0 ? (
          <div>
            <h2>{text.bookPrerequisites}</h2>
            <ul>
              {book.prerequisiteBookIds.map((id) => {
                const prerequisite = readerCurriculumRepository.getBook(id);
                const prerequisiteSeries = prerequisite
                  ? readerCurriculumRepository.getSeries(prerequisite.seriesId)
                  : null;
                return prerequisite && prerequisiteSeries ? (
                  <li key={id}>
                    <Link href={`/${locale}/books/${prerequisiteSeries.slug}/${prerequisite.slug}`}>
                      {prerequisite.code} {localize(prerequisite.title, locale)}
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        ) : null}
        {relatedBooks.length > 0 ? (
          <div>
            <h2>{text.relatedBooks}</h2>
            <ul>
              {relatedBooks.map((related) => (
                <li key={related.book.id}>
                  <Link href={`/${locale}/books/${related.series.slug}/${related.book.slug}`}>
                    {related.book.code} {localize(related.book.title, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {references.length > 0 ? (
          <div>
            <h2>{text.references}</h2>
            <ul>
              {references.map((resource) => (
                <li key={resource.id}>
                  <a
                    href={
                      resource.links.official ??
                      resource.links.doi ??
                      resource.links.arxiv ??
                      resource.links.code
                    }
                    rel="noreferrer"
                  >
                    {resource.title}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}
