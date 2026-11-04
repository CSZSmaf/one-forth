import {
  learningPaths,
  publicContentRepository,
  publicCurriculumRepository,
  readerContentRepository,
  readerCurriculumRepository,
  type ContentRepository,
  type CurriculumRepository,
  type DiscoverableLearningPath,
  type LearningPath,
} from "@one-forth/content";
import type { SupportedLocale } from "@one-forth/config";

export function referencedChapterIds(path: LearningPath): readonly string[] {
  return [
    ...new Set([
      ...path.prerequisiteChapterIds,
      ...path.chapterIds,
      ...path.checkpoints.map((checkpoint) => checkpoint.afterChapterId),
      ...path.exercises.flatMap((exercise) => exercise.chapterIds),
    ]),
  ];
}

function isLearningPathAvailable(
  path: LearningPath,
  contentIds: ReadonlySet<string>,
  curriculum: CurriculumRepository,
): boolean {
  const chapterIds = referencedChapterIds(path);
  return (
    chapterIds.length > 0 &&
    chapterIds.every((chapterId) => {
      const chapter = curriculum.getChapter(chapterId);
      return Boolean(chapter?.contentId && contentIds.has(chapter.contentId));
    })
  );
}

export function isLearningPathPublic(
  path: LearningPath,
  publishedContentIds: ReadonlySet<string>,
): boolean {
  return isLearningPathAvailable(path, publishedContentIds, publicCurriculumRepository);
}

export function isLearningPathReadable(
  path: LearningPath,
  readableContentIds: ReadonlySet<string>,
): boolean {
  return isLearningPathAvailable(path, readableContentIds, readerCurriculumRepository);
}

async function listLearningPathsFor(
  locale: SupportedLocale,
  content: ContentRepository,
  curriculum: CurriculumRepository,
): Promise<readonly DiscoverableLearningPath[]> {
  const documents = await content.listDocuments({ locale });
  const contentIds = new Set(documents.map((document) => document.frontmatter.id));
  return learningPaths.filter((path) => isLearningPathAvailable(path, contentIds, curriculum));
}

export async function listPublicLearningPaths(
  locale: SupportedLocale,
): Promise<readonly DiscoverableLearningPath[]> {
  return listLearningPathsFor(locale, publicContentRepository, publicCurriculumRepository);
}

export async function listReadableLearningPaths(
  locale: SupportedLocale,
): Promise<readonly DiscoverableLearningPath[]> {
  return listLearningPathsFor(locale, readerContentRepository, readerCurriculumRepository);
}

export async function isLearningPathPreview(
  path: LearningPath,
  locale: SupportedLocale,
): Promise<boolean> {
  const documents = await readerContentRepository.listDocuments({ locale });
  const documentById = new Map(
    documents.map((document) => [document.frontmatter.id, document] as const),
  );
  return referencedChapterIds(path).some((chapterId) => {
    const chapter = readerCurriculumRepository.getChapter(chapterId);
    const document = chapter?.contentId ? documentById.get(chapter.contentId) : undefined;
    if (!chapter?.contentId || !document) {
      throw new Error(
        `Readable learning path ${path.id} references unavailable Chapter ${chapterId}`,
      );
    }
    return document.frontmatter.publicationStatus === "preview";
  });
}

export async function bookHasPublishedDescendant(
  bookId: string,
  locale: SupportedLocale,
): Promise<boolean> {
  const documents = await publicContentRepository.listDocuments({ locale });
  const publishedContentIds = new Set(documents.map((document) => document.frontmatter.id));
  return publicCurriculumRepository
    .listChapters(bookId)
    .some((chapter) => chapter.contentId && publishedContentIds.has(chapter.contentId));
}

export async function bookHasReadableDescendant(
  bookId: string,
  locale: SupportedLocale,
): Promise<boolean> {
  const documents = await readerContentRepository.listDocuments({ locale });
  const readableContentIds = new Set(documents.map((document) => document.frontmatter.id));
  return readerCurriculumRepository
    .listChapters(bookId)
    .some((chapter) => chapter.contentId && readableContentIds.has(chapter.contentId));
}
