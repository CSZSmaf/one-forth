import { uiText, learningToolsText } from "@one-forth/config";
import { localize } from "@one-forth/registry";
import Link from "next/link";
import { CopyTextButton } from "@one-forth/ui";
import { IndexPagination } from "@/components/index-pagination";
import { ReferenceFilters } from "@/components/reference-filters";
import { StaticMath } from "@/components/static-math";
import {
  firstSearchParam,
  normalizeIndexQuery,
  pageContainingIndex,
  paginateItems,
  parsePositivePage,
  type IndexSearchParams,
} from "@/lib/index-query";
import {
  resolveDomainLabel,
  resolveSymbolNamespaceLabel,
  resolveSymbolUnitKindLabel,
  resolveUnitLabel,
} from "@/lib/labels";
import { createPageMetadata } from "@/lib/metadata";
import { listPublicSymbolReferences, type PublicSymbolReference } from "@/lib/reference-locations";

export const metadata = createPageMetadata({
  title: "符号表",
  description: "按命名空间查看 One Forth 文章中使用的数学与物理符号。",
  path: "/zh-CN/symbols",
});

interface SymbolsPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en" }>;
  readonly searchParams: Promise<IndexSearchParams>;
}

const symbolPageSize = 50;

interface SymbolConflictGroup {
  readonly notation: string;
  readonly representative: PublicSymbolReference;
  readonly references: readonly PublicSymbolReference[];
}

// 同形冲突按规范化记号聚合：同一字形无论在多少章重复定义，只渲染一次，
// 章节清单收进可展开列表，避免“a、a、a、…”式的重复字形墙。
function groupSymbolConflicts(
  conflictsWith: readonly string[],
  referenceById: ReadonlyMap<string, PublicSymbolReference>,
): readonly SymbolConflictGroup[] {
  const groups = new Map<
    string,
    { representative: PublicSymbolReference; references: PublicSymbolReference[] }
  >();
  for (const id of conflictsWith) {
    const reference = referenceById.get(id);
    if (!reference) continue;
    const notation = reference.symbol.plainText.normalize("NFC").trim();
    const group = groups.get(notation);
    if (group) {
      group.references.push(reference);
    } else {
      groups.set(notation, { representative: reference, references: [reference] });
    }
  }
  return [...groups.entries()].map(([notation, group]) => ({ notation, ...group }));
}

export default async function SymbolsPage({ params, searchParams }: SymbolsPageProps) {
  const [{ locale }, queryParams] = await Promise.all([params, searchParams]);
  const text = learningToolsText[locale];
  const symbolReferences = await listPublicSymbolReferences(locale);
  const domains = [...new Set(symbolReferences.flatMap(({ domain }) => (domain ? [domain] : [])))];
  const selectedDomain = domains.includes(firstSearchParam(queryParams.domain))
    ? firstSearchParam(queryParams.domain)
    : "";
  const namespaces = [...new Set(symbolReferences.map(({ symbol }) => symbol.namespace))].sort();
  const referenceById = new Map(
    symbolReferences.map((reference) => [reference.symbol.id, reference] as const),
  );
  const namespaceContext = new Map<string, { readonly domain?: string; readonly subject?: string }>(
    symbolReferences.map(
      ({ symbol, domain, subject }) =>
        [
          symbol.namespace,
          {
            ...(domain ? { domain } : {}),
            ...(subject ? { subject } : {}),
          },
        ] as const,
    ),
  );
  const requestedNamespace = firstSearchParam(queryParams.namespace);
  const selectedNamespace = namespaces.includes(requestedNamespace) ? requestedNamespace : "";
  const query = normalizeIndexQuery(queryParams.q, locale);
  const filteredReferences = symbolReferences
    .filter(({ domain }) => !selectedDomain || domain === selectedDomain)
    .filter(({ symbol }) => !selectedNamespace || symbol.namespace === selectedNamespace)
    .filter(({ symbol, locations }) => {
      if (!query) return true;
      return [
        symbol.plainText,
        symbol.latex,
        ...symbol.aliases,
        ...locations.map((location) => location.label),
        localize(symbol.meaning, locale),
        resolveSymbolNamespaceLabel(
          symbol.namespace,
          locale,
          namespaceContext.get(symbol.namespace),
        ),
      ]
        .join("\n")
        .toLocaleLowerCase(locale)
        .includes(query);
    })
    .sort(
      (left, right) =>
        left.symbol.namespace.localeCompare(right.symbol.namespace, "en") ||
        left.symbol.plainText.localeCompare(right.symbol.plainText, locale) ||
        left.symbol.id.localeCompare(right.symbol.id),
    );
  const targetSymbolId = firstSearchParam(queryParams.symbol);
  const requestedPage = firstSearchParam(queryParams.page)
    ? parsePositivePage(queryParams.page)
    : pageContainingIndex(
        filteredReferences.findIndex(({ symbol }) => symbol.id === targetSymbolId),
        symbolPageSize,
      );
  const pagination = paginateItems(filteredReferences, requestedPage, symbolPageSize);
  const pathname = `/${locale}/symbols`;
  return (
    <main id="main-content" className="reference-index-page">
      <header className="reference-index-hero">
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link href={`/${locale}`}>首页</Link>
          <span>/</span>
          <span aria-current="page">符号表</span>
        </nav>
        <h1>{uiText[locale].readerInterface.symbols}</h1>
      </header>
      <nav className="reference-switcher" aria-label="知识索引">
        <Link href={`/${locale}/glossary`}>术语表</Link>
        <Link aria-current="page" href={`/${locale}/symbols`}>
          符号表
        </Link>
        <Link href={`/${locale}/equations`}>公式索引</Link>
      </nav>
      <ReferenceFilters
        action={pathname}
        resultCount={filteredReferences.length}
        resultLabel="个符号"
        fields={[
          {
            name: "domain",
            label: text.domain,
            value: selectedDomain,
            type: "select",
            allLabel: text.allDomains,
            options: domains.map((domain) => ({
              value: domain,
              label: resolveDomainLabel(domain, locale),
            })),
          },
          {
            name: "q",
            label: "检索",
            value: firstSearchParam(queryParams.q),
            type: "search",
            placeholder: text.symbolSearch,
          },
          {
            name: "namespace",
            label: uiText[locale].readerInterface.symbolScope,
            value: selectedNamespace,
            type: "select",
            allLabel: uiText[locale].readerInterface.allSymbolScopes,
            options: namespaces.map((namespace) => ({
              value: namespace,
              label: resolveSymbolNamespaceLabel(
                namespace,
                locale,
                namespaceContext.get(namespace),
              ),
            })),
          },
        ]}
      />
      {pagination.items.length > 0 ? (
        <div className="reference-table-wrap reference-table-wrap--symbols">
          <table className="reference-table reference-table--symbols">
            <caption className="sr-only">{text.notation}</caption>
            <thead>
              <tr>
                <th scope="col">{text.notation}</th>
                <th scope="col">{text.meaning}</th>
                <th scope="col">{text.context}</th>
              </tr>
            </thead>
            <tbody>
              {pagination.items.map(({ symbol, locations }) => {
                const conflicts = groupSymbolConflicts(symbol.conflictsWith, referenceById);
                return (
                  <tr key={symbol.id} id={`symbol-${symbol.id}`}>
                    <td className="symbol-notation">
                      <div className="symbol-notation__math" tabIndex={0}>
                        <StaticMath
                          latex={symbol.latex}
                          plainText={symbol.plainText}
                          label={localize(symbol.accessibleLabel, locale)}
                        />
                      </div>
                      <CopyTextButton
                        value={symbol.latex}
                        label={text.copyLatex}
                        copiedLabel={text.copied}
                        failureLabel={text.copyFailed}
                      />
                    </td>
                    <td className="symbol-definition">
                      <p>{localize(symbol.meaning, locale)}</p>
                      {symbol.unit ? (
                        <p className="symbol-unit">
                          {text.unit}: {resolveUnitLabel(symbol.unit, locale)}
                        </p>
                      ) : null}
                      <details className="symbol-details">
                        <summary>{text.details}</summary>
                        <dl>
                          <div>
                            <dt>{text.unit}</dt>
                            <dd>
                              {symbol.unit
                                ? resolveUnitLabel(symbol.unit, locale)
                                : resolveSymbolUnitKindLabel(symbol.unitKind, locale)}
                            </dd>
                          </div>
                          {symbol.assumptions.length ? (
                            <div>
                              <dt>{text.conditions}</dt>
                              <dd>{symbol.assumptions.join("；")}</dd>
                            </div>
                          ) : null}
                          {symbol.aliases.length ? (
                            <div>
                              <dt>{text.aliases}</dt>
                              <dd>{symbol.aliases.join("、")}</dd>
                            </div>
                          ) : null}
                        </dl>
                        {conflicts.map((group) => (
                          <details
                            key={group.notation}
                            className="symbol-conflict-list"
                            data-notation={group.representative.symbol.latex}
                          >
                            <summary>
                              {text.otherMeanings} · {group.references.length}
                            </summary>
                            <ol>
                              {group.references.map((reference) => (
                                <li key={reference.symbol.id}>
                                  <Link
                                    href={`${pathname}?symbol=${reference.symbol.id}#symbol-${reference.symbol.id}`}
                                  >
                                    {reference.location.label}
                                  </Link>
                                </li>
                              ))}
                            </ol>
                          </details>
                        ))}
                      </details>
                    </td>
                    <td className="symbol-context">
                      <span>
                        {resolveSymbolNamespaceLabel(
                          symbol.namespace,
                          locale,
                          namespaceContext.get(symbol.namespace),
                        )}
                      </span>
                      {locations[0] ? (
                        <Link href={locations[0].url}>{locations[0].label}</Link>
                      ) : null}
                      {locations.length > 1 ? (
                        <details className="symbol-location-list">
                          <summary>
                            {text.source} · {locations.length}
                          </summary>
                          <ol>
                            {locations.slice(1).map((location) => (
                              <li key={location.url}>
                                <Link href={location.url}>{location.label}</Link>
                              </li>
                            ))}
                          </ol>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="reference-index-empty">没有符合当前筛选条件的符号。</p>
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
