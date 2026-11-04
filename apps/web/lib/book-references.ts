import type { SupportedLocale } from "@one-forth/config";
import { readerContentRepository, resources } from "@one-forth/content";

export async function getBookReferences(bookId: string, locale: SupportedLocale) {
  const chapters = readerContentRepository.curriculum.listChapters(bookId);
  const documents = await Promise.all(
    chapters.map((chapter) =>
      chapter.contentId ? readerContentRepository.getDocument(chapter.contentId, locale) : null,
    ),
  );
  const ids = new Set(documents.flatMap((document) => document?.frontmatter.resources ?? []));
  return resources.filter((resource) => ids.has(resource.id));
}
