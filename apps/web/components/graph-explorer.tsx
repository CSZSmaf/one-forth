"use client";

import { learningToolsText, type SupportedLocale } from "@one-forth/config";
import { neighbourhood } from "@one-forth/knowledge-graph/explorer-layout";
import {
  getRelationTypeDefinition,
  type KnowledgeRelationType,
  type RelationDirection,
  type RelationLineStyle,
} from "@one-forth/registry";
import { ArrowLeft, ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { resolveDomainLabel, resolveRelationLabel, resolveSubjectLabel } from "@/lib/client-labels";
import { GraphFocus } from "./graph-focus";
import { GraphDiagram } from "./graph-diagram";

/**
 * Compact transport shapes assembled by the graph page. A node is identified
 * by its tuple index (the long public entry ids stay server-side); enum-like
 * fields are indices into the lookup tables shipped once per page, and x/y
 * come from the precomputed deterministic layout (negative values mark
 * missing coordinates, which fall back to the spiral placement below).
 */
export type GraphExplorerNodeTuple = readonly [
  title: string,
  domain: number,
  subject: number,
  difficulty: number,
  url: string,
  x: number,
  y: number,
];
export type GraphExplorerEdgeTuple = readonly [
  source: number,
  target: number,
  type: number,
  primary?: 0 | 1,
];

interface GraphExplorerProps {
  readonly nodes: readonly GraphExplorerNodeTuple[];
  readonly edges: readonly GraphExplorerEdgeTuple[];
  readonly domains: readonly string[];
  readonly subjects: readonly string[];
  readonly relationTypes: readonly KnowledgeRelationType[];
  readonly locale?: SupportedLocale;
  readonly initialFilters?: GraphExplorerInitialFilters;
}

export interface GraphExplorerInitialFilters {
  readonly query?: string;
  readonly domain?: string;
  readonly subject?: string;
  readonly relation?: KnowledgeRelationType;
  readonly maximumDifficulty?: number;
  readonly page?: number;
}

export interface GraphNode {
  readonly index: number;
  readonly title: string;
  readonly domain: string;
  readonly subject: string;
  readonly difficulty: number;
  readonly url: string;
  readonly x: number;
  readonly y: number;
}

export interface GraphEdge {
  readonly source: number;
  readonly target: number;
  readonly type: KnowledgeRelationType;
  readonly direction: RelationDirection;
  readonly lineStyle: RelationLineStyle;
  readonly colorToken: string;
  readonly strength: "primary" | "secondary";
}

const pageSize = 50;

export function GraphExplorer({
  nodes,
  edges,
  domains,
  subjects,
  relationTypes,
  locale = "zh-CN",
  initialFilters = {},
}: GraphExplorerProps) {
  const text = learningToolsText[locale];
  const nodeData = useMemo<readonly GraphNode[]>(
    () =>
      nodes.map(([title, domain, subject, difficulty, url, x, y], index) => ({
        index,
        title,
        domain: domains[domain] ?? "interdisciplinary",
        subject: subjects[subject] ?? "general",
        difficulty,
        url,
        x,
        y,
      })),
    [nodes, domains, subjects],
  );
  const edgeData = useMemo<readonly GraphEdge[]>(
    () =>
      edges.flatMap(([source, target, type, primary]) => {
        const definition = getRelationTypeDefinition(relationTypes[type] ?? "");
        if (!nodeData[source] || !nodeData[target] || !definition) return [];
        return [
          {
            source,
            target,
            type: definition.id,
            direction: definition.direction,
            lineStyle: definition.lineStyle,
            colorToken: definition.colorToken,
            strength: primary === 0 ? "secondary" : "primary",
          },
        ];
      }),
    [edges, nodeData, relationTypes],
  );
  const [query, setQuery] = useState(initialFilters.query ?? "");
  const [domain, setDomain] = useState(initialFilters.domain ?? "");
  const [subject, setSubject] = useState(initialFilters.subject ?? "");
  const [relation, setRelation] = useState<KnowledgeRelationType | "">(
    initialFilters.relation ?? "",
  );
  const [maximumDifficulty, setMaximumDifficulty] = useState(initialFilters.maximumDifficulty ?? 5);
  const [listPage, setListPage] = useState(initialFilters.page ?? 1);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<"focus" | "overview">("focus");
  const [history, setHistory] = useState<readonly { index: number; mode: "focus" | "overview" }[]>(
    [],
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const eligibleEdges = useMemo(
    () => edgeData.filter((edge) => !relation || edge.type === relation),
    [edgeData, relation],
  );
  const eligibleIndices = useMemo(
    () => new Set(eligibleEdges.flatMap((edge) => [edge.source, edge.target])),
    [eligibleEdges],
  );
  const scopedNodes = useMemo(
    () =>
      nodeData.filter(
        (node) =>
          (!domain || node.domain === domain) &&
          (!subject || node.subject === subject) &&
          node.difficulty <= maximumDifficulty &&
          (!relation || eligibleIndices.has(node.index)),
      ),
    [nodeData, domain, subject, maximumDifficulty, relation, eligibleIndices],
  );
  const filteredNodes = useMemo(
    () =>
      scopedNodes.filter(
        (node) =>
          !query || node.title.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)),
      ),
    [scopedNodes, query, locale],
  );
  const preferred = useMemo(
    () =>
      [...filteredNodes].sort(
        (a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title, locale),
      )[0],
    [filteredNodes, locale],
  );
  const selectedNode = filteredNodes.find((node) => node.index === selected) ?? preferred;
  const selectedIndex = selectedNode?.index ?? null;
  const diagram = useMemo(() => {
    if (mode === "focus")
      return selectedIndex === null
        ? { nodes: [], edges: [] }
        : neighbourhood(scopedNodes, eligibleEdges, selectedIndex);
    const indices = new Set(filteredNodes.map((n) => n.index));
    return {
      nodes: filteredNodes,
      edges: eligibleEdges.filter((e) => indices.has(e.source) && indices.has(e.target)),
    };
  }, [mode, selectedIndex, scopedNodes, eligibleEdges, filteredNodes]);
  const domainIds = useMemo(
    () =>
      [...new Set(nodeData.map((node) => node.domain))].sort((a, b) =>
        resolveDomainLabel(a, locale).localeCompare(resolveDomainLabel(b, locale), locale),
      ),
    [nodeData, locale],
  );
  const subjectIds = useMemo(
    () =>
      [
        ...new Set(
          nodeData.filter((node) => !domain || node.domain === domain).map((node) => node.subject),
        ),
      ].sort((a, b) =>
        resolveSubjectLabel(a, locale).localeCompare(resolveSubjectLabel(b, locale), locale),
      ),
    [nodeData, domain, locale],
  );
  const relationOptions = useMemo(
    () => [...new Set(edgeData.map((edge) => edge.type))],
    [edgeData],
  );
  const visibleRelations = useMemo(
    () => [...new Set(diagram.edges.map((edge) => edge.type))],
    [diagram.edges],
  );
  const pages = Math.max(1, Math.ceil(filteredNodes.length / pageSize));
  const activePage = Math.min(pages, Math.max(1, listPage));
  const listNodes = useMemo(
    () =>
      [...filteredNodes]
        .sort((a, b) => a.title.localeCompare(b.title, locale))
        .slice((activePage - 1) * pageSize, activePage * pageSize),
    [filteredNodes, activePage, locale],
  );

  const selectNode = (index: number) => {
    if (selectedIndex !== null && (selectedIndex !== index || mode !== "focus"))
      setHistory((current) => [...current.slice(-19), { index: selectedIndex, mode }]);
    setSelected(index);
    setMode("focus");
    setQuery("");
  };
  const changeFilter = () => {
    setSelected(null);
    setHistory([]);
    setListPage(1);
  };
  const back = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setSelected(previous.index);
    setMode(previous.mode);
    setHistory((current) => current.slice(0, -1));
  };
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const [key, value, fallback] of [
      ["q", query, ""],
      ["domain", domain, ""],
      ["subject", subject, ""],
      ["relation", relation, ""],
      ["difficulty", maximumDifficulty, 5],
      ["page", activePage, 1],
    ] as const) {
      if (value === fallback || value === "") url.searchParams.delete(key);
      else url.searchParams.set(key, String(value));
    }
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [query, domain, subject, relation, maximumDifficulty, activePage]);

  return (
    <div className="graph-explorer" data-expanded={expanded}>
      <div className="graph-topbar">
        <label className="graph-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              changeFilter();
            }}
            placeholder={text.graphSearchPlaceholder}
            aria-label={text.graphSearch}
          />
        </label>
        <div className="graph-view-switch" role="group" aria-label={text.graphView}>
          <button type="button" aria-pressed={mode === "focus"} onClick={() => setMode("focus")}>
            {text.graphFocus}
          </button>
          <button
            type="button"
            aria-pressed={mode === "overview"}
            onClick={() => setMode("overview")}
          >
            {text.graphOverview}
          </button>
        </div>
        <button
          className="graph-filter-toggle"
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="graph-filters"
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <SlidersHorizontal size={17} />
          {text.graphFilters}
        </button>
      </div>
      <aside id="graph-filters" className="graph-controls" data-open={filtersOpen}>
        <div>
          <label htmlFor="graph-domain">{text.graphDomain}</label>
          <select
            id="graph-domain"
            value={domain}
            onChange={(event) => {
              setDomain(event.target.value);
              setSubject("");
              changeFilter();
            }}
          >
            <option value="">{text.allDomains}</option>
            {domainIds.map((id) => (
              <option key={id} value={id}>
                {resolveDomainLabel(id, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="graph-subject">{text.graphSubject}</label>
          <select
            id="graph-subject"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              changeFilter();
            }}
          >
            <option value="">{text.graphAllSubjects}</option>
            {subjectIds.map((id) => (
              <option key={id} value={id}>
                {resolveSubjectLabel(id, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="graph-relation">{text.graphRelation}</label>
          <select
            id="graph-relation"
            value={relation}
            onChange={(event) => {
              setRelation(relationOptions.find((type) => type === event.target.value) ?? "");
              changeFilter();
            }}
          >
            <option value="">{text.graphAllRelations}</option>
            {relationOptions.map((type) => (
              <option key={type} value={type}>
                {resolveRelationLabel(type, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="graph-difficulty">
            {text.graphDifficulty} <output>{maximumDifficulty}</output>
          </label>
          <input
            id="graph-difficulty"
            type="range"
            min="1"
            max="5"
            value={maximumDifficulty}
            onChange={(event) => {
              setMaximumDifficulty(Number(event.target.value));
              changeFilter();
            }}
          />
        </div>
        <div className="graph-legend">
          {domainIds.map((id) => (
            <span key={id} data-domain={id}>
              {resolveDomainLabel(id, locale)}
            </span>
          ))}
        </div>
        {visibleRelations.length ? (
          <div className="graph-relation-legend">
            <span className="graph-relation-legend__title">{text.graphLegend}</span>
            <ul>
              {visibleRelations.map((type) => {
                const definition = getRelationTypeDefinition(type);
                return (
                  <li key={type}>
                    <svg width="26" height="8" aria-hidden="true">
                      <line
                        x1="1"
                        y1="4"
                        x2="25"
                        y2="4"
                        data-color-token={definition?.colorToken}
                        strokeDasharray={
                          definition?.lineStyle === "dashed"
                            ? "6 4"
                            : definition?.lineStyle === "dotted"
                              ? "2 3"
                              : undefined
                        }
                      />
                    </svg>
                    <span>{resolveRelationLabel(type, locale)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </aside>
      <div className="graph-canvas">
        <header className="graph-context">
          <button
            type="button"
            disabled={!history.length}
            onClick={back}
            aria-label={text.graphBack}
            title={text.graphBack}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2>
              {mode === "focus" ? (selectedNode?.title ?? text.chooseConcept) : text.graphOverview}
            </h2>
            <span role="status">
              {diagram.nodes.length}/{nodeData.length} {text.graphNodes} · {diagram.edges.length}{" "}
              {text.graphEdges}
            </span>
          </div>
          {selectedNode && mode === "focus" ? (
            <a href={selectedNode.url}>
              {text.openChapter}
              <ArrowUpRight size={16} />
            </a>
          ) : null}
        </header>
        <GraphDiagram
          nodes={diagram.nodes}
          edges={diagram.edges}
          selected={selectedIndex}
          mode={mode}
          locale={locale}
          expanded={expanded}
          onExpand={() => setExpanded((value) => !value)}
          onSelect={selectNode}
        />
      </div>
      <div className="graph-reading">
        {mode === "focus" ? (
          <details className="graph-relation-details" key={selectedIndex}>
            <summary>{text.graphRelations}</summary>
            <GraphFocus
              node={selectedNode}
              nodes={nodeData}
              edges={diagram.edges}
              locale={locale}
              onSelect={selectNode}
            />
          </details>
        ) : null}
        <details className="graph-node-index" open={Boolean(query.trim()) || activePage > 1}>
          <summary>{text.graphList}</summary>
          {listNodes.length ? (
            <ul>
              {listNodes.map((node) => (
                <li key={node.index}>
                  <button
                    className="graph-node-index__focus"
                    type="button"
                    onClick={() => selectNode(node.index)}
                    aria-label={`${text.focusConcept}: ${node.title}`}
                  >
                    {text.focusConcept}
                  </button>
                  <a href={node.url}>{node.title}</a>
                  <span>{resolveDomainLabel(node.domain, locale)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="graph-node-index__empty">{text.graphEmpty}</p>
          )}
          <nav className="graph-node-index__pagination" aria-label={text.graphPage}>
            <button
              type="button"
              disabled={activePage <= 1}
              onClick={() => setListPage((page) => Math.max(1, page - 1))}
            >
              {text.graphPrevious}
            </button>
            <span aria-live="polite">
              {text.graphPageLabel
                .replace("{page}", String(activePage))
                .replace("{pages}", String(pages))
                .replace("{total}", String(filteredNodes.length))}
            </span>
            <button
              type="button"
              disabled={activePage >= pages}
              onClick={() => setListPage((page) => Math.min(pages, page + 1))}
            >
              {text.graphNext}
            </button>
          </nav>
        </details>
      </div>
    </div>
  );
}
