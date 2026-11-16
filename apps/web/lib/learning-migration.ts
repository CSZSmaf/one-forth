import type { SupportedLocale } from "@one-forth/config";
import { readerConceptById, readerCurriculumRepository } from "@one-forth/content";
import type { ConceptChapterMigrationMap } from "./learning-state";

const maps = new Map<SupportedLocale, ConceptChapterMigrationMap>();

/** Uses each concept's canonical chapter when a concept appears in several books. */
export function getConceptChapterMigrationMap(locale: SupportedLocale): ConceptChapterMigrationMap {
  const cached = maps.get(locale);
  if (cached) return cached;
  const result: Record<string, string> = {};
  for (const chapter of readerCurriculumRepository.listChapters()) {
    const context = readerCurriculumRepository.getChapterContext(chapter.id, locale);
    if (!context) continue;
    for (const conceptId of chapter.conceptIds) {
      const canonicalChapter = readerConceptById.get(conceptId)?.canonicalLocation.chapterId;
      if (!canonicalChapter || canonicalChapter === chapter.id) {
        result[conceptId] = context.canonicalPath;
      }
    }
  }
  maps.set(locale, result);
  return result;
}
