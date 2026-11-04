"use client";

import { uiText, type SupportedLocale } from "@one-forth/config";
import {
  searchDocuments,
  type SearchDocument,
  type SearchDocumentKind,
} from "@one-forth/search/client";
import { subjectRegistry } from "@one-forth/registry";
import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  resolveContentKindLabel,
  resolveDomainLabel,
  resolveSubjectLabel,
} from "@/lib/client-labels";
import { fetchBaseSearchCatalog } from "@/lib/planning-search-catalog";
import { SearchResultSummary } from "@/components/search-result-summary";

interface SearchPageClientProps {
  readonly catalog?: readonly SearchDocument[];
  readonly initialQuery: string;
  readonly initialDomain: string;
  readonly initialSubject: string;
  readonly locale?: SupportedLocale;
}

function resolveSearchKindLabel(kind: SearchDocumentKind, locale: SupportedLocale): string {
  if (kind === "chapter") return locale === "en" ? "Chapter" : "章节";
  return resolveContentKindLabel(kind, locale);
}

function resolveCurriculumTrail(document: SearchDocument, locale: SupportedLocale): string | null {
  const location = document.curriculum;
  if (!location) return null;
  const chapter =
    locale === "en"
      ? `Chapter ${location.chapterNumber}: ${location.chapterTitle}`
      : `第 ${location.chapterNumber} 章 ${location.chapterTitle}`;
  return `${location.seriesTitle} / ${location.bookCode} ${location.bookTitle} / ${location.partTitle} · ${chapter}`;
}

export function SearchPageClient({
  catalog = [],
  initialQuery,
  initialDomain,
  initialSubject,
  locale = "zh-CN",
}: SearchPageClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [domain, setDomain] = useState(initialDomain);
  const [subject, setSubject] = useState(initialSubject);
  const [kind, setKind] = useState<SearchDocumentKind | "">("");
  const [maximumDifficulty, setMaximumDifficulty] = useState(5);
  const [loadedBaseCatalog, setLoadedBaseCatalog] = useState<readonly SearchDocument[]>([]);
  const [baseCatalogLoaded, setBaseCatalogLoaded] = useState(catalog.length > 0);
  const [baseLoading, setBaseLoading] = useState(
    initialQuery.trim().length > 0 && catalog.length === 0,
  );
  const [baseError, setBaseError] = useState(false);

  const effectiveCatalog = useMemo(() => {
    const documents = new Map<string, SearchDocument>();
    for (const document of [...catalog, ...loadedBaseCatalog]) {
      documents.set(document.key, document);
    }
    return [...documents.values()];
  }, [catalog, loadedBaseCatalog]);

  const loadBaseCatalog = useCallback(async (): Promise<void> => {
    if (baseCatalogLoaded || baseLoading) return;
    setBaseLoading(true);
    setBaseError(false);
    try {
      setLoadedBaseCatalog(await fetchBaseSearchCatalog(locale));
      setBaseCatalogLoaded(true);
    } catch {
      setBaseError(true);
    } finally {
      setBaseLoading(false);
    }
  }, [baseCatalogLoaded, baseLoading, locale]);

  useEffect(() => {
    if (!initialQuery.trim() || catalog.length > 0) return;
    let cancelled = false;
    void fetchBaseSearchCatalog(locale).then(
      (documents) => {
        if (cancelled) return;
        setLoadedBaseCatalog(documents);
        setBaseCatalogLoaded(true);
        setBaseLoading(false);
      },
      () => {
        if (cancelled) return;
        setBaseError(true);
        setBaseLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [catalog.length, initialQuery, locale]);

  const filteredCatalog = useMemo(
    () => effectiveCatalog.filter((document) => !subject || document.subject === subject),
    [effectiveCatalog, subject],
  );
  const results = useMemo(
    () =>
      query.trim()
        ? searchDocuments(filteredCatalog, query, {
            ...(domain ? { domain } : {}),
            ...(kind ? { kind } : {}),
            maximumDifficulty,
          })
        : [],
    [domain, filteredCatalog, kind, maximumDifficulty, query],
  );
  const domainOptions = useMemo(
    () => [
      ...new Set(
        effectiveCatalog
          .map((document) => document.domain)
          .filter((value): value is string => Boolean(value)),
      ),
    ],
    [effectiveCatalog],
  );
  const subjectOptions = useMemo(
    () =>
      subjectRegistry
        .list()
        .filter((definition) => !domain || definition.domainId === domain)
        .filter((definition) =>
          effectiveCatalog.some((document) => document.subject === definition.id),
        ),
    [effectiveCatalog, domain],
  );

  return (
    <div className="search-page-layout">
      <aside className="search-page-filters" aria-label="筛选搜索结果">
        <div>
          <label htmlFor="search-domain">学科</label>
          <select
            id="search-domain"
            value={domain}
            onFocus={() => void loadBaseCatalog()}
            onChange={(event) => {
              const nextDomain = event.target.value;
              setDomain(nextDomain);
              if (subject && subjectRegistry.get(subject)?.domainId !== nextDomain) setSubject("");
            }}
          >
            <option value="">全部</option>
            {domainOptions.map((id) => {
              return (
                <option key={id} value={id}>
                  {resolveDomainLabel(id, locale)}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label htmlFor="search-subject">主题</label>
          <select
            id="search-subject"
            value={subject}
            onFocus={() => void loadBaseCatalog()}
            onChange={(event) => setSubject(event.target.value)}
          >
            <option value="">全部</option>
            {subjectOptions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {resolveSubjectLabel(definition.id, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="search-kind">类型</label>
          <select
            id="search-kind"
            value={kind}
            onFocus={() => void loadBaseCatalog()}
            onChange={(event) => setKind(event.target.value as SearchDocumentKind | "")}
          >
            <option value="">全部</option>
            <option value="article">正文</option>
            <option value="chapter">章节</option>
            <option value="concept">概念</option>
            <option value="experiment">实验</option>
            <option value="equation">方程</option>
            <option value="symbol">符号</option>
            <option value="learning-path">学习路径</option>
            <option value="paper">论文</option>
            <option value="book">书籍</option>
          </select>
        </div>
        <div>
          <label htmlFor="search-difficulty">最高难度</label>
          <output htmlFor="search-difficulty">{maximumDifficulty}/5</output>
          <input
            id="search-difficulty"
            type="range"
            min="1"
            max="5"
            value={maximumDifficulty}
            onChange={(event) => setMaximumDifficulty(Number(event.target.value))}
          />
        </div>
      </aside>
      <section className="search-page-results" aria-busy={baseLoading}>
        <div className="search-page-input">
          <Search aria-hidden="true" size={21} />
          <input
            value={query}
            onFocus={() => void loadBaseCatalog()}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              if (nextQuery.trim()) void loadBaseCatalog();
            }}
            placeholder="输入概念、符号、英文别名或 LaTeX"
            aria-label="搜索全部知识"
          />
          <span role="status" aria-live="polite">
            {baseLoading ? "正在载入…" : `${results.length} 项`}
          </span>
        </div>
        {!query.trim() ? (
          <div className="search-page-empty">
            <h2>输入关键词开始搜索</h2>
            <p>可以使用中文、英文别名、数学符号或 LaTeX。</p>
          </div>
        ) : baseLoading ? (
          <div className="search-page-empty" role="status">
            <h2>{uiText[locale].readerInterface.searchLoading}</h2>
          </div>
        ) : baseError ? (
          <div className="search-page-empty">
            <h2>{uiText[locale].readerInterface.searchUnavailable}</h2>
            <p role="alert">请检查网络连接后重试。</p>
            <button type="button" onClick={() => void loadBaseCatalog()}>
              重试载入
            </button>
          </div>
        ) : results.length > 0 ? (
          <ol>
            {results.map(({ document }) => (
              <li key={document.key}>
                <Link href={document.url}>
                  <span className="result-kind">
                    {resolveSearchKindLabel(document.kind, locale)}
                  </span>
                  <div>
                    <h2>{document.title}</h2>
                    {resolveCurriculumTrail(document, locale) ? (
                      <p className="search-result-location">
                        {resolveCurriculumTrail(document, locale)}
                      </p>
                    ) : null}
                    <p>
                      <SearchResultSummary kind={document.kind} summary={document.summary} />
                    </p>
                    <small>
                      {[
                        document.domain ? resolveDomainLabel(document.domain, locale) : "",
                        document.subject ? resolveSubjectLabel(document.subject, locale) : "",
                        document.difficulty ? `难度 ${document.difficulty}` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </div>
                  <ArrowUpRight aria-hidden="true" size={18} />
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="search-page-empty">
            <h2>没有匹配项</h2>
            <p>尝试删除筛选、输入更短的关键词，或换用英文别名。</p>
          </div>
        )}
      </section>
    </div>
  );
}
