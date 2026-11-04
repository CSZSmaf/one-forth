import { publishedLocales, siteConfig, type PublishedLocale } from "@one-forth/config";
import { publicContentRepository, publicCurriculumRepository } from "@one-forth/content";
import type { MetadataRoute } from "next";
import { listPublicLearningPaths } from "./[locale]/paths/publication";

const curriculumLastModified = new Date("2026-07-14");
const profileLastModified = new Date("2026-08-06");

export const stableRootPaths = ["/about"] as const;

export const stableToolPaths = [
  "/playground",
  "/graph",
  "/paths",
  "/glossary",
  "/symbols",
  "/equations",
  "/resources",
  "/updates",
  "/subjects",
  "/contribute",
  "/projects",
] as const;

function absoluteUrl(path: string): string {
  return new URL(path, `${siteConfig.url}/`).toString();
}

function localizedPath(locale: PublishedLocale, path = ""): string {
  return `/${locale}${path}`;
}

function staticEntry(
  path: string,
  priority: number,
  changeFrequency: "weekly" | "monthly",
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified: curriculumLastModified,
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = stableRootPaths.map((path) => ({
    url: absoluteUrl(path),
    lastModified: profileLastModified,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  for (const locale of publishedLocales) {
    // Sitemap is intentionally bound to the published-only facade. Reader-visible
    // preview documents receive page-level noindex and must never enter this list.
    const documents = await publicContentRepository.listDocuments({ locale });
    const documentById = new Map(
      documents.map((document) => [document.frontmatter.id, document] as const),
    );
    const publishedChapters = publicCurriculumRepository
      .listChapters()
      .filter((chapter) => chapter.contentId && documentById.has(chapter.contentId));
    const publishedBookIds = new Set(publishedChapters.map((chapter) => chapter.bookId));
    const publishedSeriesIds = new Set(
      publicCurriculumRepository
        .listBooks()
        .filter((book) => publishedBookIds.has(book.id))
        .map((book) => book.seriesId),
    );
    const indexablePaths = await listPublicLearningPaths(locale);

    entries.push(
      staticEntry(localizedPath(locale), 1, "weekly"),
      staticEntry(localizedPath(locale, "/books"), 0.9, "weekly"),
    );

    for (const series of publicCurriculumRepository.listSeries()) {
      if (!publishedSeriesIds.has(series.id)) continue;
      entries.push(staticEntry(localizedPath(locale, `/books/${series.slug}`), 0.82, "monthly"));
      for (const book of publicCurriculumRepository.listBooks(series.id)) {
        if (!publishedBookIds.has(book.id)) continue;
        entries.push(
          staticEntry(localizedPath(locale, `/books/${series.slug}/${book.slug}`), 0.78, "monthly"),
        );
      }
    }

    entries.push(
      ...stableToolPaths.map((path) => staticEntry(localizedPath(locale, path), 0.62, "monthly")),
      ...indexablePaths.map((path) =>
        staticEntry(localizedPath(locale, `/paths/${path.id}`), 0.64, "monthly"),
      ),
    );

    const publicSubjects = new Set<string>();
    for (const document of documents) {
      publicSubjects.add(`/${document.frontmatter.domain}`);
      publicSubjects.add(`/${document.frontmatter.domain}/${document.frontmatter.subject}`);
    }
    entries.push(
      ...[...publicSubjects].map((path) =>
        staticEntry(localizedPath(locale, `/subjects${path}`), 0.66, "monthly"),
      ),
    );

    for (const chapter of publishedChapters) {
      const document = chapter.contentId ? documentById.get(chapter.contentId) : undefined;
      if (!document) continue;
      const context = publicCurriculumRepository.getChapterContext(chapter.id, locale);
      if (!context) {
        throw new Error(`Cannot generate sitemap URL for curriculum Chapter ${chapter.id}`);
      }
      const revisionDate = document.frontmatter.revisionHistory.reduce<string | undefined>(
        (latest, revision) => (!latest || revision.date > latest ? revision.date : latest),
        undefined,
      );
      entries.push({
        url: absoluteUrl(context.canonicalPath),
        ...(revisionDate ? { lastModified: new Date(revisionDate) } : {}),
        changeFrequency: "monthly",
        priority: 0.76,
      });
    }
  }

  return entries;
}
