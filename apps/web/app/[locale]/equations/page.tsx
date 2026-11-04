import { uiText, learningToolsText } from "@one-forth/config";
import { readerCurriculumRepository, symbols } from "@one-forth/content";
import { localize } from "@one-forth/registry";
import Link from "next/link";
import { CopyTextButton } from "@one-forth/ui";
import { IndexPagination } from "@/components/index-pagination";
import { MathRichTextContent } from "@/components/math-rich-text";
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
  listPublicEquationReferences,
  resolveConceptReferenceLocation,
} from "@/lib/reference-locations";
import {
  resolveConceptLabel,
  resolveDomainLabel,
  resolveEquationKindLabel,
  resolveSubjectLabel,
  resolveSymbolUnitKindLabel,
  resolveUnitLabel,
} from "@/lib/labels";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "公式索引",
  description: "查看 One Forth 核心公式的变量、假设、适用范围与相关概念。",
  path: "/zh-CN/equations",
});

interface EquationsPageProps {
  readonly params: Promise<{ locale: "zh-CN" | "en" }>;
  readonly searchParams: Promise<IndexSearchParams>;
}

const equationPageSize = 20;

interface PublicEquationApplication {
  readonly key: string;
  readonly label: string;
  readonly url?: string;
}

function looksLikeInternalIdentifier(value: string): boolean {
  return /^[a-z0-9]+(?:[._:-][a-z0-9]+)+$/iu.test(value);
}

async function resolvePublicEquationApplication(
  application: string,
  locale: "zh-CN" | "en",
): Promise<PublicEquationApplication | null> {
  const value = application.trim();
  if (!value) return null;

  const conceptLocation = await resolveConceptReferenceLocation(value, locale);
  if (conceptLocation) {
    return {
      key: `concept:${value}`,
      label: resolveConceptLabel(value, locale),
      url: conceptLocation.url,
    };
  }

  const chapterContext = readerCurriculumRepository.getChapterContext(value, locale);
  if (chapterContext) {
    return {
      key: `chapter:${value}`,
      label: `${chapterContext.book.code} · ${localize(chapterContext.chapter.title, locale)}`,
      url: chapterContext.canonicalPath,
    };
  }

  const isLocalizedScenario =
    locale === "zh-CN" ? /\p{Script=Han}/u.test(value) : /[A-Za-z]{2,}\s+[A-Za-z]{2,}/u.test(value);
  return !looksLikeInternalIdentifier(value) && isLocalizedScenario
    ? { key: `scenario:${value}`, label: value }
    : null;
}

export default async function EquationsPage({ params, searchParams }: EquationsPageProps) {
  const [{ locale }, queryParams] = await Promise.all([params, searchParams]);
  const text = learningToolsText[locale];
  const equationReferences = await listPublicEquationReferences(locale);
  const symbolById = new Map(symbols.map((symbol) => [symbol.id, symbol] as const));
  const domains = [...new Set(equationReferences.map(({ equation }) => equation.domain))].sort();
  const subjects = [
    ...new Set(equationReferences.flatMap(({ equation }) => equation.subjects)),
  ].sort((left, right) =>
    resolveSubjectLabel(left, locale).localeCompare(resolveSubjectLabel(right, locale), locale),
  );
  const requestedDomain = firstSearchParam(queryParams.domain);
  const selectedDomain = domains.includes(requestedDomain) ? requestedDomain : "";
  const requestedSubject = firstSearchParam(queryParams.subject);
  const selectedSubject = subjects.includes(requestedSubject) ? requestedSubject : "";
  const query = normalizeIndexQuery(queryParams.q, locale);
  const filteredReferences = equationReferences
    .filter(({ equation }) => !selectedDomain || equation.domain === selectedDomain)
    .filter(({ equation }) => !selectedSubject || equation.subjects.includes(selectedSubject))
    .filter(({ equation, location }) => {
      if (!query) return true;
      return [
        location?.label ?? "",
        ...equation.variables.map((variable) => localize(variable.role, locale)),
        localize(equation.name, locale),
        equation.plainText,
        equation.latex,
        ...equation.relatedTopics.map((topic) => resolveConceptLabel(topic, locale)),
      ]
        .join("\n")
        .toLocaleLowerCase(locale)
        .includes(query);
    })
    .sort(
      (left, right) =>
        left.equation.domain.localeCompare(right.equation.domain, "en") ||
        localize(left.equation.name, locale).localeCompare(
          localize(right.equation.name, locale),
          locale,
        ) ||
        left.equation.id.localeCompare(right.equation.id),
    );
  const targetEquationId = firstSearchParam(queryParams.equation);
  const requestedPage = firstSearchParam(queryParams.page)
    ? parsePositivePage(queryParams.page)
    : pageContainingIndex(
        filteredReferences.findIndex(({ equation }) => equation.id === targetEquationId),
        equationPageSize,
      );
  const pagination = paginateItems(filteredReferences, requestedPage, equationPageSize);
  const entries = await Promise.all(
    pagination.items.map(async ({ equation, location }) => {
      const [topics, applications] = await Promise.all([
        Promise.all(
          equation.relatedTopics.map(async (topic) => ({
            topic,
            location: await resolveConceptReferenceLocation(topic, locale),
          })),
        ),
        Promise.all(
          equation.applications.map((application) =>
            resolvePublicEquationApplication(application, locale),
          ),
        ),
      ]);
      return {
        equation,
        location,
        topics: topics.filter(
          (entry): entry is { topic: string; location: NonNullable<typeof entry.location> } =>
            entry.location !== null,
        ),
        applications: applications.filter(
          (application): application is PublicEquationApplication => application !== null,
        ),
      };
    }),
  );
  const pathname = `/${locale}/equations`;
  return (
    <main id="main-content" className="reference-index-page">
      <header className="reference-index-hero">
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link href={`/${locale}`}>首页</Link>
          <span>/</span>
          <span aria-current="page">公式索引</span>
        </nav>
        <h1>{uiText[locale].readerInterface.equations}</h1>
      </header>
      <nav className="reference-switcher" aria-label="知识索引">
        <Link href={`/${locale}/glossary`}>术语表</Link>
        <Link href={`/${locale}/symbols`}>符号表</Link>
        <Link aria-current="page" href={`/${locale}/equations`}>
          公式索引
        </Link>
      </nav>
      <ReferenceFilters
        action={pathname}
        resultCount={filteredReferences.length}
        resultLabel="条公式"
        fields={[
          {
            name: "q",
            label: "检索",
            value: firstSearchParam(queryParams.q),
            type: "search",
            placeholder: text.equationSearch,
          },
          {
            name: "domain",
            label: "学科",
            value: selectedDomain,
            type: "select",
            allLabel: "全部学科",
            options: domains.map((domain) => ({
              value: domain,
              label: resolveDomainLabel(domain, locale),
            })),
          },
          {
            name: "subject",
            label: "主题",
            value: selectedSubject,
            type: "select",
            allLabel: "全部主题",
            options: subjects.map((subject) => ({
              value: subject,
              label: resolveSubjectLabel(subject, locale),
            })),
          },
        ]}
      />
      {entries.length > 0 ? (
        <ol className="equation-index">
          {entries.map(({ equation, location, topics, applications }, index) => {
            return (
              <li key={equation.id} id={equation.id}>
                <header>
                  <span>式 {String(pagination.offset + index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="eyebrow">
                      {resolveDomainLabel(equation.domain, locale)} ·{" "}
                      {equation.subjects
                        .map((subject) => resolveSubjectLabel(subject, locale))
                        .join(" · ")}{" "}
                      · {resolveEquationKindLabel(equation.equationKind, locale)}
                    </p>
                    <h2>
                      {location ? (
                        <Link href={location.url}>{localize(equation.name, locale)}</Link>
                      ) : (
                        localize(equation.name, locale)
                      )}
                    </h2>
                    {location ? (
                      <p className="reference-location">
                        教材位置：<Link href={location.url}>{location.label}</Link>
                      </p>
                    ) : null}
                  </div>
                </header>
                <StaticMath
                  latex={equation.latex}
                  plainText={equation.plainText}
                  display
                  label={localize(equation.accessibleLabel, locale)}
                />
                <div className="equation-conditions">
                  <strong>{text.conditions}</strong>
                  <ul>
                    {equation.assumptions.map((assumption) => (
                      <li key={localize(assumption, locale)}>
                        <MathRichTextContent value={localize(assumption, locale)} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="equation-actions">
                  <CopyTextButton
                    value={equation.latex}
                    label={text.copyLatex}
                    copiedLabel={text.copied}
                    failureLabel={text.copyFailed}
                  />
                  {location ? <Link href={location.url}>{text.openChapter} ↗</Link> : null}
                </div>
                <details className="equation-expanded" open={targetEquationId === equation.id}>
                  <summary>{text.variablesAndUse}</summary>
                  <div className="equation-index__details">
                    <section>
                      <h3>变量</h3>
                      <dl>
                        {equation.variables.flatMap((variable, variableIndex) => {
                          const symbol = symbolById.get(variable.symbolId);
                          const unit = variable.unit ?? symbol?.unit;
                          return symbol
                            ? [
                                <div key={`${equation.id}-${variable.symbolId}-${variableIndex}`}>
                                  <dt>
                                    <StaticMath
                                      latex={symbol.latex}
                                      plainText={symbol.plainText}
                                      label={localize(symbol.accessibleLabel, locale)}
                                    />
                                  </dt>
                                  <dd>
                                    {localize(variable.role, locale)}
                                    ，单位：
                                    {unit
                                      ? resolveUnitLabel(unit, locale)
                                      : resolveSymbolUnitKindLabel(symbol.unitKind, locale)}
                                  </dd>
                                </div>,
                              ]
                            : [];
                        })}
                      </dl>
                    </section>

                    <section>
                      {topics.length > 0 ? (
                        <>
                          <h3>相关概念</h3>
                          <div className="equation-topic-links">
                            {topics.map(({ topic, location: topicLocation }) => (
                              <Link key={topicLocation.url} href={topicLocation.url}>
                                {resolveConceptLabel(topic, locale)}
                              </Link>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </section>
                    <section>
                      <h3>适用与边界</h3>
                      <ul>
                        {applications.map((application) => (
                          <li key={application.key} data-equation-application>
                            应用：
                            {application.url ? (
                              <Link href={application.url}>
                                <MathRichTextContent value={application.label} />
                              </Link>
                            ) : (
                              <MathRichTextContent value={application.label} />
                            )}
                          </li>
                        ))}
                        {equation.limitingCases.map((limitingCase) => (
                          <li key={`limit-${limitingCase}`}>
                            边界：
                            <MathRichTextContent value={limitingCase} />
                          </li>
                        ))}
                        {equation.derivations.map((derivation) => (
                          <li key={`derivation-${derivation}`}>
                            推导：
                            {location ? (
                              <Link href={location.url}>{location.label}</Link>
                            ) : (
                              "见所在教材"
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="reference-index-empty">没有符合当前筛选条件的公式。</p>
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
