import { siteConfig, uiText, type SupportedLocale } from "@one-forth/config";
import { ArrowUpRight } from "lucide-react";
import { createPageMetadata } from "@/lib/metadata";

interface ProjectsPageProps {
  readonly params: Promise<{ locale: SupportedLocale }>;
}

export async function generateMetadata({ params }: ProjectsPageProps) {
  const { locale } = await params;
  return createPageMetadata({
    title: uiText[locale].otherProjects,
    description: uiText[locale].projectsDescription,
    path: `/${locale}/projects`,
  });
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { locale } = await params;
  const text = uiText[locale];
  const projectIds = ["ctorch", "chatocr", "mogao"] as const;

  return (
    <main id="main-content" className="author-projects-page page-grid">
      <header>
        <h1>{text.otherProjects}</h1>
      </header>
      {projectIds.map((id) => {
        const project = siteConfig.projects[id];
        const copy = text[id];
        return (
          <section className="author-project" aria-labelledby={`${id}-heading`} key={id}>
            <div>
              <h2 id={`${id}-heading`} className="author-project-title">
                {"mark" in project && (
                  <span className="author-project-icon author-project-mark" aria-hidden="true">
                    <span className="ctorch-mark">{project.mark.letter}<span>{project.mark.dot}</span></span>
                  </span>
                )}
                {"icon" in project && <img className="author-project-icon" src={project.icon} alt="" width={40} height={40} />}
                {copy.title}
              </h2>
              <p>{copy.description}</p>
            </div>
            <nav aria-label={copy.title}>
              {id === "ctorch" && (
                <a href={siteConfig.projects.ctorch.url}>
                  {text.ctorch.open} <ArrowUpRight aria-hidden="true" size={16} />
                </a>
              )}
              <a href={project.repository}>{text.projectLinks.repository}</a>
              <a href={project.downloads}>{text.projectLinks.downloads}</a>
            </nav>
          </section>
        );
      })}
    </main>
  );
}
