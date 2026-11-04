"use client";

import { learningToolsText, type SupportedLocale } from "@one-forth/config";
import {
  focusLayout,
  overviewLayout,
  overviewLabels,
  graphBounds,
  graphEdgePath,
  graphLabelLines,
} from "@one-forth/knowledge-graph/explorer-layout";
import { useCanvasViewport } from "@one-forth/ui";
import { Maximize2, Minimize2, Minus, Plus, RotateCcw, Scan } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { resolveDomainLabel, resolveRelationLabel } from "@/lib/client-labels";
import type { GraphNode, GraphEdge } from "./graph-explorer";

interface GraphDiagramProps {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly selected: number | null;
  readonly mode: "focus" | "overview";
  readonly locale: SupportedLocale;
  readonly expanded: boolean;
  readonly onExpand: () => void;
  readonly onSelect: (index: number) => void;
}

export function GraphDiagram({
  nodes,
  edges,
  selected,
  mode,
  locale,
  expanded,
  onExpand,
  onSelect,
}: GraphDiagramProps) {
  const text = learningToolsText[locale];
  const id = useId().replaceAll(":", "");
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const positions = useMemo(
    () =>
      mode === "focus" && selected !== null
        ? focusLayout(nodes, edges, selected)
        : overviewLayout(nodes),
    [nodes, edges, selected, mode],
  );
  const byIndex = useMemo(() => new Map(positions.map((p) => [p.index, p])), [positions]);
  const bounds = useMemo(() => graphBounds(positions), [positions]);
  const center = byIndex.get(selected ?? -1) ?? positions[0] ?? { x: 0, y: 0 };
  const resetKey = `${mode}:${selected}:${nodes.map((n) => n.index).join(",")}`;
  const {
    ref: canvasRef,
    view,
    size,
    handlers,
    consumeDrag,
    recenter,
    zoom,
    reset,
  } = useCanvasViewport(bounds, center, resetKey);
  const degrees = useMemo(() => {
    const counts = new Map<number, number>();
    for (const edge of edges) {
      counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1);
      counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1);
    }
    return counts;
  }, [edges]);
  const visibleLabels = useMemo(
    () =>
      overviewLabels(
        nodes.flatMap((node) => {
          const position = byIndex.get(node.index);
          return position
            ? [
                {
                  ...position,
                  title: node.title,
                  priority:
                    node.index === highlighted
                      ? Number.MAX_SAFE_INTEGER
                      : (degrees.get(node.index) ?? 0),
                },
              ]
            : [];
        }),
        {
          x: -view.x / view.scale,
          y: -view.y / view.scale,
          width: size.width / view.scale,
          height: size.height / view.scale,
        },
        view.scale,
      ),
    [nodes, byIndex, highlighted, degrees, view, size],
  );
  const relationLabels = useMemo(() => {
    const result = new Map<number, Set<string>>();
    if (selected === null || mode !== "focus") return result;
    for (const edge of edges) {
      const other = edge.source === selected ? edge.target : edge.source;
      const labels = result.get(other) ?? new Set<string>();
      labels.add(resolveRelationLabel(edge.type, locale));
      result.set(other, labels);
    }
    return result;
  }, [edges, selected, mode, locale]);
  return (
    <div className="graph-diagram" data-mode={mode} data-expanded={expanded}>
      <svg
        ref={canvasRef}
        className="graph-surface"
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="group"
        tabIndex={0}
        aria-label={`${text.graphCanvas} · ${nodes.length} ${text.graphNodes} · ${edges.length} ${text.graphEdges}`}
        aria-describedby={`${id}-help`}
        {...handlers}
        onClickCapture={(event) => {
          if (consumeDrag()) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <title>{text.graphCanvas}</title>
        <desc>{text.graphKeyboard}</desc>
        <defs>
          <marker
            id={`${id}-arrow`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="graph-edge-arrow" />
          </marker>
        </defs>
        <g
          className="graph-viewport"
          transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}
          data-scale={view.scale}
        >
          <g className="graph-edges" aria-hidden="true">
            {edges.map((edge) => {
              const a = byIndex.get(edge.source),
                b = byIndex.get(edge.target);
              if (!a || !b) return null;
              return (
                <path
                  key={`${edge.source}-${edge.target}-${edge.type}`}
                  d={mode === "overview" ? `M ${a.x} ${a.y} L ${b.x} ${b.y}` : graphEdgePath(a, b)}
                  data-type={edge.type}
                  data-color-token={edge.colorToken}
                  data-emphasized={
                    mode === "focus" || edge.source === highlighted || edge.target === highlighted
                      ? "true"
                      : undefined
                  }
                  data-strength={edge.strength}
                  markerEnd={mode === "focus" ? `url(#${id}-arrow)` : undefined}
                  markerStart={
                    mode === "focus" && edge.direction === "bidirectional"
                      ? `url(#${id}-arrow)`
                      : undefined
                  }
                  strokeDasharray={
                    edge.lineStyle === "dashed"
                      ? "7 5"
                      : edge.lineStyle === "dotted"
                        ? "2 5"
                        : undefined
                  }
                />
              );
            })}
          </g>
          <g className="graph-nodes">
            {nodes.map((node) => {
              const p = byIndex.get(node.index);
              if (!p) return null;
              const isSelected = node.index === selected && mode === "focus";
              const lines = graphLabelLines(node.title);
              const metadata = isSelected
                ? resolveDomainLabel(node.domain, locale)
                : [...(relationLabels.get(node.index) ?? [])].join(" · ") ||
                  resolveDomainLabel(node.domain, locale);
              return (
                <g
                  key={node.index}
                  className="graph-concept"
                  transform={`translate(${p.x} ${p.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${text.focusConcept}: ${node.title}`}
                  aria-pressed={isSelected}
                  data-node-index={node.index}
                  data-domain={node.domain}
                  data-selected={isSelected}
                  data-compact={view.scale < 0.42 && !isSelected}
                  data-highlighted={highlighted === node.index}
                  onPointerEnter={() => setHighlighted(node.index)}
                  onPointerLeave={() => setHighlighted(null)}
                  onBlur={() => setHighlighted(null)}
                  onFocus={(event) => {
                    setHighlighted(node.index);
                    const nodeRect = event.currentTarget.getBoundingClientRect();
                    const canvasRect = canvasRef.current?.getBoundingClientRect();
                    if (
                      canvasRect &&
                      (nodeRect.left < canvasRect.left ||
                        nodeRect.right > canvasRect.right ||
                        nodeRect.top < canvasRect.top ||
                        nodeRect.bottom > canvasRect.bottom)
                    )
                      recenter(p);
                  }}
                  onClick={() => onSelect(node.index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onSelect(node.index);
                    }
                  }}
                >
                  <title>{node.title}</title>
                  {mode === "overview" ? (
                    <>
                      <rect className="graph-point__hit" x="-22" y="-22" width="44" height="44" />
                      <circle
                        className="graph-point__dot"
                        r={Math.min(10, 5 + Math.sqrt(degrees.get(node.index) ?? 0) * 0.65)}
                      />
                      <text
                        className="graph-point__label"
                        x={14 / view.scale}
                        y={5 / view.scale}
                        style={{ fontSize: 15 / view.scale }}
                        visibility={visibleLabels.has(node.index) ? "visible" : "hidden"}
                      >
                        {node.title}
                      </text>
                    </>
                  ) : (
                    <>
                      <rect
                        className="graph-concept__body"
                        x={-p.width / 2}
                        y={-p.height / 2}
                        width={p.width}
                        height={p.height}
                        rx="5"
                      />
                      <text
                        className="graph-concept__meta"
                        x={-p.width / 2 + 18}
                        y={-p.height / 2 + 20}
                      >
                        {metadata}
                      </text>
                      <text
                        className="graph-concept__title"
                        x={-p.width / 2 + 18}
                        y={lines.length === 1 ? 13 : 7}
                      >
                        {lines.map((line, index) => (
                          <tspan key={index} x={-p.width / 2 + 18} dy={index ? 22 : 0}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                      <circle className="graph-concept__port" cx={p.width / 2} r="3" />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      {nodes.length === 0 ? <p className="graph-canvas-empty">{text.graphEmpty}</p> : null}
      <div className="graph-toolbar" role="group" aria-label={text.graphView}>
        <button type="button" onClick={() => zoom(1.2)} aria-label={text.graphZoomIn}>
          <Plus size={18} />
        </button>
        <output aria-label={text.graphView}>{Math.round(view.scale * 100)}%</output>
        <button type="button" onClick={() => zoom(1 / 1.2)} aria-label={text.graphZoomOut}>
          <Minus size={18} />
        </button>
        <button
          type="button"
          onClick={() => reset(true)}
          aria-label={text.graphFit}
          title={text.graphFit}
        >
          <Scan size={18} />
        </button>
        <button
          type="button"
          onClick={() => reset()}
          aria-label={text.graphReset}
          title={text.graphReset}
        >
          <RotateCcw size={17} />
        </button>
        <button
          type="button"
          onClick={onExpand}
          aria-label={expanded ? text.graphCollapse : text.graphExpand}
          aria-pressed={expanded}
          title={expanded ? text.graphCollapse : text.graphExpand}
        >
          {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </div>
      {nodes.length > 0 ? (
        <svg
          className="graph-minimap"
          viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
          preserveAspectRatio="none"
          role="button"
          tabIndex={0}
          aria-label={text.graphMinimap}
          onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            recenter({
              x: bounds.x + ((event.clientX - rect.left) / rect.width) * bounds.width,
              y: bounds.y + ((event.clientY - rect.top) / rect.height) * bounds.height,
            });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              reset(true);
            }
          }}
        >
          <title>{text.graphMinimap}</title>
          {positions.map((p) => (
            <rect
              key={p.index}
              x={p.x - p.width / 2}
              y={p.y - p.height / 2}
              width={p.width}
              height={p.height}
              data-selected={p.index === selected}
            />
          ))}
          <rect
            className="graph-minimap__window"
            x={-view.x / view.scale}
            y={-view.y / view.scale}
            width={size.width / view.scale}
            height={size.height / view.scale}
          />
        </svg>
      ) : null}
      <p id={`${id}-help`} className="graph-canvas-help">
        {text.graphHelp}
      </p>
    </div>
  );
}
