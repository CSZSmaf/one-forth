/** Historical public paths retained when a subject shelf is split. */
export const legacyBookRouteGroups = [
  {
    sourceSeries: "computing-ai",
    targetSeries: "computer-science",
    bookSlugs: [
      "programming-scientific-computing-foundations",
      "data-structures-algorithms-complexity",
      "data-processing-experiment-design-reproducibility",
    ],
  },
  {
    sourceSeries: "computing-ai",
    targetSeries: "artificial-intelligence",
    bookSlugs: [
      "machine-learning-problems-data-evaluation",
      "linear-models-statistical-learning",
      "kernel-tree-ensemble-methods",
      "unsupervised-learning-probabilistic-graphical-models",
      "neural-networks-backpropagation",
      "deep-learning-optimization-engineering",
      "convolutional-neural-networks-computer-vision",
      "sequence-models-attention-transformers",
      "representation-self-supervised-learning",
      "generative-models",
      "reinforcement-learning",
      "graph-neural-networks-geometric-deep-learning",
      "large-language-multimodal-agents",
      "interpretability-uncertainty-alignment-safety",
      "scientific-machine-learning-pinn-neural-operators",
    ],
  },
] as const;

export const legacyCurriculumRoutes: Readonly<Record<string, string>> = {
  "books/computing-ai": "books",
  "paths/computing-ai-complete": "paths/computer-science-complete",
};

/** A path-only mapping also keeps existing browser progress records usable. */
export function normalizeCurriculumPath(path: string): string {
  const match = /^(\/(?:zh-CN|en)\/)([^?#]*)(.*)$/.exec(path);
  if (!match) return path;
  const [, prefix, route, suffix] = match;
  if (!prefix || route === undefined) return path;
  const direct = legacyCurriculumRoutes[route.replace(/\/$/, "")];
  if (direct) return `${prefix}${direct}${suffix ?? ""}`;
  for (const group of legacyBookRouteGroups) {
    for (const book of group.bookSlugs) {
      const source = `books/${group.sourceSeries}/${book}`;
      if (route === source || route.startsWith(`${source}/`)) {
        return `${prefix}books/${group.targetSeries}/${book}${route.slice(source.length)}${suffix ?? ""}`;
      }
    }
  }
  return path;
}
