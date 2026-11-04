import type { SupportedLocale } from "@one-forth/config";
import type { CanonicalLocation, CurriculumRepository } from "./types";

export type CurriculumRedirectKind =
  | "legacy-learn"
  | "legacy-concept"
  | "legacy-path"
  | "legacy-books";

export interface CurriculumRedirect {
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly kind: CurriculumRedirectKind;
}

interface RedirectDocument {
  readonly locale: SupportedLocale;
  readonly slug: readonly string[];
  readonly frontmatter: Readonly<{ id: string }>;
}

interface RedirectConcept {
  readonly id: string;
  readonly canonicalLocation: CanonicalLocation;
}

interface DeriveCurriculumRedirectsOptions {
  readonly locale: SupportedLocale;
  readonly documents: readonly RedirectDocument[];
  readonly concepts: readonly RedirectConcept[];
  readonly repository: CurriculumRepository;
}

export function deriveCurriculumRedirects({
  locale,
  documents,
  concepts,
  repository,
}: DeriveCurriculumRedirectsOptions): readonly CurriculumRedirect[] {
  const documentRedirects = documents
    .filter((document) => document.locale === locale)
    .map((document): CurriculumRedirect => {
      const chapter = repository.getChapterForContent(document.frontmatter.id);
      const context = chapter ? repository.getChapterContext(chapter.id, locale) : null;
      if (!chapter || !context) {
        throw new Error(
          `Cannot derive legacy learn redirect for unmapped content ${document.frontmatter.id}`,
        );
      }
      return {
        sourcePath: `/${locale}/learn/${document.slug.join("/")}`,
        targetPath: context.canonicalPath,
        kind: "legacy-learn",
      };
    });
  const conceptRedirects = concepts.map((concept): CurriculumRedirect => {
    const targetPath = repository.resolveCanonicalLocation(concept.canonicalLocation, locale);
    if (!targetPath) {
      throw new Error(`Cannot derive legacy concept redirect for ${concept.id}`);
    }
    return {
      sourcePath: `/${locale}/concepts/${concept.id}`,
      targetPath,
      kind: "legacy-concept",
    };
  });

  return [...documentRedirects, ...conceptRedirects].sort((left, right) =>
    left.sourcePath.localeCompare(right.sourcePath, "en"),
  );
}
