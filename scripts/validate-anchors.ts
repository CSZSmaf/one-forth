import { conceptCatalog, curriculumRepository } from "../packages/content/src/index.ts";
import {
  collectAuthoredAnchors,
  validateCanonicalAnchorTarget,
  type AnchorError,
} from "./lib/anchor-validation.ts";
import { loadContentDocuments } from "./lib/content-files.ts";

const { documents, diagnostics } = await loadContentDocuments();
if (diagnostics.length > 0) {
  for (const diagnostic of diagnostics) console.error(`${diagnostic.file}: ${diagnostic.message}`);
  process.exitCode = 1;
} else {
  const errors: AnchorError[] = [];
  let anchorCount = 0;
  const anchorsByContentId = new Map<string, ReadonlySet<string>>();

  for (const document of documents) {
    const collected = collectAuthoredAnchors(document.body, document.documentId);
    errors.push(...collected.errors);
    anchorCount += collected.anchors.size;
    anchorsByContentId.set(document.frontmatter.id, collected.anchors);
  }

  let conceptTargetCount = 0;
  for (const concept of conceptCatalog) {
    const { chapterId, anchorId } = concept.canonicalLocation;
    const chapter = curriculumRepository.getChapter(chapterId);
    if (!chapter) {
      errors.push({
        documentId: `concept:${concept.id}`,
        message: `Canonical chapter does not exist: ${chapterId}`,
      });
      continue;
    }
    const reverseIndexed = chapter.conceptIds.includes(concept.id);
    if (!reverseIndexed) {
      errors.push({
        documentId: `concept:${concept.id}`,
        message: `Canonical chapter ${chapterId} does not include the concept in its reverse index`,
      });
    }
    if (!anchorId) {
      if (reverseIndexed) conceptTargetCount += 1;
      continue;
    }
    const authoredAnchors = chapter.contentId
      ? anchorsByContentId.get(chapter.contentId)
      : undefined;
    const targetError = validateCanonicalAnchorTarget({
      conceptId: concept.id,
      chapterId,
      anchorId,
      chapterConceptIds: chapter.conceptIds,
      ...(chapter.contentId ? { chapterContentId: chapter.contentId } : {}),
      ...(authoredAnchors ? { authoredAnchors } : {}),
    });
    if (targetError) {
      errors.push(targetError);
    } else if (reverseIndexed) {
      conceptTargetCount += 1;
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`${error.documentId}: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Anchor validation passed: ${documents.length} document(s), ${anchorCount} authored anchor(s), ${conceptTargetCount}/${conceptCatalog.length} concept target(s).`,
    );
  }
}
