export interface GraphPoint {
  readonly x: number;
  readonly y: number;
}
export interface GraphBounds extends GraphPoint {
  readonly width: number;
  readonly height: number;
}
export interface LayoutNode extends GraphPoint {
  readonly index: number;
  readonly title: string;
  readonly domain: string;
}
export interface LayoutEdge {
  readonly source: number;
  readonly target: number;
  readonly direction: "directed" | "bidirectional";
}
export interface PositionedGraphNode extends GraphPoint {
  readonly index: number;
  readonly width: number;
  readonly height: number;
}

export function graphBounds(nodes: readonly PositionedGraphNode[]): GraphBounds {
  if (!nodes.length) return { x: -160, y: -100, width: 320, height: 200 };
  const left = Math.min(...nodes.map((n) => n.x - n.width / 2)) - 70;
  const top = Math.min(...nodes.map((n) => n.y - n.height / 2)) - 70;
  return {
    x: left,
    y: top,
    width: Math.max(...nodes.map((n) => n.x + n.width / 2)) + 70 - left,
    height: Math.max(...nodes.map((n) => n.y + n.height / 2)) + 70 - top,
  };
}

/** Preserve the generated spatial ordering while reserving a distinct pointer target. */
export function overviewLayout(nodes: readonly LayoutNode[]): readonly PositionedGraphNode[] {
  const placed: PositionedGraphNode[] = [];
  return nodes.map((node, index) => {
    const finite = Number.isFinite(node.x) && Number.isFinite(node.y) && node.x >= 0 && node.y >= 0;
    const origin = {
      x: finite ? node.x * 4 : (index % 12) * 100,
      y: finite ? node.y * 4 : Math.floor(index / 12) * 100,
    };
    let point = origin;
    let attempt = 0;
    while (
      placed.some((other) => Math.abs(other.x - point.x) < 52 && Math.abs(other.y - point.y) < 52)
    ) {
      attempt++;
      const angle = attempt * 2.399963229728653;
      const radius = 30 * Math.sqrt(attempt);
      point = { x: origin.x + Math.cos(angle) * radius, y: origin.y + Math.sin(angle) * radius };
    }
    const result = { index: node.index, ...point, width: 44, height: 44 };
    placed.push(result);
    return result;
  });
}

/** Labels keep a readable screen size; crowded labels appear when focused or zoomed in. */
export function overviewLabels(
  nodes: readonly (PositionedGraphNode & { readonly title: string; readonly priority: number })[],
  viewport: GraphBounds,
  scale: number,
): ReadonlySet<number> {
  const labels = new Set<number>();
  const boxes: GraphBounds[] = [];
  const ordered = [...nodes].sort((a, b) => b.priority - a.priority || a.index - b.index);
  for (const node of ordered) {
    const textWidth = [...node.title].reduce(
      (width, character) => width + ((character.codePointAt(0) ?? 0) > 255 ? 15 : 8),
      0,
    );
    const box = {
      x: node.x + 14 / scale,
      y: node.y - 11 / scale,
      width: (textWidth + 10) / scale,
      height: 26 / scale,
    };
    if (
      box.x < viewport.x ||
      box.y < viewport.y ||
      box.x + box.width > viewport.x + viewport.width ||
      box.y + box.height > viewport.y + viewport.height
    )
      continue;
    if (
      node.priority < Number.MAX_SAFE_INTEGER &&
      nodes.some(
        (other) =>
          other.index !== node.index &&
          other.x + 11 / scale > box.x &&
          other.x - 11 / scale < box.x + box.width &&
          other.y + 11 / scale > box.y &&
          other.y - 11 / scale < box.y + box.height,
      )
    )
      continue;
    if (
      boxes.some(
        (other) =>
          box.x < other.x + other.width &&
          box.x + box.width > other.x &&
          box.y < other.y + other.height &&
          box.y + box.height > other.y,
      )
    )
      continue;
    labels.add(node.index);
    boxes.push(box);
  }
  return labels;
}

/** A local diagram contains only incident edges and their endpoints, including isolated centers. */
export function neighbourhood<T extends LayoutNode, E extends LayoutEdge>(
  nodes: readonly T[],
  edges: readonly E[],
  selected: number,
): { readonly nodes: readonly T[]; readonly edges: readonly E[] } {
  const available = new Set(nodes.map((node) => node.index));
  const incident = edges.filter(
    (edge) =>
      available.has(edge.source) &&
      available.has(edge.target) &&
      (edge.source === selected || edge.target === selected),
  );
  const indices = new Set([selected]);
  for (const edge of incident) {
    indices.add(edge.source);
    indices.add(edge.target);
  }
  return { nodes: nodes.filter((node) => indices.has(node.index)), edges: incident };
}

/** One column on each side keeps long branches clear of other nodes; the viewport handles overflow. */
export function focusLayout(
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
  selected: number,
): readonly PositionedGraphNode[] {
  const incoming = new Set(
    edges
      .filter((e) => e.target === selected && e.direction !== "bidirectional")
      .map((e) => e.source),
  );
  const left = nodes.filter((n) => n.index !== selected && incoming.has(n.index));
  const right = nodes.filter((n) => n.index !== selected && !incoming.has(n.index));
  const result: PositionedGraphNode[] = nodes.some((n) => n.index === selected)
    ? [{ index: selected, x: 0, y: 0, width: 278, height: 92 }]
    : [];
  for (const [side, branch] of [
    [-1, left],
    [1, right],
  ] as const) {
    const ordered = [...branch].sort(
      (a, b) => a.domain.localeCompare(b.domain) || a.index - b.index,
    );
    ordered.forEach((node, index) => {
      result.push({
        index: node.index,
        x: side * 390,
        y: (index - (ordered.length - 1) / 2) * 108,
        width: 244,
        height: 76,
      });
    });
  }
  return result;
}

export function graphEdgePath(source: PositionedGraphNode, target: PositionedGraphNode): string {
  const sign = target.x >= source.x ? 1 : -1;
  const x1 = source.x + (sign * source.width) / 2;
  const x2 = target.x - (sign * target.width) / 2;
  const bend = Math.max(45, Math.abs(x2 - x1) * 0.48);
  return `M ${x1} ${source.y} C ${x1 + sign * bend} ${source.y}, ${x2 - sign * bend} ${target.y}, ${x2} ${target.y}`;
}

export function graphLabelLines(text: string): readonly string[] {
  const lines: string[] = [];
  let line = "";
  let width = 0;
  for (const character of text) {
    const next = (character.codePointAt(0) ?? 0) > 255 ? 1 : 0.55;
    if (width + next > 11.5) {
      lines.push(line);
      line = "";
      width = 0;
    }
    line += character;
    width += next;
  }
  if (line) lines.push(line);
  return lines.length <= 2 ? lines : [lines[0] ?? "", `${(lines[1] ?? "").slice(0, -1)}…`];
}
