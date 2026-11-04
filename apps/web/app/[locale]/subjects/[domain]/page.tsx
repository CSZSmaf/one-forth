import { readerContentRepository } from "@one-forth/content";
import { domainRegistry, localize } from "@one-forth/registry";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveDomainLabel, resolveSubjectLabel } from "@/lib/labels";
import { createPageMetadata } from "@/lib/metadata";

interface DomainPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en"; domain: string }>;
}

export async function generateStaticParams() {
  const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
  return [...new Set(documents.map((document) => document.frontmatter.domain))].map((domain) => ({
    locale: "zh-CN" as const,
    domain,
  }));
}

export async function generateMetadata({ params }: DomainPageProps): Promise<Metadata> {
  const { locale, domain: domainId } = await params;
  const domain = domainRegistry.get(domainId);
  const documents = domain
    ? await readerContentRepository.listDocuments({ locale, domain: domain.id })
    : [];
  const hasPublishedDescendant = documents.some(
    (document) => document.frontmatter.publicationStatus === "published",
  );
  return domain && documents.length > 0
    ? createPageMetadata({
        title: resolveDomainLabel(domain.id, locale),
        description: localize(domain.description, locale),
        path: `/${locale}/subjects/${domain.id}`,
        publicationStatus: hasPublishedDescendant ? "published" : "preview",
      })
    : {};
}

export default async function DomainCoursePage({ params }: DomainPageProps) {
  const { locale, domain: domainId } = await params;
  const domain = domainRegistry.get(domainId);
  if (!domain) notFound();
  const documents = await readerContentRepository.listDocuments({
    locale,
    domain: domain.id,
  });
  if (documents.length === 0) notFound();
  const readableConceptIds = new Set(documents.map((document) => document.frontmatter.conceptId));
  const concepts = (await readerContentRepository.listConcepts({ domain: domain.id })).filter(
    (concept) => readableConceptIds.has(concept.id),
  );
  const readableSubjects = domain.subjects.filter((subject) =>
    concepts.some((concept) => concept.subject === subject.id),
  );

  return (
    <main id="main-content" className="course-directory-page">
      <header className="course-directory-hero" data-domain={domain.id}>
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link href={`/${locale}`}>首页</Link>
          <span>/</span>
          <Link href={`/${locale}/subjects`}>课程目录</Link>
          <span>/</span>
          <span aria-current="page">{resolveDomainLabel(domain.id, locale)}</span>
        </nav>
        <p className="eyebrow">学科领域</p>
        <h1>{resolveDomainLabel(domain.id, locale)}</h1>
        <p>{localize(domain.description, locale)}</p>
      </header>

      <section className="subject-course-grid" aria-labelledby="subject-course-title">
        <div className="section-heading section-heading--compact">
          <span>01</span>
          <div>
            <p>课程结构</p>
            <h2 id="subject-course-title">主题目录</h2>
          </div>
        </div>
        <div className="subject-course-grid__items">
          {readableSubjects.map((subject) => {
            return (
              <Link
                key={subject.id}
                className="subject-course-card"
                href={`/${locale}/subjects/${domain.id}/${subject.id}`}
              >
                <span className="domain-dot" data-domain={domain.id} />
                <h2>{resolveSubjectLabel(subject.id, locale)}</h2>
                <p>{localize(subject.description, locale)}</p>
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
