import { readerContentRepository, readerCurriculumRepository } from "@one-forth/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveAuthorLabel } from "@/lib/labels";
import { createPageMetadata, latestRevisionDate } from "@/lib/metadata";

interface ChapterPageProps {
  readonly params: Promise<{
    locale: "zh-CN" | "en";
    series: string;
    book: string;
    chapter: string;
  }>;
}

export function generateStaticParams() {
  return readerCurriculumRepository.listSeries().flatMap((series) =>
    readerCurriculumRepository.listBooks(series.id).flatMap((book) =>
      readerCurriculumRepository.listChapters(book.id).map((chapter) => ({
        locale: "zh-CN",
        series: series.slug,
        book: book.slug,
        chapter: chapter.slug,
      })),
    ),
  );
}

async function resolveRoute(params: Awaited<ChapterPageProps["params"]>) {
  const chapter = readerCurriculumRepository.getChapterByRoute(
    params.series,
    params.book,
    params.chapter,
  );
  const context = chapter
    ? readerCurriculumRepository.getChapterContext(chapter.id, params.locale)
    : null;
  const document = chapter?.contentId
    ? await readerContentRepository.getDocument(chapter.contentId, params.locale)
    : null;
  if (chapter?.contentId && !document) {
    throw new Error(
      `Curriculum Chapter ${chapter.id} references missing ${params.locale} content ${chapter.contentId}`,
    );
  }
  return { chapter, context, document };
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { chapter, context, document } = await resolveRoute(resolvedParams);
  if (!chapter || !context || !document) return {};
  const modifiedTime = latestRevisionDate(document.frontmatter.revisionHistory);
  return createPageMetadata({
    title: document.frontmatter.title,
    description: document.frontmatter.summary,
    path: context.canonicalPath,
    publicationStatus: document.frontmatter.publicationStatus,
    article: {
      authors: document.frontmatter.authors.map((author) =>
        resolveAuthorLabel(author, resolvedParams.locale),
      ),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
  });
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const resolvedParams = await params;
  const { chapter, context, document } = await resolveRoute(resolvedParams);
  if (!chapter || !context || !document) notFound();
  const { AuthoredChapterBoundary } = await import("@/components/authored-chapter-boundary");
  return (
    <AuthoredChapterBoundary context={context} document={document} locale={resolvedParams.locale} />
  );
}
