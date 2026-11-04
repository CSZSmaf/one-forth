import { type SupportedLocale, uiText } from "@one-forth/config";
import { readerContentRepository, type CurriculumBook } from "@one-forth/content";
import { domainRegistry, localize } from "@one-forth/registry";

export interface BookShelfEntry {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly summary: string;
  readonly seriesId: string;
  readonly seriesTitle: string;
  readonly href: string;
  readonly color: string;
  readonly variant: number;
  readonly structure: string;
}

export async function getBookShelfEntries(
  locale: SupportedLocale,
  books: readonly CurriculumBook[] = readerContentRepository.curriculum.listBooks(),
): Promise<readonly BookShelfEntry[]> {
  const curriculum = readerContentRepository.curriculum;
  return Promise.all(
    books.map(async (book) => {
      const series = curriculum.getSeries(book.seriesId);
      if (!series) throw new Error(`Missing series ${book.seriesId} for book ${book.id}`);
      const chapter = curriculum.getChapter(book.startChapterId);
      const document = chapter?.contentId
        ? await readerContentRepository.getDocument(chapter.contentId, locale)
        : null;
      const colorToken = document
        ? domainRegistry.get(document.frontmatter.domain)?.colorToken
        : undefined;
      return {
        id: book.id,
        code: book.code,
        title: localize(book.title, locale),
        summary: localize(book.summary, locale),
        seriesId: series.id,
        seriesTitle: localize(series.title, locale),
        href: `/${locale}/books/${series.slug}/${book.slug}`,
        color: `var(--${colorToken ?? "accent"})`,
        variant: book.order % 3,
        structure: uiText[locale].readerInterface.bookStructure
          .replace("{parts}", String(book.partIds.length))
          .replace("{chapters}", String(curriculum.listChapters(book.id).length)),
      };
    }),
  );
}
