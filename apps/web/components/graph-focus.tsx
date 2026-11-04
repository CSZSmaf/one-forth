"use client";

import { learningToolsText, type SupportedLocale } from "@one-forth/config";
import { useState } from "react";
import { resolveDomainLabel, resolveRelationLabel } from "@/lib/client-labels";
import type { GraphNode, GraphEdge } from "./graph-explorer";

export function GraphFocus({
  node,
  nodes,
  edges,
  locale,
  onSelect,
}: {
  readonly node: GraphNode | undefined;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly locale: SupportedLocale;
  readonly onSelect: (index: number) => void;
}) {
  const text = learningToolsText[locale];
  const [expanded, setExpanded] = useState(false);
  if (!node) return <p className="graph-focus-empty">{text.chooseConcept}</p>;
  const related = edges.filter((edge) => edge.source === node.index || edge.target === node.index);
  const columns = [
    {
      key: "incoming",
      title: text.incoming,
      edges: related.filter(
        (edge) => edge.target === node.index && edge.direction !== "bidirectional",
      ),
    },
    {
      key: "outgoing",
      title: text.outgoing,
      edges: related.filter(
        (edge) => edge.source === node.index && edge.direction !== "bidirectional",
      ),
    },
    {
      key: "related",
      title: text.related,
      edges: related.filter((edge) => edge.direction === "bidirectional"),
    },
  ];
  return (
    <section className="graph-focus" aria-label={text.graphFocus}>
      <header className="graph-focus__current" data-domain={node.domain}>
        <div>
          <span>
            {text.currentConcept} · {resolveDomainLabel(node.domain, locale)}
          </span>
          <h2>{node.title}</h2>
        </div>
        <a href={node.url}>
          {text.openChapter} <span aria-hidden="true">↗</span>
        </a>
      </header>
      <div className="graph-focus__relations">
        {columns
          .filter((column) => column.edges.length > 0)
          .map((column) => (
            <section key={column.key}>
              <h3>
                <span aria-hidden="true">
                  {column.key === "incoming" ? "→" : column.key === "outgoing" ? "↗" : "↔"}
                </span>{" "}
                {column.title} <small>{column.edges.length}</small>
              </h3>
              <ol>
                {(expanded ? column.edges : column.edges.slice(0, 6)).map((edge, index) => {
                  const neighbour = nodes[edge.source === node.index ? edge.target : edge.source];
                  if (!neighbour) return null;
                  return (
                    <li
                      key={`${neighbour.index}-${edge.type}-${index}`}
                      data-color-token={edge.colorToken}
                    >
                      <span>{resolveRelationLabel(edge.type, locale)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setExpanded(false);
                          onSelect(neighbour.index);
                        }}
                      >
                        {neighbour.title}
                      </button>
                      <a
                        href={neighbour.url}
                        aria-label={`${text.openChapter}: ${neighbour.title}`}
                      >
                        <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
      </div>
      {related.length === 0 ? <p>{text.noRelations}</p> : null}
      {!expanded && columns.some((column) => column.edges.length > 6) ? (
        <button type="button" className="graph-focus__more" onClick={() => setExpanded(true)}>
          {text.showMore}
        </button>
      ) : null}
    </section>
  );
}
