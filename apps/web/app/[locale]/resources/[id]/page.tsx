import { localize } from "@one-forth/registry";
import { readerDirectoryText } from "@one-forth/config";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveResourceLinkLabel } from "@/lib/labels";
import { formatResourceBibliography } from "@/lib/resource-bibliography";
import { createPageMetadata } from "@/lib/metadata";
import {
  findPublicResource,
  listPublicResourceUsages,
  listPublicResources,
  resolveConceptReferenceLocation,
} from "@/lib/reference-locations";

interface ResourcePageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en"; id: string }>;
}

export async function generateStaticParams() {
  return (await listPublicResources("zh-CN")).map((resource) => ({
    locale: "zh-CN",
    id: resource.id,
  }));
}

export async function generateMetadata({ params }: ResourcePageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const resource = await findPublicResource(id, locale);
  return resource
    ? createPageMetadata({
        title: resource.title,
        description: resource.description
          ? localize(resource.description, locale)
          : `${resource.title} 的资源信息。`,
        path: `/${locale}/resources/${resource.id}`,
      })
    : {};
}

export default async function ResourcePage({ params }: ResourcePageProps) {
  const { locale, id } = await params;
  const resource = await findPublicResource(id, locale);
  if (!resource) notFound();
  const text = readerDirectoryText[locale];
  const bibliography = formatResourceBibliography(resource);
  const [prerequisiteLocations, usages] = await Promise.all([
    Promise.all(
      (resource.prerequisites ?? []).map(async (item) => ({
        item,
        location: await resolveConceptReferenceLocation(item, locale),
      })),
    ),
    listPublicResourceUsages(id, locale),
  ]);
  const visiblePrerequisites = prerequisiteLocations.filter(
    (entry): entry is { item: string; location: NonNullable<typeof entry.location> } =>
      entry.location !== null,
  );
  const relatedChapters = [
    ...new Map(
      resource.topics.flatMap((topic) => {
        const location = resolveConceptReferenceLocation(topic, locale);
        return location ? [[location.chapterId, location] as const] : [];
      }),
    ).values(),
  ];
  return (
    <main id="main-content" className="resource-page">
      <nav className="breadcrumbs" aria-label={text.breadcrumbs}>
        <Link href={`/${locale}`}>{text.home}</Link>
        <span>/</span>
        <Link href={`/${locale}/resources`}>{text.resources}</Link>
        <span>/</span>
        <span>{resource.title}</span>
      </nav>
      <header>
        <p className="eyebrow">{text.types[resource.kind]}</p>
        <h1>{resource.title}</h1>
        {resource.description ? (
          <p className="lead">{localize(resource.description, locale)}</p>
        ) : null}
        {bibliography ? <p className="resource-facts">{bibliography}</p> : null}
      </header>
      <div className="resource-body">
        {visiblePrerequisites.length > 0 ? (
          <section>
            <h2>{text.readingPrerequisites}</h2>
            <ul>
              {visiblePrerequisites.map(({ location }) => (
                <li key={location.url}>
                  <Link href={location.url}>{location.label}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {usages.length > 0 ? (
          <section className="resource-usage-section">
            <h2>{text.citedChapters}</h2>
            <ol className="resource-usage-list">
              {usages.map((usage) => (
                <li key={usage.chapterId}>
                  <Link href={usage.url}>{usage.label}</Link>
                </li>
              ))}
            </ol>
          </section>
        ) : relatedChapters.length ? (
          <section>
            <h2>{text.relatedChapters}</h2>
            <ul className="resource-related-chapters">
              {relatedChapters.map((chapter) => (
                <li key={chapter.chapterId}>
                  <Link href={chapter.url}>{chapter.label}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section>
          <h2>{text.openAccess}</h2>
          <div className="resource-links">
            {Object.entries(resource.links).map(([kind, url]) =>
              url ? (
                <a key={kind} href={url} rel="noreferrer">
                  <span>{resolveResourceLinkLabel(kind, locale)}</span>
                  {url}
                  <ArrowUpRight size={17} />
                </a>
              ) : null,
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
