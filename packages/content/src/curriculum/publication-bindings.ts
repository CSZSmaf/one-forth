import type { EditorialStatus, PublicationStatus } from "../maturity";
import type { CurriculumDataset } from "./types";

interface PublicationSourceDocument {
  readonly frontmatter: {
    readonly id: string;
    readonly publicationStatus: PublicationStatus;
    readonly editorialStatus: EditorialStatus;
  };
}

interface ContentStatusDecision {
  readonly publicationStatus: PublicationStatus;
  readonly editorialStatus: EditorialStatus;
}

/**
 * Authored chapter state is copied from validated content metadata. Blueprint
 * materialization remains conservative, so a missing document can never make a
 * chapter public by accident.
 */
export function bindCurriculumPublication(
  dataset: CurriculumDataset,
  documents: readonly PublicationSourceDocument[],
): CurriculumDataset {
  const chapterByContentId = new Map(
    dataset.chapters.flatMap((chapter) =>
      chapter.contentId ? ([[chapter.contentId, chapter.id]] as const) : [],
    ),
  );
  const decisionByContentId = new Map<string, ContentStatusDecision>();

  for (const document of documents) {
    const contentId = document.frontmatter.id;
    if (!chapterByContentId.has(contentId)) {
      throw new Error(`Content ${contentId} has no curriculum Chapter publication binding.`);
    }
    const decision: ContentStatusDecision = {
      publicationStatus: document.frontmatter.publicationStatus,
      editorialStatus: document.frontmatter.editorialStatus,
    };
    const previous = decisionByContentId.get(contentId);
    if (
      previous &&
      (previous.publicationStatus !== decision.publicationStatus ||
        previous.editorialStatus !== decision.editorialStatus)
    ) {
      throw new Error(`Translated content ${contentId} has inconsistent publication metadata.`);
    }
    decisionByContentId.set(contentId, decision);
  }

  const chapters = dataset.chapters.map((chapter) => {
    if (!chapter.contentId) return chapter;
    const decision = decisionByContentId.get(chapter.contentId);
    if (!decision) {
      throw new Error(
        `Curriculum Chapter ${chapter.id} references missing content ${chapter.contentId}.`,
      );
    }
    return { ...chapter, ...decision };
  });

  return { ...dataset, chapters };
}
