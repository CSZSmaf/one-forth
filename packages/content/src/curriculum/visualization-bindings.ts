import type { CurriculumDataset, CurriculumVisualizationBinding } from "./types";

interface VisualizationSourceDocument {
  readonly frontmatter: {
    readonly id: string;
    readonly visualizations: readonly string[];
  };
}

export interface BoundCurriculumVisualizations {
  readonly dataset: CurriculumDataset;
  readonly bindings: readonly CurriculumVisualizationBinding[];
}

/**
 * Only visualizations referenced by more than one authored chapter need an
 * editorial primary-content choice. Every candidate still comes from MDX
 * frontmatter and is checked by validate:curriculum.
 */
export const primaryVisualizationContentOverrides: Readonly<Record<string, string>> = {
  "linear-transform-2d": "linear-transformations",
  "neural-decision-boundary": "perceptron-mlp",
};

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

export function bindCurriculumVisualizations(
  dataset: CurriculumDataset,
  documents: readonly VisualizationSourceDocument[],
  primaryOverrides: Readonly<Record<string, string>> = primaryVisualizationContentOverrides,
): BoundCurriculumVisualizations {
  const chapterByContentId = new Map(
    dataset.chapters.flatMap((chapter) =>
      chapter.contentId ? ([[chapter.contentId, chapter]] as const) : [],
    ),
  );
  const visualizationIdsByContentId = new Map<string, readonly string[]>();

  for (const document of documents) {
    const visualizationIds = uniqueSorted(document.frontmatter.visualizations);
    const previous = visualizationIdsByContentId.get(document.frontmatter.id);
    if (previous && previous.join("\u241f") !== visualizationIds.join("\u241f")) {
      throw new Error(
        `Translated content ${document.frontmatter.id} has inconsistent visualization references.`,
      );
    }
    visualizationIdsByContentId.set(document.frontmatter.id, visualizationIds);
    if (visualizationIds.length > 0 && !chapterByContentId.has(document.frontmatter.id)) {
      throw new Error(
        `Content ${document.frontmatter.id} references visualizations but has no curriculum Chapter.`,
      );
    }
  }

  const chapters = dataset.chapters.map((chapter) => ({
    ...chapter,
    visualizationIds: chapter.contentId
      ? (visualizationIdsByContentId.get(chapter.contentId) ?? [])
      : [],
  }));
  const candidatesByVisualization = new Map<
    string,
    { readonly chapterId: string; readonly contentId: string }[]
  >();

  for (const chapter of chapters) {
    if (!chapter.contentId) continue;
    for (const visualizationId of chapter.visualizationIds) {
      const candidates = candidatesByVisualization.get(visualizationId) ?? [];
      candidates.push({ chapterId: chapter.id, contentId: chapter.contentId });
      candidatesByVisualization.set(visualizationId, candidates);
    }
  }

  const bindings = [...candidatesByVisualization.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([visualizationId, candidates]) => {
      const orderedCandidates = [...candidates].sort((left, right) =>
        left.contentId.localeCompare(right.contentId, "en"),
      );
      const primaryContentId =
        primaryOverrides[visualizationId] ??
        (orderedCandidates.length === 1 ? orderedCandidates[0]?.contentId : undefined);
      const primary = orderedCandidates.find(
        (candidate) => candidate.contentId === primaryContentId,
      );
      if (!primary || !primaryContentId) {
        throw new Error(
          `Visualization ${visualizationId} has ${orderedCandidates.length} candidate Chapters and needs a valid primary content override.`,
        );
      }
      return {
        visualizationId,
        primaryChapterId: primary.chapterId,
        primaryContentId,
        chapterIds: orderedCandidates.map((candidate) => candidate.chapterId),
        contentIds: orderedCandidates.map((candidate) => candidate.contentId),
      } satisfies CurriculumVisualizationBinding;
    });

  for (const [visualizationId, contentId] of Object.entries(primaryOverrides)) {
    const binding = bindings.find((entry) => entry.visualizationId === visualizationId);
    if (!binding || !binding.contentIds.includes(contentId)) {
      throw new Error(
        `Primary visualization override ${visualizationId} -> ${contentId} is not backed by authored frontmatter.`,
      );
    }
  }

  return {
    dataset: { ...dataset, chapters },
    bindings,
  };
}
