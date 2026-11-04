import { readerContentRepository } from "@one-forth/content";
import { domainRegistry, localize, subjectRegistry } from "@one-forth/registry";
import { ArrowRight, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveConceptLabel, resolveDomainLabel, resolveSubjectLabel } from "@/lib/labels";
import { createPageMetadata } from "@/lib/metadata";

interface SubjectPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en"; domain: string; subject: string }>;
}

export async function generateStaticParams() {
  const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
  const readableSubjects = new Map(
    documents.map((document) => [
      `${document.frontmatter.domain}/${document.frontmatter.subject}`,
      {
        locale: "zh-CN" as const,
        domain: document.frontmatter.domain,
        subject: document.frontmatter.subject,
      },
    ]),
  );
  return [...readableSubjects.values()];
}

export async function generateMetadata({ params }: SubjectPageProps): Promise<Metadata> {
  const { locale, domain: domainId, subject: subjectId } = await params;
  const subject = subjectRegistry.get(subjectId);
  if (!subject || subject.domainId !== domainId) return {};
  const documents = await readerContentRepository.listDocuments({
    locale,
    domain: domainId,
    subject: subjectId,
  });
  if (documents.length === 0) return {};
  const hasPublishedDescendant = documents.some(
    (document) => document.frontmatter.publicationStatus === "published",
  );
  return createPageMetadata({
    title: resolveSubjectLabel(subject.id, locale),
    description: localize(subject.description, locale),
    path: `/${locale}/subjects/${domainId}/${subjectId}`,
    publicationStatus: hasPublishedDescendant ? "published" : "preview",
  });
}

export default async function SubjectCoursePage({ params }: SubjectPageProps) {
  const { locale, domain: domainId, subject: subjectId } = await params;
  const domain = domainRegistry.get(domainId);
  const subject = subjectRegistry.get(subjectId);
  if (!domain || !subject || subject.domainId !== domain.id) notFound();

  const readableDocuments = await readerContentRepository.listDocuments({ locale });
  const documents = readableDocuments.filter(
    (document) =>
      document.frontmatter.domain === domain.id && document.frontmatter.subject === subject.id,
  );
  if (documents.length === 0) notFound();
  const readableConceptIds = new Set(
    readableDocuments.map((document) => document.frontmatter.conceptId),
  );
  const documentByConcept = new Map(
    documents.map((document) => [document.frontmatter.conceptId, document]),
  );
  const concepts = (
    await readerContentRepository.listConcepts({
      domain: domain.id,
      subject: subject.id,
    })
  ).filter((concept) => documentByConcept.has(concept.id));
  const sorted = [...concepts].sort(
    (a, b) => a.difficulty - b.difficulty || a.prerequisites.length - b.prerequisites.length,
  );

  return (
    <main id="main-content" className="subject-course-page">
      <header className="subject-course-hero" data-domain={domain.id}>
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link href={`/${locale}`}>首页</Link>
          <span>/</span>
          <Link href={`/${locale}/subjects`}>课程目录</Link>
          <span>/</span>
          <Link href={`/${locale}/subjects/${domain.id}`}>
            {resolveDomainLabel(domain.id, locale)}
          </Link>
          <span>/</span>
          <span aria-current="page">{resolveSubjectLabel(subject.id, locale)}</span>
        </nav>
        <p className="eyebrow">课程主题</p>
        <h1>{resolveSubjectLabel(subject.id, locale)}</h1>
        <p>{localize(subject.description, locale)}</p>
      </header>

      <section className="course-sequence" aria-labelledby="course-sequence-title">
        <div className="section-heading section-heading--compact">
          <span>01</span>
          <div>
            <p>课程章节</p>
            <h2 id="course-sequence-title">按难度与先修关系排列</h2>
          </div>
        </div>
        <ol>
          {sorted.map((concept, index) => {
            const document = documentByConcept.get(concept.id);
            if (!document) return null;
            const readablePrerequisites = concept.prerequisites.filter((conceptId) =>
              readableConceptIds.has(conceptId),
            );
            return (
              <li key={concept.id} className="is-available">
                <Link href={document.url}>
                  <span className="course-sequence__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="course-sequence__content">
                    <small>难度 {concept.difficulty}/5</small>
                    <strong>{resolveConceptLabel(concept.id, locale)}</strong>
                    <span>{localize(concept.summary, locale)}</span>
                    {readablePrerequisites.length > 0 ? (
                      <em>
                        先修：
                        {readablePrerequisites
                          .map((conceptId) => resolveConceptLabel(conceptId, locale))
                          .join(" · ")}
                      </em>
                    ) : (
                      <em>起点章节</em>
                    )}
                  </span>
                  <span className="course-sequence__meta">
                    <Clock3 aria-hidden="true" size={14} />约 {concept.estimatedMinutes} 分钟
                    <ArrowRight aria-hidden="true" size={17} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
