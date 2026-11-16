import { siteConfig, uiText } from "@one-forth/config";
import { readerContentRepository } from "@one-forth/content";
import { localize } from "@one-forth/registry";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import {
  HomeCurriculumAction,
  type HomeCurriculumChapterDto,
} from "@/components/home-curriculum-action";
import { createPageMetadata } from "@/lib/metadata";
import { getConceptChapterMigrationMap } from "@/lib/learning-migration";

export const metadata = createPageMetadata({
  title: "One Forth 数字教材",
  description: "数学、物理、计算机与人工智能教材，包含推导、例题、练习和交互实验。",
  path: "/zh-CN",
});

interface HomePageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en" }>;
}

export default async function LocaleHomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const text = uiText[locale].textbookHome;
  const curriculum = readerContentRepository.curriculum;
  const series = curriculum.listSeries();
  const chapters = curriculum.listChapters();
  const firstSeries = series[0];

  if (!firstSeries) return <EmptyLibraryHome locale={locale} />;

  const firstBook = curriculum.listBooks(firstSeries.id)[0];
  if (!firstBook) {
    throw new Error(`The first curriculum series ${firstSeries.id} has no registered book.`);
  }

  const firstBookTitle = localize(firstBook.title, locale);
  const startChapter = curriculum.getChapter(firstBook.startChapterId);
  if (!startChapter) {
    throw new Error(
      `The start chapter ${firstBook.startChapterId} for book ${firstBook.id} is not registered.`,
    );
  }
  const startChapterContext = curriculum.getChapterContext(startChapter.id, locale);
  if (!startChapterContext) {
    throw new Error(`The start chapter ${startChapter.id} has no resolvable curriculum context.`);
  }

  const learningChapters: readonly HomeCurriculumChapterDto[] = chapters.map((chapter) => {
    const context = curriculum.getChapterContext(chapter.id, locale);
    if (!context) {
      throw new Error(`Chapter ${chapter.id} has no resolvable curriculum context.`);
    }
    return {
      chapterId: context.canonicalPath,
      bookTitle: localize(context.book.title, locale),
      chapterNumber: context.chapterNumber,
      title: localize(chapter.title, locale),
      href: context.canonicalPath,
    };
  });
  const seriesRows = series.map((entry) => ({
    series: entry,
    bookCount: curriculum.listBooks(entry.id).length,
  }));

  return (
    <main id="main-content" className="home-linear-page">
      <section className="home-linear-hero page-grid" aria-labelledby="home-title">
        <div className="home-linear-hero__layout">
          <div className="home-linear-hero__copy">
            <p className="eyebrow">
              {siteConfig.brand.wordmark} <span>{text.descriptor}</span>
            </p>
            <h1 id="home-title" aria-label={text.title}>
              <span>{text.titleOpening}</span>
              <span>{text.titleClosing}</span>
            </h1>
            <form className="home-textbook-search" action={`/${locale}/search`} role="search">
              <Search aria-hidden="true" size={18} />
              <label className="sr-only" htmlFor="home-curriculum-search">
                {text.search}
              </label>
              <input id="home-curriculum-search" name="q" type="search" placeholder={text.search} />
              <button type="submit">{uiText[locale].search}</button>
            </form>
          </div>
          <HomeCurriculumAction
            conceptChapterMap={getConceptChapterMigrationMap(locale)}
            firstBookTitle={firstBookTitle}
            startChapter={{
              chapterId: startChapterContext.canonicalPath,
              bookTitle: firstBookTitle,
              chapterNumber: startChapterContext.chapterNumber,
              title: localize(startChapter.title, locale),
              href: startChapterContext.canonicalPath,
            }}
            chapters={learningChapters}
          />
        </div>
      </section>

      <section className="home-series-directory page-grid" aria-labelledby="series-heading">
        <header className="home-linear-section-heading">
          <h2 id="series-heading">{uiText[locale].readerInterface.library}</h2>
          <Link href={`/${locale}/books`}>
            {text.fullDirectory}
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </header>

        <ol className="home-series-list">
          {seriesRows.map((row, index) => (
            <li key={row.series.id}>
              <Link
                className="home-series-entry"
                href={`/${locale}/books/${row.series.slug}`}
                aria-label={localize(row.series.title, locale)}
              >
                <span className="home-series-list__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{localize(row.series.title, locale)}</h3>
                <p>{localize(row.series.summary, locale)}</p>
                <span className="home-series-entry__footer">
                  <span className="home-series-list__counts">
                    {uiText[locale].readerInterface.booksCount.replace(
                      "{count}",
                      String(row.bookCount),
                    )}
                  </span>
                  <ArrowRight aria-hidden="true" size={18} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <HomeProfile locale={locale} />
    </main>
  );
}

function EmptyLibraryHome({ locale }: Readonly<{ locale: "zh-CN" | "en" }>) {
  const text = uiText[locale].textbookHome;
  return (
    <main id="main-content" className="home-linear-page">
      <section className="home-linear-hero page-grid" aria-labelledby="home-title">
        <div className="home-linear-hero__copy">
          <p className="eyebrow">
            {siteConfig.brand.wordmark} <span>{text.descriptor}</span>
          </p>
          <h1 id="home-title">{text.title}</h1>
          <form className="home-textbook-search" action={`/${locale}/search`} role="search">
            <Search aria-hidden="true" size={18} />
            <label className="sr-only" htmlFor="home-curriculum-search">
              {text.search}
            </label>
            <input id="home-curriculum-search" name="q" type="search" placeholder={text.search} />
            <button type="submit">{uiText[locale].search}</button>
          </form>
        </div>
      </section>
      <HomeProfile locale={locale} />
    </main>
  );
}

function HomeProfile({ locale }: Readonly<{ locale: "zh-CN" | "en" }>) {
  return (
    <section className="home-profile page-grid" aria-labelledby="home-profile-heading">
      <div className="home-profile__identity">
        <p className="eyebrow">{uiText[locale].profile}</p>
        <h2 id="home-profile-heading">{siteConfig.profile.name}</h2>
      </div>
      <address>
        <span>{siteConfig.profile.affiliation}</span>
        <a href={`mailto:${siteConfig.profile.email}`}>
          {uiText[locale].contact}: {siteConfig.profile.email}
        </a>
      </address>
    </section>
  );
}
