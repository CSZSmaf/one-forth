import { uiText } from "@one-forth/config";
import type { RevisionType } from "@one-forth/content";
import { listToolIndexEntries, type ToolIndexEntry } from "@one-forth/content/tool-index";
import { domainRegistry } from "@one-forth/registry";
import Link from "next/link";
import { IndexPagination } from "@/components/index-pagination";
import { ReferenceFilters } from "@/components/reference-filters";
import {
  firstSearchParam,
  paginateItems,
  parsePositivePage,
  type IndexSearchParams,
} from "@/lib/index-query";
import { resolveDomainLabel } from "@/lib/labels";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "最近更新",
  description: "按日期查看 One Forth 正文的实质修订、数学纠错与引用更新。",
  path: "/zh-CN/updates",
});

const revisionTypeLabels: Readonly<Record<RevisionType, string>> = {
  substantive: "内容修订",
  "mathematical-correction": "数学纠错",
  "citation-update": "引用更新",
  style: "样式调整",
  "metadata-migration": "元数据迁移",
};

const publicRevisionTypes = [
  "substantive",
  "mathematical-correction",
  "citation-update",
] as const satisfies readonly RevisionType[];

function isRecentUpdateEntry(
  entry: ToolIndexEntry,
): entry is ToolIndexEntry & { readonly date: string; readonly revisionType: RevisionType } {
  return Boolean(entry.date) && publicRevisionTypes.some((type) => entry.revisionType === type);
}

export function deduplicateRecentUpdates(
  entries: readonly ToolIndexEntry[],
): readonly (ToolIndexEntry & { readonly date: string; readonly revisionType: RevisionType })[] {
  const unique = new Map<
    string,
    ToolIndexEntry & { readonly date: string; readonly revisionType: RevisionType }
  >();
  for (const entry of entries) {
    if (!isRecentUpdateEntry(entry)) continue;
    const key = [
      entry.documentId ?? entry.chapterId ?? entry.canonicalUrl,
      entry.date,
      entry.revisionType,
      entry.title,
      entry.summary ?? "",
    ].join("\0");
    if (!unique.has(key)) unique.set(key, entry);
  }
  return [...unique.values()];
}

interface UpdatesPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en" }>;
  readonly searchParams: Promise<IndexSearchParams>;
}

const updatePageSize = 40;

export default async function UpdatesPage({ params, searchParams }: UpdatesPageProps) {
  const [{ locale }, queryParams] = await Promise.all([params, searchParams]);
  const requestedType = firstSearchParam(queryParams.type);
  const selectedType = publicRevisionTypes.find((type) => type === requestedType) ?? "";
  const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
  const requestedFromDate = firstSearchParam(queryParams.from);
  const requestedToDate = firstSearchParam(queryParams.to);
  const fromDate = datePattern.test(requestedFromDate) ? requestedFromDate : "";
  const toDate = datePattern.test(requestedToDate) ? requestedToDate : "";
  const recentUpdates = deduplicateRecentUpdates(
    listToolIndexEntries({ locale, kind: "revision" }),
  );
  const requestedDomain = firstSearchParam(queryParams.domain);
  const selectedDomain = recentUpdates.some((entry) => entry.domain === requestedDomain)
    ? requestedDomain
    : "";
  const updates = recentUpdates
    .filter((entry) => !selectedType || entry.revisionType === selectedType)
    .filter((entry) => !selectedDomain || entry.domain === selectedDomain)
    .filter((entry) => !fromDate || entry.date >= fromDate)
    .filter((entry) => !toDate || entry.date <= toDate)
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        left.title.localeCompare(right.title, "zh-CN") ||
        left.revisionType.localeCompare(right.revisionType),
    );
  const pagination = paginateItems(updates, parsePositivePage(queryParams.page), updatePageSize);
  const domains = [...domainRegistry.list()]
    .filter((domain) => recentUpdates.some((entry) => entry.domain === domain.id))
    .sort((left, right) => left.order - right.order);
  const pathname = `/${locale}/updates`;

  return (
    <main id="main-content" className="reference-index-page update-archive-page">
      <header className="reference-index-hero">
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link href={`/${locale}`}>首页</Link>
          <span>/</span>
          <span aria-current="page">最近更新</span>
        </nav>
        <h1>{uiText[locale].readerInterface.updates}</h1>
      </header>

      <ReferenceFilters
        action={pathname}
        resultCount={updates.length}
        resultLabel="条修订"
        fields={[
          {
            name: "type",
            label: "修订类型",
            value: selectedType,
            type: "select",
            allLabel: uiText[locale].readerInterface.allUpdates,
            options: publicRevisionTypes.map((type) => ({
              value: type,
              label: revisionTypeLabels[type],
            })),
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
          { name: "from", label: "起始日期", value: fromDate, type: "date" },
          { name: "to", label: "结束日期", value: toDate, type: "date" },
        ]}
      />

      {pagination.items.length > 0 ? (
        <ol className="update-archive" aria-label={uiText[locale].readerInterface.updateList}>
          {pagination.items.map((entry, index) => (
            <li key={entry.id}>
              <span className="update-archive__index">
                {String(pagination.offset + index + 1).padStart(2, "0")}
              </span>
              <time dateTime={entry.date}>{entry.date}</time>
              <div className="update-archive__content">
                <p>
                  <span>{revisionTypeLabels[entry.revisionType]}</span>
                  {entry.domain ? <span>{resolveDomainLabel(entry.domain, locale)}</span> : null}
                </p>
                <h2>
                  <Link href={entry.canonicalUrl}>{entry.title}</Link>
                </h2>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="update-archive__empty">{uiText[locale].readerInterface.noUpdates}</p>
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
