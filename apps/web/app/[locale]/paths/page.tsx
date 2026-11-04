import { readerDirectoryText } from "@one-forth/config";
import { learningPathById, readerCurriculumRepository } from "@one-forth/content";
import { listToolIndexEntries } from "@one-forth/content/tool-index";
import { localize } from "@one-forth/registry";
import { DirectoryNavigation } from "@one-forth/ui";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ReferenceFilters } from "@/components/reference-filters";
import {
  createIndexHref,
  firstSearchParam,
  normalizeIndexQuery,
  type IndexSearchParams,
} from "@/lib/index-query";
import { createPageMetadata } from "@/lib/metadata";
import { compareLearningPaths, directoryDomains, pathDomain } from "@/lib/reader-directory";

export const metadata = createPageMetadata({
  title: readerDirectoryText["zh-CN"].paths,
  description: readerDirectoryText["zh-CN"].pathDescription,
  path: "/zh-CN/paths",
});
interface LearningPathsPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en" }>;
  readonly searchParams?: Promise<IndexSearchParams>;
}
export default async function LearningPathsPage({ params, searchParams }: LearningPathsPageProps) {
  const [{ locale }, queryParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as IndexSearchParams),
  ]);
  const text = readerDirectoryText[locale],
    pathname = `/${locale}/paths`;
  const paths = listToolIndexEntries({ locale, kind: "learning-path" }).flatMap((entry) => {
    const path = learningPathById.get(entry.sourceId);
    return path ? [{ entry, path, domain: pathDomain(path) }] : [];
  });
  const domains = directoryDomains.filter((d) => paths.some((p) => p.domain === d.id));
  const domain = domains.find((d) => d.id === firstSearchParam(queryParams.domain))?.id ?? "";
  const requestedKind = firstSearchParam(queryParams.kind),
    kind = requestedKind === "series" || requestedKind === "topic" ? requestedKind : "";
  const query = normalizeIndexQuery(queryParams.q, locale);
  const filtered = paths.filter(
    (p) =>
      (!domain || p.domain === domain) &&
      (!kind || p.path.routeKind === kind) &&
      (!query ||
        [p.entry.title, p.entry.summary, ...p.path.sections.map((s) => localize(s.title, locale))]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(query)),
  );
  const groups = domains
    .map((d) => ({
      ...d,
      items: filtered
        .filter((p) => p.domain === d.id)
        .sort(
          (a, b) =>
            compareLearningPaths(a.path, b.path) ||
            a.entry.title.localeCompare(b.entry.title, locale),
        ),
    }))
    .filter((d) => d.items.length);
  const href = (selected: string | null) =>
    createIndexHref(pathname, { q: firstSearchParam(queryParams.q), kind }, { domain: selected });
  return (
    <main
      id="main-content"
      className="reference-index-page reader-directory-page path-directory-page"
    >
      <header className="reference-index-hero">
        <nav className="breadcrumbs" aria-label={text.breadcrumbs}>
          <Link href={`/${locale}`}>{text.home}</Link>
          <span>/</span>
          <span aria-current="page">{text.paths}</span>
        </nav>
        <h1>{text.paths}</h1>
      </header>
      <DirectoryNavigation
        label={text.domain}
        items={[
          { href: href(null), label: text.allDomains, selected: !domain },
          ...domains.map((d) => ({
            href: href(d.id),
            label: localize(d.shortTitle, locale),
            selected: d.id === domain,
          })),
        ]}
      />
      <ReferenceFilters
        action={pathname}
        locale={locale}
        hiddenFields={{ domain }}
        resultCount={filtered.length}
        resultLabel={text.pathCount}
        fields={[
          {
            name: "q",
            label: text.search,
            value: firstSearchParam(queryParams.q),
            type: "search",
            placeholder: text.pathSearch,
          },
          {
            name: "kind",
            label: text.routeKind,
            value: kind,
            type: "select",
            allLabel: text.allRoutes,
            options: [
              { value: "series", label: text.series },
              { value: "topic", label: text.topic },
            ],
          },
        ]}
      />
      {groups.length ? (
        <div className="path-directory">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`path-group-${group.id}`}>
              <header className="resource-directory__heading">
                <h2 id={`path-group-${group.id}`}>{localize(group.title, locale)}</h2>
              </header>
              <ol className="path-directory__list">
                {group.items.map(({ entry, path }) => {
                  const first = path.chapterIds[0],
                    start = first
                      ? readerCurriculumRepository.getChapterContext(first, locale)
                      : null;
                  return (
                    <li key={path.id} data-kind={path.routeKind}>
                      <div className="path-directory__type">
                        {path.routeKind === "series" ? text.series : text.topic}
                      </div>
                      <div>
                        <h3>
                          <Link href={entry.canonicalUrl}>{entry.title}</Link>
                        </h3>
                        <p>{entry.summary}</p>
                        <div className="directory-meta">
                          <span>
                            {text.stages.replace("{count}", String(path.sections.length))}
                          </span>
                          <span>
                            {text.chapters.replace("{count}", String(path.chapterIds.length))}
                          </span>
                          <span>{text.hours.replace("{count}", String(path.estimatedHours))}</span>
                        </div>
                      </div>
                      <div className="path-directory__actions">
                        <Link href={entry.canonicalUrl}>
                          {text.viewPath}
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                        {start ? (
                          <Link className="path-directory__start" href={start.canonicalPath}>
                            {text.start}
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <p className="reference-index-empty">{text.noPaths}</p>
      )}
    </main>
  );
}
