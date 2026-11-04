import { uiText } from "@one-forth/config";
import { BookShelf } from "@/components/book-shelf";
import { getBookShelfEntries } from "@/lib/bookshelf";
import { readerCurriculumRepository } from "@one-forth/content";
import { localize } from "@one-forth/registry";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPageMetadata } from "@/lib/metadata";

interface SeriesPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en"; series: string }>;
}

export function generateStaticParams() {
  return readerCurriculumRepository
    .listSeries()
    .map((series) => ({ locale: "zh-CN", series: series.slug }));
}

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const { locale, series: seriesSlug } = await params;
  const series = readerCurriculumRepository.getSeriesBySlug(seriesSlug);
  const hasPublishedDescendant = series
    ? readerCurriculumRepository
        .listBooks(series.id)
        .some((book) =>
          readerCurriculumRepository
            .listChapters(book.id)
            .some((chapter) => chapter.publicationStatus === "published"),
        )
    : false;
  return series
    ? createPageMetadata({
        title: localize(series.title, locale),
        description: localize(series.summary, locale),
        path: `/${locale}/books/${series.slug}`,
        publicationStatus: hasPublishedDescendant ? "published" : "preview",
      })
    : {};
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { locale, series: seriesSlug } = await params;
  const series = readerCurriculumRepository.getSeriesBySlug(seriesSlug);
  if (!series) notFound();
  const books = await getBookShelfEntries(locale, readerCurriculumRepository.listBooks(series.id));
  const text = uiText[locale].readerInterface;
  return (
    <main id="main-content" className="curriculum-series-page">
      <header className="library-heading">
        <nav className="breadcrumbs" aria-label={text.breadcrumbs}>
          <Link href={`/${locale}`}>{uiText[locale].home}</Link>
          <span>/</span>
          <Link href={`/${locale}/books`}>{text.library}</Link>
          <span>/</span>
          <span aria-current="page">{localize(series.title, locale)}</span>
        </nav>
        <div className="library-heading__title">
          <h1>{localize(series.title, locale)}</h1>
          <span>{text.booksCount.replace("{count}", String(books.length))}</span>
        </div>
        <nav className="library-jump" aria-label={text.library}>
          <Link href={`/${locale}/books`}>{text.allBooks}</Link>
          {readerCurriculumRepository
            .listSeries()
            .filter((entry) => entry.id !== series.id)
            .map((entry) => (
              <Link href={`/${locale}/books/${entry.slug}`} key={entry.id}>
                {localize(entry.title, locale)}
              </Link>
            ))}
        </nav>
      </header>
      <section className="library-section" aria-label={localize(series.title, locale)}>
        <BookShelf books={books} titleAs="h2" />
      </section>
    </main>
  );
}
