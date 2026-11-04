import { uiText } from "@one-forth/config";
import { listToolIndexEntries } from "@one-forth/content/tool-index";
import { domainRegistry } from "@one-forth/registry";
import { ArrowRight, BookA } from "lucide-react";
import Link from "next/link";
import { IndexPagination } from "@/components/index-pagination";
import { MathRichText } from "@/components/math-rich-text";
import { ReferenceFilters } from "@/components/reference-filters";
import {
  firstSearchParam,
  normalizeIndexQuery,
  pageContainingIndex,
  paginateItems,
  parsePositivePage,
  type IndexSearchParams,
} from "@/lib/index-query";
import { resolveDomainLabel } from "@/lib/labels";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "术语表",
  description: "按学科检索 One Forth 已公开正文中的概念定义与关系。",
  path: "/zh-CN/glossary",
});

interface GlossaryPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en" }>;
  readonly searchParams: Promise<IndexSearchParams>;
}

const glossaryPageSize = 50;

export default async function GlossaryPage({ params, searchParams }: GlossaryPageProps) {
  const [{ locale }, queryParams] = await Promise.all([params, searchParams]);
  const entries = listToolIndexEntries({
    locale,
    kind: ["concept", "definition"],
  }).filter((entry) => entry.title.trim() !== "" && entry.title.trim() !== entry.sourceId);
  const query = normalizeIndexQuery(queryParams.q, locale);
  const domains = [...domainRegistry.list()]
    .filter((domain) => entries.some((entry) => entry.domain === domain.id))
    .sort((left, right) => left.order - right.order);
  const requestedDomain = firstSearchParam(queryParams.domain);
  const selectedDomain = domains.some((domain) => domain.id === requestedDomain)
    ? requestedDomain
    : "";
  const domainOrder = new Map(domains.map((domain, index) => [domain.id, index] as const));
  const filteredEntries = entries
    .filter((entry) => !selectedDomain || entry.domain === selectedDomain)
    .filter((entry) =>
      !query
        ? true
        : `${entry.title}\n${entry.summary ?? ""}`.toLocaleLowerCase(locale).includes(query),
    )
    .sort(
      (left, right) =>
        (domainOrder.get(left.domain ?? "") ?? Number.MAX_SAFE_INTEGER) -
          (domainOrder.get(right.domain ?? "") ?? Number.MAX_SAFE_INTEGER) ||
        left.title.localeCompare(right.title, locale) ||
        left.id.localeCompare(right.id),
    );
  const targetEntryId = firstSearchParam(queryParams.entry);
  const requestedPage = firstSearchParam(queryParams.page)
    ? parsePositivePage(queryParams.page)
    : pageContainingIndex(
        filteredEntries.findIndex((entry) => entry.id === targetEntryId),
        glossaryPageSize,
      );
  const pagination = paginateItems(filteredEntries, requestedPage, glossaryPageSize);
  const visibleDomains = domains.filter((domain) =>
    pagination.items.some((entry) => entry.domain === domain.id),
  );
  const pathname = `/${locale}/glossary`;

  return (
    <main id="main-content" className="reference-index-page">
      <header className="reference-index-hero">
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link href={`/${locale}`}>首页</Link>
          <span>/</span>
          <span aria-current="page">术语表</span>
        </nav>
        <h1>{uiText[locale].readerInterface.glossary}</h1>
      </header>

      <nav className="reference-switcher" aria-label="知识索引">
        <Link aria-current="page" href={pathname}>
          术语表
        </Link>
        <Link href={`/${locale}/symbols`}>符号表</Link>
        <Link href={`/${locale}/equations`}>公式索引</Link>
      </nav>

      <ReferenceFilters
        action={pathname}
        resultCount={filteredEntries.length}
        resultLabel="个术语与定义"
        fields={[
          {
            name: "q",
            label: "检索",
            value: firstSearchParam(queryParams.q),
            type: "search",
            placeholder: "名称或定义关键词",
          },
          {
            name: "domain",
            label: "学科",
            value: selectedDomain,
            type: "select",
            allLabel: "全部学科",
            options: domains.map((domain) => ({
              value: domain.id,
              label: resolveDomainLabel(domain.id, locale),
            })),
          },
        ]}
      />

      {pagination.items.length > 0 ? (
        <div className="glossary-directory">
          {visibleDomains.map((domain) => {
            const domainEntries = pagination.items.filter((entry) => entry.domain === domain.id);
            return (
              <section key={domain.id} id={domain.id} className="glossary-domain">
                <header>
                  <span data-domain={domain.id} aria-hidden="true" />
                  <div>
                    <p className="eyebrow">学科领域</p>
                    <h2>{resolveDomainLabel(domain.id, locale)}</h2>
                  </div>
                  <strong>{domainEntries.length}</strong>
                </header>
                <ol>
                  {domainEntries.map((entry) => {
                    return (
                      <li key={entry.id} id={`glossary-${entry.id}`}>
                        <BookA aria-hidden="true" size={16} />
                        <div>
                          <Link href={entry.canonicalUrl}>{entry.title}</Link>
                          <small>{entry.kind === "definition" ? "正文定义" : "章节主题"}</small>
                          {entry.summary ? (
                            <MathRichText
                              value={entry.summary}
                              mathClassName="static-math--glossary"
                            />
                          ) : null}
                        </div>
                        <span>难度 {entry.difficulty ?? "—"}</span>
                        <ArrowRight aria-hidden="true" size={16} />
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="reference-index-empty">没有符合当前筛选条件的术语或定义。</p>
      )}
      <IndexPagination
        pathname={pathname}
        searchParams={queryParams}
        pagination={pagination}
        itemLabel="条"
      />
    </main>
  );
}
