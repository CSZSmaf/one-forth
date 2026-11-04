import { uiText } from "@one-forth/config";
import { readerContentRepository } from "@one-forth/content";
import { domainRegistry, localize } from "@one-forth/registry";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { resolveDomainLabel, resolveSubjectLabel } from "@/lib/labels";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "学科目录",
  description: "按学科与主题浏览 One Forth 已公开的教材章节。",
  path: "/zh-CN/subjects",
});

export default async function SubjectDirectoryPage() {
  const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
  const concepts = await readerContentRepository.listConcepts();
  const readableConceptIds = new Set(documents.map((document) => document.frontmatter.conceptId));
  const readableConcepts = concepts.filter((concept) => readableConceptIds.has(concept.id));
  const domains = [...domainRegistry.list()]
    .filter((domain) => readableConcepts.some((concept) => concept.domain === domain.id))
    .sort((a, b) => a.order - b.order);

  return (
    <main id="main-content" className="course-directory-page">
      <header className="course-directory-hero">
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link href="/zh-CN">首页</Link>
          <span>/</span>
          <span aria-current="page">课程目录</span>
        </nav>
        <h1>{uiText["zh-CN"].readerInterface.subjects}</h1>
      </header>

      <section className="domain-course-list" aria-labelledby="domain-course-title">
        <div className="section-heading section-heading--compact">
          <span>01</span>
          <div>
            <p>学科</p>
            <h2 id="domain-course-title">课程领域</h2>
          </div>
        </div>
        {domains.map((domain, index) => {
          const domainConcepts = readableConcepts.filter((concept) => concept.domain === domain.id);
          const readableSubjects = domain.subjects.filter((subject) =>
            domainConcepts.some((concept) => concept.subject === subject.id),
          );
          return (
            <article key={domain.id} className="domain-course-entry" data-domain={domain.id}>
              <div className="domain-course-entry__index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <p className="eyebrow">学科领域</p>
                <h2>{resolveDomainLabel(domain.id, "zh-CN")}</h2>
                <p>{localize(domain.description, "zh-CN")}</p>
                <div className="domain-course-entry__subjects">
                  {readableSubjects.map((subject) => (
                    <Link key={subject.id} href={`/zh-CN/subjects/${domain.id}/${subject.id}`}>
                      {resolveSubjectLabel(subject.id, "zh-CN")}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="domain-course-entry__meta">
                <Link className="button button--secondary" href={`/zh-CN/subjects/${domain.id}`}>
                  查看学科 <ArrowRight aria-hidden="true" size={16} />
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
