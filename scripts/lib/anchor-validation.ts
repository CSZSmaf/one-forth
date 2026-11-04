import { collectHeadingAnchors, slugifyHeading } from "../../packages/content/src/heading-slug.ts";

export interface AnchorError {
  readonly documentId: string;
  readonly message: string;
}

export interface AuthoredAnchorCollection {
  readonly anchors: ReadonlySet<string>;
  readonly errors: readonly AnchorError[];
}

export interface CanonicalAnchorTarget {
  readonly conceptId: string;
  readonly chapterId: string;
  readonly anchorId?: string;
  readonly chapterContentId?: string;
  readonly chapterConceptIds: readonly string[];
  readonly authoredAnchors?: ReadonlySet<string>;
}

const semanticPrefixes = {
  Definition: "definition-",
  Theorem: "theorem-",
  Lemma: "lemma-",
  Proof: "proof-",
  Derivation: "derivation-",
  Example: "example-",
} as const;

const semanticAnchorPattern =
  /^(?:definition|theorem|lemma|proof|derivation|equation|figure|example|exercise)-[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function isSemanticAnchorId(anchorId: string): boolean {
  return semanticAnchorPattern.test(anchorId);
}

export { slugifyHeading };

function idAttribute(attributes: string): string | null {
  return /\bid\s*=\s*["']([^"']+)["']/.exec(attributes)?.[1] ?? null;
}

function addAnchor(
  anchors: Set<string>,
  id: string,
  documentId: string,
  errors: AnchorError[],
): void {
  if (!id) {
    errors.push({ documentId, message: "Anchor ID resolved to an empty string" });
    return;
  }
  if (anchors.has(id)) {
    errors.push({ documentId, message: `Duplicate anchor ID: ${id}` });
    return;
  }
  anchors.add(id);
}

export function collectAuthoredAnchors(body: string, documentId: string): AuthoredAnchorCollection {
  const anchors = new Set<string>(["article-overview"]);
  const errors: AnchorError[] = [];

  for (const heading of collectHeadingAnchors(body)) {
    addAnchor(anchors, heading.id, documentId, errors);
  }

  // Renamed headings retain their previous fragment URL as an empty inline anchor.
  for (const match of body.matchAll(/<span\b([^>]*\bdata-heading-alias=""[^>]*)\/>/g)) {
    const id = idAttribute(match[1] ?? "");
    if (id) addAnchor(anchors, id, documentId, errors);
  }

  for (const [component, prefix] of Object.entries(semanticPrefixes)) {
    const expression = new RegExp(`<${component}\\b([\\s\\S]*?)>`, "g");
    for (const match of body.matchAll(expression)) {
      const id = idAttribute(match[1] ?? "");
      if (!id) {
        errors.push({ documentId, message: `${component} is missing id` });
      } else if (!id.startsWith(prefix)) {
        errors.push({
          documentId,
          message: `${component} anchor ${id} must start with ${prefix}`,
        });
      } else {
        addAnchor(anchors, id, documentId, errors);
      }
    }
  }

  for (const match of body.matchAll(/<Exercise\b([\s\S]*?)>/g)) {
    const id = idAttribute(match[1] ?? "");
    if (!id) {
      errors.push({ documentId, message: "Exercise is missing id" });
    } else if (!id.startsWith("exercise-")) {
      errors.push({
        documentId,
        message: `Exercise anchor ${id} must start with exercise-`,
      });
    } else {
      addAnchor(anchors, id, documentId, errors);
    }
  }

  for (const match of body.matchAll(/<Equation\b([\s\S]*?)\/?\s*>/g)) {
    const recordId = idAttribute(match[1] ?? "");
    if (!recordId) {
      errors.push({ documentId, message: "Equation is missing id" });
    } else {
      addAnchor(anchors, `equation-${recordId}`, documentId, errors);
    }
  }

  for (const match of body.matchAll(/<(InteractiveFigure|TeachingFigure|PaperFigure)\b([\s\S]*?)\/?\s*>/g)) {
    const visualizationId = idAttribute(match[2] ?? "");
    if (!visualizationId) {
      errors.push({ documentId, message: `${match[1]} is missing id` });
    } else {
      addAnchor(anchors, `figure-${visualizationId}`, documentId, errors);
    }
  }

  return { anchors, errors };
}

/**
 * Authored chapters may only target an anchor parsed from their MDX body.
 * PlannedChapterPage owns concept anchors only for chapters without authored
 * content, and only when the concept is present in that chapter's reverse index.
 */
export function validateCanonicalAnchorTarget(target: CanonicalAnchorTarget): AnchorError | null {
  const { conceptId, chapterId, anchorId } = target;
  if (!anchorId) return null;

  if (target.chapterContentId) {
    return target.authoredAnchors?.has(anchorId)
      ? null
      : {
          documentId: `concept:${conceptId}`,
          message: `Authored chapter canonical anchor does not exist in body: ${chapterId}#${anchorId}`,
        };
  }

  if (!isSemanticAnchorId(anchorId)) {
    return {
      documentId: `concept:${conceptId}`,
      message: `Planned chapter canonical anchor must use a semantic prefix: ${chapterId}#${anchorId}`,
    };
  }

  return target.chapterConceptIds.includes(conceptId)
    ? null
    : {
        documentId: `concept:${conceptId}`,
        message: `Planned chapter canonical anchor is not generated: ${chapterId}#${anchorId}`,
      };
}
