"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { siteConfig, uiText, type SupportedLocale } from "@one-forth/config";
import {
  searchDocuments,
  type SearchDocument,
  type SearchDocumentKind,
} from "@one-forth/search/client";
import { ArrowRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { resolveContentKindLabel, resolveDomainLabel } from "@/lib/client-labels";
import { fetchBaseSearchCatalog } from "@/lib/planning-search-catalog";
import { SearchResultSummary } from "@/components/search-result-summary";

interface SearchDialogProps {
  readonly catalog?: readonly SearchDocument[];
  readonly locale: SupportedLocale;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly restoreFocusRef: RefObject<HTMLElement | null>;
}

const filterKinds = [
  "article",
  "chapter",
  "concept",
  "experiment",
  "equation",
  "learning-path",
  "paper",
] as const satisfies readonly SearchDocumentKind[];

function resolveCurriculumTrail(document: SearchDocument, locale: SupportedLocale): string | null {
  const location = document.curriculum;
  if (!location) return null;
  const chapterNumber =
    locale === "en" ? `Chapter ${location.chapterNumber}` : `第 ${location.chapterNumber} 章`;
  return `${location.seriesTitle} / ${location.bookCode} ${location.bookTitle} / ${location.partTitle} · ${chapterNumber}`;
}

export function SearchDialog({
  catalog = [],
  locale,
  open,
  onOpenChange,
  restoreFocusRef,
}: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [kind, setKind] = useState<SearchDocumentKind | "">("");
  const [loadedBaseCatalog, setLoadedBaseCatalog] = useState<readonly SearchDocument[]>([]);
  const [baseCatalogLoaded, setBaseCatalogLoaded] = useState(catalog.length > 0);
  const [baseLoading, setBaseLoading] = useState(false);
  const [baseError, setBaseError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const labels = uiText[locale].searchDialog;
  useEffect(() => {
    if (!open) return;
    function handlePickerEscape(event: KeyboardEvent): void {
      // Let the native picker dismiss before Radix handles Escape on the dialog.
      if (
        event.key === "Escape" &&
        event.target instanceof HTMLOptionElement &&
        event.target.closest(".search-filters")
      ) {
        event.stopPropagation();
      }
    }
    window.addEventListener("keydown", handlePickerEscape, true);
    return () => window.removeEventListener("keydown", handlePickerEscape, true);
  }, [open]);

  const effectiveCatalog = useMemo(() => {
    const documents = new Map<string, SearchDocument>();
    for (const document of [...catalog, ...loadedBaseCatalog]) {
      documents.set(document.key, document);
    }
    return [...documents.values()];
  }, [catalog, loadedBaseCatalog]);
  const results = useMemo(
    () =>
      searchDocuments(effectiveCatalog, query, {
        ...(domain ? { domain } : {}),
        ...(kind ? { kind } : {}),
      }).slice(0, 8),
    [domain, effectiveCatalog, kind, query],
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

  async function loadBaseCatalog(): Promise<void> {
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
  }

  function openResult(url: string): void {
    const recent = JSON.parse(localStorage.getItem("one-forth-recent-searches") ?? "[]") as unknown;
    const previous = Array.isArray(recent)
      ? recent.filter((value): value is string => typeof value === "string")
      : [];
    localStorage.setItem(
      "one-forth-recent-searches",
      JSON.stringify([query, ...previous.filter((value) => value !== query)].slice(0, 6)),
    );
    onOpenChange(false);
    router.push(url);
  }

  function updateQuery(value: string): void {
    setQuery(value);
    setActiveIndex(0);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="search-dialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
            void loadBaseCatalog();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            window.requestAnimationFrame(() => restoreFocusRef.current?.focus());
          }}
        >
          <Dialog.Title className="sr-only">
            {uiText[locale].search} {siteConfig.name}
          </Dialog.Title>
          <Dialog.Description className="sr-only">{labels.description}</Dialog.Description>
          <div className="search-input-row">
            <Search aria-hidden="true" size={20} />
            <input
              ref={inputRef}
              aria-label={labels.input}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={results.length > 0}
              aria-controls="global-search-results"
              aria-activedescendant={
                results[activeIndex] ? `global-search-option-${activeIndex}` : undefined
              }
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((index) => Math.max(0, index - 1));
                }
                if (event.key === "Enter") {
                  const result = results[activeIndex];
                  if (result) openResult(result.document.url);
                }
              }}
              placeholder={uiText[locale].searchPlaceholder}
            />
            <Dialog.Close
              className="search-close"
              aria-label={labels.dismiss}
              title={labels.dismiss}
            >
              <X aria-hidden="true" size={19} />
            </Dialog.Close>
          </div>
          <div className="search-filters" role="group" aria-label={labels.filters}>
            <span className="search-filters__label" aria-hidden="true">
              {labels.filters}
            </span>
            <select
              value={domain}
              onChange={(event) => {
                setDomain(event.target.value);
                setActiveIndex(0);
              }}
              aria-label={labels.domain}
            >
              <option value="">{labels.allDomains}</option>
              {domainOptions.map((id) => (
                <option key={id} value={id}>
                  {resolveDomainLabel(id, locale)}
                </option>
              ))}
            </select>
            <select
              value={kind}
              onChange={(event) => {
                setKind(filterKinds.find((value) => value === event.target.value) ?? "");
                setActiveIndex(0);
              }}
              aria-label={labels.kind}
            >
              <option value="">{labels.allKinds}</option>
              {filterKinds.map((value) => (
                <option key={value} value={value}>
                  {resolveContentKindLabel(value, locale)}
                </option>
              ))}
            </select>
          </div>
          <div className="search-results" aria-busy={baseLoading}>
            <div
              id="global-search-results"
              role="listbox"
              aria-label={labels.results}
              hidden={!results.length}
            >
              {results.map((result, index) => (
                <button
                  id={`global-search-option-${index}`}
                  key={result.document.key}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className="search-result"
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => openResult(result.document.url)}
                >
                  <span className="search-result__kind">
                    {resolveContentKindLabel(result.document.kind, locale)}
                  </span>
                  <span className="search-result__text">
                    <strong>{result.document.title}</strong>
                    {resolveCurriculumTrail(result.document, locale) ? (
                      <small className="search-result__location">
                        {resolveCurriculumTrail(result.document, locale)}
                      </small>
                    ) : null}
                    <small className="search-result__summary">
                      <SearchResultSummary
                        kind={result.document.kind}
                        summary={result.document.summary}
                      />
                    </small>
                  </span>
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              ))}
            </div>
            {results.length === 0 && (
              <div className="search-empty">
                {baseLoading ? (
                  <p role="status">{uiText[locale].readerInterface.searchLoading}</p>
                ) : baseError ? (
                  <>
                    <p role="alert">{uiText[locale].readerInterface.searchUnavailable}</p>
                    <button type="button" onClick={() => void loadBaseCatalog()}>
                      {labels.retry}
                    </button>
                  </>
                ) : query.trim() ? (
                  <>
                    <p>{labels.empty.replace("{query}", () => query)}</p>
                    <span>{labels.emptyHelp}</span>
                    <a href={`/${locale}/search?q=${encodeURIComponent(query)}`}>
                      {labels.fullSearch}
                    </a>
                  </>
                ) : (
                  <>
                    <p>{labels.examplesTitle}</p>
                    <div className="search-examples">
                      {labels.examples.map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => {
                            updateQuery(example);
                            inputRef.current?.focus();
                          }}
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                    <span>{labels.formats}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="search-help">
            {results.length > 0 && (
              <>
                <span>
                  <kbd>↑</kbd>
                  <kbd>↓</kbd>
                  {labels.navigate}
                </span>
                <span>
                  <kbd>Enter</kbd>
                  {labels.open}
                </span>
              </>
            )}
            <span className="search-help__close">
              <kbd>Esc</kbd>
              {uiText[locale].close}
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
