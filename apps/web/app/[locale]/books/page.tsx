import { uiText } from "@one-forth/config";
import { readerCurriculumRepository } from "@one-forth/content";
import { localize } from "@one-forth/registry";
import type { Metadata } from "next";
import Link from "next/link";
import { BookShelf } from "@/components/book-shelf";
import { getBookShelfEntries } from "@/lib/bookshelf";
import { createPageMetadata } from "@/lib/metadata";

interface BooksDirectoryPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en" }>;
}

export async function generateMetadata({ params }: BooksDirectoryPageProps): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    title: uiText[locale].readerInterface.library,
    description: uiText[locale].readerInterface.libraryDescription,
    path: `/${locale}/books`,
  });
}

export default async function BooksDirectoryPage({ params }: BooksDirectoryPageProps) {
  const { locale } = await params;
  const text = uiText[locale].readerInterface;
  const series = readerCurriculumRepository.listSeries();
  const books = await getBookShelfEntries(locale);
  return (
    <main id="main-content" className="curriculum-directory-page">
      <header className="library-heading">
        <nav className="breadcrumbs" aria-label={text.breadcrumbs}>
          <Link href={`/${locale}`}>{uiText[locale].home}</Link>
          <span>/</span>
          <span aria-current="page">{text.library}</span>
        </nav>
        <div className="library-heading__title">
          <h1>{text.library}</h1>
          <span>{text.booksCount.replace("{count}", String(books.length))}</span>
        </div>
        <nav className="library-jump" aria-label={text.library}>
          {series.map((entry) => (
            <a key={entry.id} href={`#${entry.slug}`}>
              {localize(entry.title, locale)}
            </a>
          ))}
        </nav>
      </header>
      {series.map((entry, index) => {
        const entries = books.filter((book) => book.seriesId === entry.id);
        return (
          <section
            className="library-section"
            id={entry.slug}
            key={entry.id}
            aria-labelledby={`library-${entry.id}`}
          >
            <header className="library-section__heading">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2 id={`library-${entry.id}`}>{localize(entry.title, locale)}</h2>
              <span>{text.booksCount.replace("{count}", String(entries.length))}</span>
            </header>
            <BookShelf books={entries} />
          </section>
        );
      })}
    </main>
  );
}
