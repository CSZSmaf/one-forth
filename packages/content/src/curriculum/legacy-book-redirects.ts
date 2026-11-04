import { legacyBookRouteGroups, legacyCurriculumRoutes, publishedLocales } from "@one-forth/config";
import type { CurriculumRepository } from "./types";
import type { CurriculumRedirect } from "./redirects";

export function deriveLegacyBookRedirects(
  repository: CurriculumRepository,
): readonly CurriculumRedirect[] {
  return publishedLocales.flatMap((locale) => [
    ...Object.entries(legacyCurriculumRoutes).map(
      ([source, target]): CurriculumRedirect => ({
        sourcePath: `/${locale}/${source}`,
        targetPath: `/${locale}/${target}`,
        kind: "legacy-books",
      }),
    ),
    ...legacyBookRouteGroups.flatMap((group) =>
      group.bookSlugs.flatMap((slug) => {
        const book = repository.getBookByRoute(group.targetSeries, slug);
        if (!book) return [];
        const source = `/${locale}/books/${group.sourceSeries}/${slug}`;
        const target = `/${locale}/books/${group.targetSeries}/${slug}`;
        return [
          { sourcePath: source, targetPath: target, kind: "legacy-books" as const },
          ...repository.listChapters(book.id).map(
            (chapter): CurriculumRedirect => ({
              sourcePath: `${source}/${chapter.slug}`,
              targetPath: `${target}/${chapter.slug}`,
              kind: "legacy-books",
            }),
          ),
        ];
      }),
    ),
  ]);
}
