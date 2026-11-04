import {
  learningPathAliasById,
  learningPathById,
  readerCurriculumRepository,
} from "@one-forth/content";
import { localize } from "@one-forth/registry";
import { ArrowRight, ChevronDown } from "lucide-react";
import { readerDirectoryText } from "@one-forth/config";
import { listPublicResources } from "@/lib/reference-locations";
import {
  briefResourceSource,
  compareResourceTopics,
  resourcePlacement,
} from "@/lib/reader-directory";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { PathExerciseList, type PathExerciseDto } from "@/components/path-exercise-list";
import { PathProgressSummary, PathStepStatus } from "@/components/path-progress";
import { createPageMetadata } from "@/lib/metadata";
import {
  bookHasReadableDescendant,
  isLearningPathPreview,
  listReadableLearningPaths,
} from "../publication";

interface LearningPathPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en"; slug: string }>;
}

async function resolveBookCanonicalPath(
  bookId: string,
  locale: "zh-CN" | "en",
): Promise<string | null> {
  const book = readerCurriculumRepository.getBook(bookId);
  const series = book ? readerCurriculumRepository.getSeries(book.seriesId) : null;
  if (!book || !series || !(await bookHasReadableDescendant(book.id, locale))) {
    return `/${locale}/books`;
  }
  return `/${locale}/books/${series.slug}/${book.slug}`;
}

function requireChapterContext(pathId: string, chapterId: string, locale: "zh-CN" | "en") {
  const context = readerCurriculumRepository.getChapterContext(chapterId, locale);
  if (!context) {
    throw new Error(`专题路线“${pathId}”引用了不存在的 Chapter ID：${chapterId}`);
  }
  return context;
}

export async function generateStaticParams() {
  const paths = await listReadableLearningPaths("zh-CN");
  return paths.map((path) => ({
    locale: "zh-CN" as const,
    slug: path.id,
  }));
}

export async function generateMetadata({ params }: LearningPathPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const path = learningPathById.get(slug);
  if (path) {
    const readablePaths = await listReadableLearningPaths(locale);
    if (!readablePaths.some((candidate) => candidate.id === path.id)) return {};
    return createPageMetadata({
      title: localize(path.title, locale),
      description: localize(path.summary, locale),
      path: `/${locale}/paths/${path.id}`,
      publicationStatus: (await isLearningPathPreview(path, locale)) ? "preview" : "published",
    });
  }

  const alias = learningPathAliasById.get(slug);
  if (!alias) return {};
  const target = await resolveBookCanonicalPath(alias.targetBookId, locale);
  const book = readerCurriculumRepository.getBook(alias.targetBookId);
  return target && book
    ? createPageMetadata({
        title: localize(book.title, locale),
        description: localize(alias.reason, locale),
        path: target,
      })
    : {};
}

export default async function LearningPathPage({ params }: LearningPathPageProps) {
  const { locale, slug } = await params;
  const alias = learningPathAliasById.get(slug);
  if (alias) {
    const target = await resolveBookCanonicalPath(alias.targetBookId, locale);
    if (!target) {
      throw new Error(`专题路线别名“${alias.id}”引用了不存在的 Book ID：${alias.targetBookId}`);
    }
    permanentRedirect(target);
  }

  const path = learningPathById.get(slug);
  if (!path) notFound();

  const readablePaths = await listReadableLearningPaths(locale);
  if (!readablePaths.some((candidate) => candidate.id === path.id)) notFound();
  const steps = path.chapterIds.map((chapterId) =>
    requireChapterContext(path.id, chapterId, locale),
  );
  const prerequisites = path.prerequisiteChapterIds.map((chapterId) =>
    requireChapterContext(path.id, chapterId, locale),
  );
  const stepById = new Map(steps.map((step) => [step.chapter.id, step] as const));
  const stepIndexById = new Map(steps.map((step, index) => [step.chapter.id, index] as const));
  const sections = path.sections.map((section) => ({
    ...section,
    steps: section.chapterIds.map(
      (chapterId) => stepById.get(chapterId) ?? requireChapterContext(path.id, chapterId, locale),
    ),
  }));
  const learningKeys = steps.map((step) => step.canonicalPath);
  const text = readerDirectoryText[locale];
  const relatedResources = (await listPublicResources(locale))
    .filter((resource) => resource.topics.some((topic) => path.conceptIds.includes(topic)))
    .map((resource) => ({
      resource,
      score: resource.topics.filter((topic) => path.conceptIds.includes(topic)).length,
    }))
    .sort(
      (a, b) =>
        compareResourceTopics(a.resource, b.resource) ||
        (resourcePlacement(a.resource)?.context.chapterNumber ?? 999) -
          (resourcePlacement(b.resource)?.context.chapterNumber ?? 999) ||
        b.score - a.score,
    )
    .slice(0, 4)
    .map(({ resource }) => resource);
  const nextPath = path.nextPath
    ? readablePaths.find((candidate) => candidate.id === path.nextPath)
    : undefined;
  const exerciseDtos: readonly PathExerciseDto[] = path.exercises.map((exercise) => ({
    id: exercise.id,
    title: localize(exercise.title, locale),
    prompt: localize(exercise.prompt, locale),
    difficulty: exercise.difficulty,
    hint: localize(exercise.hint, locale),
    workedSolution: localize(exercise.workedSolution, locale),
    verification: localize(exercise.verification, locale),
    chapters: exercise.chapterIds.map((chapterId) => {
      const context = stepById.get(chapterId) ?? requireChapterContext(path.id, chapterId, locale);
      return {
        label: `${context.book.code} · 第 ${context.chapterNumber} 章 ${localize(context.chapter.title, locale)}`,
        href: context.canonicalPath,
      };
    }),
  }));

  return (
    <main id="main-content" className="path-page">
      <header className="path-hero">
        <nav className="breadcrumbs" aria-label={text.breadcrumbs}>
          <Link href={`/${locale}`}>{text.home}</Link>
          <span>/</span>
          <Link href={`/${locale}/paths`}>{text.paths}</Link>
          <span>/</span>
          <span aria-current="page">{localize(path.title, locale)}</span>
        </nav>
        <p className="eyebrow">{path.routeKind === "series" ? text.series : text.topic}</p>
        <h1>{localize(path.title, locale)}</h1>
        <p>{localize(path.summary, locale)}</p>
        <div className="directory-meta">
          <span>{text.stages.replace("{count}", String(sections.length))}</span>
          <span>{text.chapters.replace("{count}", String(steps.length))}</span>
          <span>{text.hours.replace("{count}", String(path.estimatedHours))}</span>
        </div>
        <PathProgressSummary
          chapterIds={learningKeys}
          chapters={steps.map((step) => ({
            href: step.canonicalPath,
            title: localize(step.chapter.title, locale),
          }))}
          locale={locale}
        />
      </header>
      <details className="path-preparation">
        <summary>
          {text.prerequisites}
          <ChevronDown size={17} aria-hidden="true" />
        </summary>
        <p>{localize(path.audience, locale)}</p>
        {prerequisites.length ? (
          <ul>
            {prerequisites.map((context) => (
              <li key={context.chapter.id}>
                <Link href={context.canonicalPath}>
                  {context.book.code} · {localize(context.chapter.title, locale)}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </details>
      <div className="path-study-layout">
        <aside className="path-stage-nav">
          <nav aria-label={text.stageContents}>
            <h2>{text.stageContents}</h2>
            <ol>
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#path-section-${section.id}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {localize(section.title, locale)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <section className="path-sequence" aria-labelledby="path-sequence-title">
          <h2 id="path-sequence-title">{text.sequence}</h2>
          <div className="path-section-list">
            {sections.map((section, sectionIndex) => (
              <section
                key={section.id}
                id={`path-section-${section.id}`}
                aria-labelledby={`path-section-title-${section.id}`}
              >
                <details open={sectionIndex === 0}>
                  <summary>
                    <span className="path-stage-number">
                      {String(sectionIndex + 1).padStart(2, "0")}
                    </span>
                    <h3 id={`path-section-title-${section.id}`}>
                      {localize(section.title, locale)}
                    </h3>
                    <span className="path-stage-count">
                      {text.chapters.replace("{count}", String(section.steps.length))}
                    </span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <p className="path-stage-goal">{localize(section.goal, locale)}</p>
                  <ol>
                    {section.steps.map((step) => (
                      <li key={step.chapter.id}>
                        <Link
                          href={step.canonicalPath}
                          aria-label={`${text.readChapter}: ${localize(step.chapter.title, locale)}`}
                        >
                          <span className="path-node-index">
                            {String((stepIndexById.get(step.chapter.id) ?? 0) + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h4>{localize(step.chapter.title, locale)}</h4>
                            <span className="path-chapter-code">
                              {step.book.code} · {step.chapterNumber}
                            </span>
                          </div>
                          <PathStepStatus chapterId={step.canonicalPath} locale={locale} />
                        </Link>
                      </li>
                    ))}
                  </ol>
                </details>
              </section>
            ))}
          </div>
        </section>
      </div>
      <section className="path-checkpoints" aria-labelledby="path-checkpoints-title">
        <h2 id="path-checkpoints-title">{text.checkpoints}</h2>
        <ol>
          {path.checkpoints.map((checkpoint) => {
            const step = stepById.get(checkpoint.afterChapterId);
            if (!step) throw new Error(`Missing checkpoint chapter: ${path.id}/${checkpoint.id}`);
            return (
              <li key={checkpoint.id}>
                <div>
                  <Link href={step.canonicalPath}>
                    {text.completeChapter} {step.book.code} · {localize(step.chapter.title, locale)}
                  </Link>
                  <p>{localize(checkpoint.prompt, locale)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="path-exercises" aria-labelledby="path-exercises-title">
        <h2 id="path-exercises-title">{text.exercises}</h2>
        <PathExerciseList exercises={exerciseDtos} locale={locale} />
      </section>
      {relatedResources.length ? (
        <section className="path-resources" aria-labelledby="path-resources-title">
          <h2 id="path-resources-title">{text.relatedResources}</h2>
          <ul>
            {relatedResources.map((resource) => (
              <li key={resource.id}>
                <Link href={`/${locale}/resources/${resource.id}`}>{resource.title}</Link>
                <span>{briefResourceSource(resource)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <nav className="path-next" aria-label={text.next}>
        <Link href={nextPath ? `/${locale}/paths/${nextPath.id}` : `/${locale}/paths`}>
          {nextPath ? localize(nextPath.title, locale) : text.paths}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link href={`/${locale}/books`}>{text.books}</Link>
      </nav>
    </main>
  );
}
