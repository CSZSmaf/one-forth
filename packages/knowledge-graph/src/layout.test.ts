import { describe, expect, it } from "vitest";
import { layoutKnowledgeGraph, type GraphLayoutEdge, type GraphLayoutNode } from "./layout";

function buildSyntheticGraph(
  nodeCount: number,
  edgeStride: number,
): { nodes: GraphLayoutNode[]; edges: GraphLayoutEdge[] } {
  const domains = ["mathematics", "physics", "computer-science"];
  const nodes: GraphLayoutNode[] = Array.from({ length: nodeCount }, (_, index) => ({
    key: `node-${String(index).padStart(3, "0")}`,
    domain: domains[index % domains.length] ?? "mathematics",
    cluster: `subject-${Math.floor(index / domains.length) % 5}`,
  }));
  const edges: GraphLayoutEdge[] = [];
  const domainCount = domains.length;
  for (let index = 0; index < nodeCount; index += 1) {
    // Most edges stay inside one domain (like prerequisites inside a subject);
    // stepping by the domain count keeps source and target in the same domain.
    const intraTarget = index + domainCount * edgeStride;
    if (intraTarget < nodeCount) {
      edges.push({
        source: nodes[index]?.key ?? "",
        target: nodes[intraTarget]?.key ?? "",
      });
    }
    // A sparse deterministic bridge keeps the domains connected.
    if (index % 10 === 0 && index + 1 < nodeCount) {
      edges.push({ source: nodes[index]?.key ?? "", target: nodes[index + 1]?.key ?? "" });
    }
  }
  return { nodes, edges };
}

function minPairwiseDistance(points: readonly { x: number; y: number }[]): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (let a = 0; a < points.length; a += 1) {
    const first = points[a];
    if (!first) continue;
    for (let b = a + 1; b < points.length; b += 1) {
      const second = points[b];
      if (!second) continue;
      minimum = Math.min(minimum, Math.hypot(first.x - second.x, first.y - second.y));
    }
  }
  return minimum;
}

describe("layoutKnowledgeGraph", () => {
  it("is deterministic for identical input", () => {
    const { nodes, edges } = buildSyntheticGraph(120, 3);
    const first = layoutKnowledgeGraph(nodes, edges);
    const second = layoutKnowledgeGraph(nodes, edges);
    expect([...first.entries()]).toEqual([...second.entries()]);
  });

  it("does not depend on input ordering", () => {
    const { nodes, edges } = buildSyntheticGraph(60, 2);
    const shuffledNodes = [...nodes].reverse();
    const shuffledEdges = [...edges].reverse();
    const baseline = layoutKnowledgeGraph(nodes, edges);
    const reordered = layoutKnowledgeGraph(shuffledNodes, shuffledEdges);
    expect([...reordered.entries()].sort()).toEqual([...baseline.entries()].sort());
  });

  it("returns finite integer coordinates inside the canvas bounds", () => {
    const { nodes, edges } = buildSyntheticGraph(150, 4);
    const layout = layoutKnowledgeGraph(nodes, edges);
    expect(layout.size).toBe(nodes.length);
    for (const point of layout.values()) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(Number.isInteger(point.x)).toBe(true);
      expect(Number.isInteger(point.y)).toBe(true);
      expect(point.x).toBeGreaterThanOrEqual(80);
      expect(point.x).toBeLessThanOrEqual(1120);
      expect(point.y).toBeGreaterThanOrEqual(80);
      expect(point.y).toBeLessThanOrEqual(680);
    }
  });

  it("keeps a usable minimum distance between node centers", () => {
    const { nodes, edges } = buildSyntheticGraph(150, 4);
    const layout = layoutKnowledgeGraph(nodes, edges);
    const points = [...layout.values()];
    // The separation pass targets 27 units; clamping at the canvas margin may
    // shave a little off, so assert a conservative floor instead of the target.
    expect(minPairwiseDistance(points)).toBeGreaterThanOrEqual(20);
  });

  it("keeps same-domain nodes closer than cross-domain nodes", () => {
    const { nodes, edges } = buildSyntheticGraph(90, 2);
    const layout = layoutKnowledgeGraph(nodes, edges);
    const domainOf = new Map(nodes.map((node) => [node.key, node.domain] as const));
    let sameDomainTotal = 0;
    let sameDomainCount = 0;
    let crossDomainTotal = 0;
    let crossDomainCount = 0;
    for (let a = 0; a < nodes.length; a += 1) {
      for (let b = a + 1; b < nodes.length; b += 1) {
        const first = nodes[a];
        const second = nodes[b];
        const pointA = first ? layout.get(first.key) : undefined;
        const pointB = second ? layout.get(second.key) : undefined;
        if (!first || !second || !pointA || !pointB) continue;
        const distance = Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
        if (domainOf.get(first.key) === domainOf.get(second.key)) {
          sameDomainTotal += distance;
          sameDomainCount += 1;
        } else {
          crossDomainTotal += distance;
          crossDomainCount += 1;
        }
      }
    }
    expect(sameDomainCount).toBeGreaterThan(0);
    expect(crossDomainCount).toBeGreaterThan(0);
    expect(sameDomainTotal / sameDomainCount).toBeLessThan(crossDomainTotal / crossDomainCount);
  });

  it("keeps nodes in the same sub-cluster closer than sibling clusters", () => {
    const { nodes, edges } = buildSyntheticGraph(120, 2);
    const nodeByKey = new Map(nodes.map((node) => [node.key, node] as const));
    const withinClusterEdges = edges.filter((edge) => {
      const source = nodeByKey.get(edge.source);
      const target = nodeByKey.get(edge.target);
      return source?.cluster === target?.cluster;
    });
    const layout = layoutKnowledgeGraph(nodes, withinClusterEdges);
    let sameClusterTotal = 0;
    let sameClusterCount = 0;
    let siblingClusterTotal = 0;
    let siblingClusterCount = 0;
    for (let a = 0; a < nodes.length; a += 1) {
      for (let b = a + 1; b < nodes.length; b += 1) {
        const first = nodes[a];
        const second = nodes[b];
        if (!first || !second || first.domain !== second.domain) continue;
        const pointA = layout.get(first.key);
        const pointB = layout.get(second.key);
        if (!pointA || !pointB) continue;
        const distance = Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
        if (first.cluster === second.cluster) {
          sameClusterTotal += distance;
          sameClusterCount += 1;
        } else {
          siblingClusterTotal += distance;
          siblingClusterCount += 1;
        }
      }
    }
    expect(sameClusterCount).toBeGreaterThan(0);
    expect(siblingClusterCount).toBeGreaterThan(0);
    expect(sameClusterTotal / sameClusterCount).toBeLessThan(
      siblingClusterTotal / siblingClusterCount,
    );
  });

  it("handles empty and disconnected inputs", () => {
    expect(layoutKnowledgeGraph([], []).size).toBe(0);
    const layout = layoutKnowledgeGraph(
      [
        { key: "isolated-a", domain: "mathematics" },
        { key: "isolated-b", domain: "mathematics" },
      ],
      [{ source: "isolated-a", target: "missing-node" }],
    );
    expect(layout.size).toBe(2);
    for (const point of layout.values()) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });
});
