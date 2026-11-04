import { readerDirectoryText, uiText } from "@one-forth/config";
import { readerConceptById, type ResourceKind } from "@one-forth/content";
import { localize } from "@one-forth/registry";
import { DirectoryNavigation } from "@one-forth/ui";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { IndexPagination } from "@/components/index-pagination";
import { ReferenceFilters } from "@/components/reference-filters";
import {
  createIndexHref,
  firstSearchParam,
  normalizeIndexQuery,
  paginateItems,
  parsePositivePage,
  type IndexSearchParams,
} from "@/lib/index-query";
import { createPageMetadata } from "@/lib/metadata";
import {
  briefResourceSource,
  compareResourceTopics,
  directoryDomains,
  resourceDomains,
  resourcePlacement,
} from "@/lib/reader-directory";
import { listPublicResources } from "@/lib/reference-locations";

export const metadata = createPageMetadata({
  title: uiText["zh-CN"].readerInterface.resources,
  description: uiText["zh-CN"].readerInterface.resourceDescription,
  path: "/zh-CN/resources",
});

const resourceKindOrder: readonly ResourceKind[] = [
  "lecture",
  "book",
  "paper",
  "software",
  "dataset",
  "simulation",
  "historical-source",
  "encyclopedia-entry",
];
interface ResourcesPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en" }>;
  readonly searchParams: Promise<IndexSearchParams>;
}

export default async function ResourcesPage({ params, searchParams }: ResourcesPageProps) {
  const [{ locale }, queryParams] = await Promise.all([params, searchParams]);
  const text = readerDirectoryText[locale];
  const publicResources = await listPublicResources(locale);
  const pathname = `/${locale}/resources`;
  const domain =
    directoryDomains.find((d) => d.id === firstSearchParam(queryParams.domain))?.id ?? "";
  const kind = resourceKindOrder.find((k) => k === firstSearchParam(queryParams.kind)) ?? "";
  const query = normalizeIndexQuery(queryParams.q, locale);
  const domains = directoryDomains.filter((d) =>
    publicResources.some((r) => resourceDomains(r).includes(d.id)),
  );
  const domainResources = publicResources.filter(
    (r) => !domain || resourceDomains(r).includes(domain),
  );
  const filtered = domainResources
    .filter((r) => !kind || r.kind === kind)
    .filter(
      (r) =>
        !query ||
        [
          r.title,
          r.authors?.join(" "),
          r.publisher,
          r.venue,
          r.description && localize(r.description, locale),
          ...r.topics.map((id) => {
            const c = readerConceptById.get(id);
            return c && localize(c.title, locale);
          }),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(query),
    );
  const sorted = [...filtered].sort(
    (a, b) =>
      compareResourceTopics(a, b, domain) ||
      resourceKindOrder.indexOf(a.kind) - resourceKindOrder.indexOf(b.kind) ||
      (resourcePlacement(a, domain)?.context.chapterNumber ?? 999) -
        (resourcePlacement(b, domain)?.context.chapterNumber ?? 999) ||
      a.title.localeCompare(b.title, locale, { numeric: true }),
  );
  const pagination = paginateItems(sorted, parsePositivePage(queryParams.page), 24);
  const groupIds = [
    ...new Set(
      pagination.items.map(
        (resource) => resourcePlacement(resource, domain)?.context.book.id ?? resource.kind,
      ),
    ),
  ];
  const href = (changes: Record<string, string | null>) =>
    createIndexHref(
      pathname,
      { q: firstSearchParam(queryParams.q), domain, kind },
      { ...changes, page: null },
    );

  return (
    <main
      id="main-content"
      className="reference-index-page resource-directory-page reader-directory-page"
    >
      <header className="reference-index-hero">
        <nav className="breadcrumbs" aria-label={text.breadcrumbs}>
          <Link href={`/${locale}`}>{text.home}</Link>
          <span>/</span>
          <span aria-current="page">{text.resources}</span>
        </nav>
        <h1>{text.resources}</h1>
      </header>
      <DirectoryNavigation
        label={text.domain}
        items={[
          { href: href({ domain: null }), label: text.allDomains, selected: !domain },
          ...domains.map((d) => ({
            href: href({ domain: d.id }),
            label: localize(d.shortTitle, locale),
            selected: d.id === domain,
          })),
        ]}
      />
      <DirectoryNavigation
        secondary
        label={text.kind}
        items={[
          {
            href: href({ kind: null }),
            label: text.allKinds,
            count: domainResources.length,
            selected: !kind,
          },
          ...resourceKindOrder
            .filter((k) => domainResources.some((r) => r.kind === k))
            .map((k) => ({
              href: href({ kind: k }),
              label: text.types[k],
              count: domainResources.filter((r) => r.kind === k).length,
              selected: k === kind,
            })),
        ]}
      />
      <ReferenceFilters
        locale={locale}
        action={pathname}
        hiddenFields={{ domain, kind }}
        resultCount={filtered.length}
        resultLabel={text.resourceCount}
        fields={[
          {
            name: "q",
            label: text.search,
            value: firstSearchParam(queryParams.q),
            type: "search",
            placeholder: text.resourceSearch,
          },
        ]}
      />
      {pagination.items.length ? (
        <div className="resource-directory">
          {groupIds.map((groupId) => {
            const items = pagination.items.filter(
              (r) => (resourcePlacement(r, domain)?.context.book.id ?? r.kind) === groupId,
            );
            const book = items[0] ? resourcePlacement(items[0], domain)?.context.book : undefined;
            return items.length ? (
              <section key={groupId} aria-labelledby={`resource-topic-${groupId}`}>
                <header className="resource-directory__heading">
                  <h2 id={`resource-topic-${groupId}`}>
                    {book ? localize(book.title, locale) : text.resources}
                  </h2>
                  {book ? <strong>{book.code}</strong> : null}
                </header>
                <ol className="resource-directory__list">
                  {items.map((r) => (
                    <li key={r.id}>
                      <div>
                        <h3>
                          <Link href={`/${locale}/resources/${r.id}`}>{r.title}</Link>
                        </h3>
                        {r.description ? <p>{localize(r.description, locale)}</p> : null}
                        <p className="resource-bibliography">
                          {text.types[r.kind]} · {briefResourceSource(r)}
                        </p>
                      </div>
                      <a
                        className="resource-directory__source"
                        href={r.links.official ?? r.links.doi ?? r.links.arxiv ?? r.links.code}
                        rel="noreferrer"
                        aria-label={`${text.source}: ${r.title}`}
                      >
                        {text.source}
                        <ArrowUpRight aria-hidden="true" size={17} />
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null;
          })}
        </div>
      ) : (
        <p className="reference-index-empty">{text.noResources}</p>
      )}
      <IndexPagination
        pathname={pathname}
        searchParams={queryParams}
        pagination={pagination}
        itemLabel={text.resourceCount}
      />
    </main>
  );
}
