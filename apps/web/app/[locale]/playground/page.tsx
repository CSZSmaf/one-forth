import { uiText } from "@one-forth/config";
import { readerCurriculumRepository } from "@one-forth/content";
import { findToolIndexEntry, listToolIndexEntries } from "@one-forth/content/tool-index";
import { localize } from "@one-forth/registry";
import { visualizationManifest } from "@one-forth/visualization";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InteractiveFigure } from "@/features/visualizations/interactive-figure";
import { ExperimentPicker } from "@/components/experiment-picker";
import { createPageMetadata } from "@/lib/metadata";
import { resolveConceptReferenceLocation } from "@/lib/reference-locations";

export const metadata = createPageMetadata({
  title: "交互实验室",
  description: "数学、物理、计算机与人工智能交互实验。",
  path: "/zh-CN/playground",
});

interface PlaygroundPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en" }>;
  readonly searchParams: Promise<{ figure?: string }>;
}

export default async function PlaygroundPage({ params, searchParams }: PlaygroundPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const visualizationById = new Map(
    visualizationManifest.map((visualization) => [visualization.id, visualization] as const),
  );
  const experiments = listToolIndexEntries({ locale, kind: "visualization" })
    .flatMap((entry) => {
      const visualization = visualizationById.get(entry.sourceId);
      const context = entry.chapterId
        ? readerCurriculumRepository.getChapterContext(entry.chapterId, locale)
        : null;
      return visualization && context ? [{ visualization, context }] : [];
    })
    .sort(
      (left, right) =>
        left.context.series.order - right.context.series.order ||
        left.context.book.order - right.context.book.order ||
        left.context.part.order - right.context.part.order ||
        left.context.chapter.order - right.context.chapter.order ||
        left.visualization.id.localeCompare(right.visualization.id, "en"),
    )
    .map((entry, index) => ({ ...entry, index }));
  const selected = query.figure
    ? experiments.find((entry) => entry.visualization.id === query.figure)
    : experiments[0];
  if (query.figure && !selected) notFound();
  const relatedReading = selected
    ? (
        await Promise.all(
          selected.visualization.scientificReview.relatedConceptIds.map(async (conceptId) => {
            const [concept, location] = await Promise.all([
              findToolIndexEntry("concept", conceptId, locale),
              resolveConceptReferenceLocation(conceptId, locale),
            ]);
            return concept && location
              ? { id: location.url, title: concept.title, href: location.url }
              : null;
          }),
        )
      ).filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];

  return (
    <main id="main-content" className="playground-page">
      <header className="index-page__header">
        <h1>交互实验室</h1>

        {selected ? (
          <ExperimentPicker
            locale={locale}
            selected={selected.visualization.id}
            entries={experiments.map(({ visualization, context }) => ({
              id: visualization.id,
              title: localize(visualization.title, locale),
              group: localize(context.series.title, locale),
            }))}
          />
        ) : null}
      </header>

      {selected ? (
        <>
          <aside className="playground-course-context" aria-label="当前实验教材位置">
            <div>
              <strong>
                {selected.context.book.code}《{localize(selected.context.book.title, locale)}》 · 第{" "}
                {selected.context.chapterNumber} 章{" "}
                {localize(selected.context.chapter.title, locale)}
              </strong>
            </div>
            <Link href={selected.context.canonicalPath}>
              {uiText[locale].readerInterface.backToChapter}
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </aside>
          <InteractiveFigure
            id={selected.visualization.id}
            locale={locale}
            relatedReading={relatedReading}
          />
        </>
      ) : null}

      {experiments.length > 0 ? (
        <nav id="experiment-directory" aria-label="全部教材配套实验">
          <ol className="experiment-directory">
            {experiments.map(({ visualization, context, index }) => {
              const isSelected = visualization.id === selected?.visualization.id;
              const bookTitle = localize(context.book.title, locale);
              const chapterTitle = localize(context.chapter.title, locale);
              return (
                <li key={visualization.id} data-selected={isSelected}>
                  <Link
                    className="experiment-directory__select"
                    href={`/${locale}/playground?figure=${visualization.id}#figure-${visualization.id}`}
                    {...(isSelected ? { "aria-current": "page" as const } : {})}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{localize(visualization.title, locale)}</strong>
                    <small>
                      所属教材 · {context.book.code}《{bookTitle}》
                    </small>
                    <small>
                      所属章节 · 第 {context.chapterNumber} 章 {chapterTitle}
                    </small>
                  </Link>
                  <Link
                    className="experiment-directory__chapter-link"
                    href={context.canonicalPath}
                    aria-label={`返回教材正文：${bookTitle}，第 ${context.chapterNumber} 章 ${chapterTitle}`}
                  >
                    返回正文
                    <ArrowRight aria-hidden="true" size={15} />
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      ) : (
        <p className="reference-index-empty">暂无配套实验。</p>
      )}
    </main>
  );
}
