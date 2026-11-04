/**
 * Deterministic force-directed layout for the public knowledge graph.
 *
 * The module is pure computation: it knows nothing about content documents,
 * locales or rendering. Callers (build scripts) supply generic keyed nodes and
 * edges and receive canvas coordinates back. Determinism is a hard contract —
 * the same input must always produce byte-identical output so the generated
 * artifact stays stable across machines and `--check` runs. No `Math.random`,
 * no dates, no map-order dependence: everything is derived from sorted keys
 * and a fixed-seed linear congruential generator.
 */

export interface GraphLayoutNode {
  readonly key: string;
  /** Optional cluster hint; nodes sharing a domain are pulled together. */
  readonly domain?: string;
  /** Optional sub-cluster hint; normally a subject inside one domain. */
  readonly cluster?: string;
}

export interface GraphLayoutEdge {
  readonly source: string;
  readonly target: string;
  /** Relative attraction strength. Defaults to 1. */
  readonly weight?: number;
}

export interface GraphLayoutPoint {
  readonly x: number;
  readonly y: number;
}

export interface GraphLayoutOptions {
  /** Canvas width in user units. Defaults to the explorer viewBox width. */
  readonly width?: number;
  /** Canvas height in user units. Defaults to the explorer viewBox height. */
  readonly height?: number;
  /** Minimum distance kept between node centers after layout. */
  readonly minNodeDistance?: number;
  /** Force-directed iteration count. */
  readonly iterations?: number;
  /** Maximum separation passes enforcing the minimum node distance. */
  readonly separationPasses?: number;
  /** Seed for the LCG used during initial placement. */
  readonly seed?: number;
}

const defaultWidth = 1200;
const defaultHeight = 760;
const defaultMargin = 80;
const defaultIterations = 420;
const defaultSeparationPasses = 80;
const defaultMinNodeDistance = 27;
const defaultSeed = 0x9e3779b9;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));

/** Deterministic 32-bit LCG (Numerical Recipes constants). */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clusterKey(node: GraphLayoutNode): string {
  return `${node.domain ?? ""}\0${node.cluster ?? ""}`;
}

/**
 * Computes deterministic node positions with a Fruchterman–Reingold pass over
 * domain- and subject-clustered initial placement, followed by a deterministic
 * separation pass that enforces a minimum distance between node centers. The
 * result is normalized into the viewBox coordinate system of the explorer
 * canvas (1200 × 760 by default) with integer coordinates.
 */
export function layoutKnowledgeGraph(
  nodes: readonly GraphLayoutNode[],
  edges: readonly GraphLayoutEdge[],
  options: GraphLayoutOptions = {},
): ReadonlyMap<string, GraphLayoutPoint> {
  const width = options.width ?? defaultWidth;
  const height = options.height ?? defaultHeight;
  const margin = defaultMargin;
  const minNodeDistance = options.minNodeDistance ?? defaultMinNodeDistance;
  const iterations = options.iterations ?? defaultIterations;
  const separationPasses = options.separationPasses ?? defaultSeparationPasses;
  const random = createRandom(options.seed ?? defaultSeed);

  const sortedNodes = [...nodes].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const positions = new Map<string, { x: number; y: number }>();
  if (sortedNodes.length === 0) return positions;

  const centerX = width / 2;
  const centerY = height / 2;

  // Domain anchors sit on a wide ellipse. Subject/cluster anchors then form a
  // deterministic phyllotaxis pattern around their parent domain so the public
  // graph reads as a set of related regions instead of one undifferentiated
  // ball. Neither level depends on input order.
  const domains = [...new Set(sortedNodes.map((node) => node.domain ?? ""))].sort();
  const anchorByDomain = new Map<string, { x: number; y: number }>();
  const angleByDomain = new Map<string, number>();
  domains.forEach((domain, index) => {
    const angle = (index / Math.max(1, domains.length)) * Math.PI * 2 - Math.PI / 2;
    angleByDomain.set(domain, angle);
    anchorByDomain.set(domain, {
      x: centerX + Math.cos(angle) * Math.min(360, width * 0.3),
      y: centerY + Math.sin(angle) * Math.min(220, height * 0.29),
    });
  });

  const clustersByDomain = new Map<string, string[]>();
  for (const node of sortedNodes) {
    const domain = node.domain ?? "";
    const key = clusterKey(node);
    const clusters = clustersByDomain.get(domain) ?? [];
    if (!clusters.includes(key)) clusters.push(key);
    clustersByDomain.set(domain, clusters);
  }
  for (const clusters of clustersByDomain.values()) clusters.sort();

  const anchorByCluster = new Map<string, { x: number; y: number }>();
  for (const domain of domains) {
    const domainAnchor = anchorByDomain.get(domain) ?? { x: centerX, y: centerY };
    const domainAngle = angleByDomain.get(domain) ?? 0;
    const clusters = clustersByDomain.get(domain) ?? [];
    clusters.forEach((key, index) => {
      if (clusters.length === 1) {
        anchorByCluster.set(key, domainAnchor);
        return;
      }
      const progress = Math.sqrt((index + 1) / clusters.length);
      const angle = domainAngle + index * goldenAngle;
      anchorByCluster.set(key, {
        x: domainAnchor.x + Math.cos(angle) * Math.min(210, width * 0.175) * progress,
        y: domainAnchor.y + Math.sin(angle) * Math.min(145, height * 0.19) * progress,
      });
    });
  }

  for (const node of sortedNodes) {
    const anchor = anchorByCluster.get(clusterKey(node)) ??
      anchorByDomain.get(node.domain ?? "") ?? { x: centerX, y: centerY };
    positions.set(node.key, {
      x: anchor.x + (random() - 0.5) * 130,
      y: anchor.y + (random() - 0.5) * 110,
    });
  }

  const nodeList = sortedNodes.map((node) => ({
    key: node.key,
    domain: node.domain ?? "",
    cluster: clusterKey(node),
    position: positions.get(node.key) ?? { x: centerX, y: centerY },
    displacement: { x: 0, y: 0 },
  }));
  const indexByKey = new Map(nodeList.map((node, index) => [node.key, index] as const));
  const edgePairs = edges
    .map((edge) => {
      const source = indexByKey.get(edge.source);
      const target = indexByKey.get(edge.target);
      if (source === undefined || target === undefined || source === target) return null;
      return [
        Math.min(source, target),
        Math.max(source, target),
        clamp(edge.weight ?? 1, 0.1, 2),
      ] as const;
    })
    .filter((pair): pair is readonly [number, number, number] => pair !== null)
    .sort((left, right) => left[0] - right[0] || left[1] - right[1] || left[2] - right[2]);

  const area = (width - margin * 2) * (height - margin * 2);
  const optimalDistance = 1.45 * Math.sqrt(area / nodeList.length);
  const initialTemperature = Math.min(width, height) / 6;
  let temperature = initialTemperature;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const node of nodeList) {
      node.displacement.x = 0;
      node.displacement.y = 0;
    }
    // Repulsion between every pair.
    for (let a = 0; a < nodeList.length; a += 1) {
      const nodeA = nodeList[a];
      if (!nodeA) continue;
      for (let b = a + 1; b < nodeList.length; b += 1) {
        const nodeB = nodeList[b];
        if (!nodeB) continue;
        let dx = nodeA.position.x - nodeB.position.x;
        let dy = nodeA.position.y - nodeB.position.y;
        let distance = Math.hypot(dx, dy);
        if (distance < 0.01) {
          // Deterministic nudge for exact overlaps instead of a random jitter.
          dx = 0.01 + (a % 7) * 0.01;
          dy = 0.01 + (b % 5) * 0.01;
          distance = Math.hypot(dx, dy);
        }
        const separationWeight =
          nodeA.cluster === nodeB.cluster ? 0.7 : nodeA.domain === nodeB.domain ? 1.15 : 1.3;
        const force = ((optimalDistance * optimalDistance) / distance) * separationWeight;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        nodeA.displacement.x += fx;
        nodeA.displacement.y += fy;
        nodeB.displacement.x -= fx;
        nodeB.displacement.y -= fy;
      }
    }
    // Attraction along edges.
    for (const [sourceIndex, targetIndex, weight] of edgePairs) {
      const source = nodeList[sourceIndex];
      const target = nodeList[targetIndex];
      if (!source || !target) continue;
      const dx = source.position.x - target.position.x;
      const dy = source.position.y - target.position.y;
      const distance = Math.max(0.01, Math.hypot(dx, dy));
      const topologyWeight =
        source.cluster === target.cluster ? 1 : source.domain === target.domain ? 0.32 : 0.1;
      const force = ((distance * distance) / optimalDistance) * weight * topologyWeight;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      source.displacement.x -= fx;
      source.displacement.y -= fy;
      target.displacement.x += fx;
      target.displacement.y += fy;
    }
    // Cluster gravity gives each subject a readable local neighbourhood while
    // weaker domain gravity keeps sibling subjects recognisably related. It
    // also bounds edge-less nodes, which repulsion alone would send outward.
    for (const node of nodeList) {
      const domainAnchor = anchorByDomain.get(node.domain) ?? { x: centerX, y: centerY };
      const clusterAnchor = anchorByCluster.get(node.cluster) ?? domainAnchor;
      node.displacement.x +=
        (clusterAnchor.x - node.position.x) * 0.09 + (domainAnchor.x - node.position.x) * 0.01;
      node.displacement.y +=
        (clusterAnchor.y - node.position.y) * 0.09 + (domainAnchor.y - node.position.y) * 0.01;
      const displacementLength = Math.max(
        0.01,
        Math.hypot(node.displacement.x, node.displacement.y),
      );
      const step = Math.min(displacementLength, temperature);
      node.position.x += (node.displacement.x / displacementLength) * step;
      node.position.y += (node.displacement.y / displacementLength) * step;
    }
    temperature = initialTemperature * (1 - (iteration + 1) / iterations);
  }

  // Normalization. The force pass runs unclamped (clamping mid-iteration pins
  // nodes onto the boundary rails and creates piles), so the result is fitted
  // into the canvas afterwards: recenter, then scale uniformly. The scale is
  // chosen large enough to satisfy the minimum node distance and small enough
  // to fit the drawable box; when both conflict the fit wins and the
  // separation pass below repairs the remaining local crowding.
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node of nodeList) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x);
    maxY = Math.max(maxY, node.position.y);
  }
  const extentX = Math.max(1, maxX - minX);
  const extentY = Math.max(1, maxY - minY);
  const appliedScale = Math.min((width - margin * 2) / extentX, (height - margin * 2) / extentY);
  const extentCenterX = (minX + maxX) / 2;
  const extentCenterY = (minY + maxY) / 2;
  for (const node of nodeList) {
    node.position.x = centerX + (node.position.x - extentCenterX) * appliedScale;
    node.position.y = centerY + (node.position.y - extentCenterY) * appliedScale;
    node.position.x = clamp(node.position.x, margin, width - margin);
    node.position.y = clamp(node.position.y, margin, height - margin);
  }

  // Deterministic separation pass: walk pairs in sorted order and push apart
  // anything closer than the minimum label clearance.
  for (let pass = 0; pass < separationPasses; pass += 1) {
    let moved = false;
    for (let a = 0; a < nodeList.length; a += 1) {
      const nodeA = nodeList[a];
      if (!nodeA) continue;
      for (let b = a + 1; b < nodeList.length; b += 1) {
        const nodeB = nodeList[b];
        if (!nodeB) continue;
        let dx = nodeB.position.x - nodeA.position.x;
        let dy = nodeB.position.y - nodeA.position.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= minNodeDistance) continue;
        if (distance < 0.01) {
          dx = 0.01 + (a % 7) * 0.01;
          dy = 0.01 + (b % 5) * 0.01;
          distance = Math.hypot(dx, dy);
        }
        const push = (minNodeDistance - distance) / 2;
        const ux = dx / distance;
        const uy = dy / distance;
        nodeA.position.x = clamp(nodeA.position.x - ux * push, margin, width - margin);
        nodeA.position.y = clamp(nodeA.position.y - uy * push, margin, height - margin);
        nodeB.position.x = clamp(nodeB.position.x + ux * push, margin, width - margin);
        nodeB.position.y = clamp(nodeB.position.y + uy * push, margin, height - margin);
        moved = true;
      }
    }
    if (!moved) break;
  }

  const result = new Map<string, GraphLayoutPoint>();
  for (const node of nodeList) {
    result.set(node.key, {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
    });
  }
  return result;
}
