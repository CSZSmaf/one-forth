import type { SupportedLocale } from "@one-forth/config";
import { readerConceptById, readerCurriculumRepository } from "@one-forth/content";
import { localize } from "@one-forth/registry";
import { visualizationManifest } from "@one-forth/visualization";
import { InteractiveFigure } from "./interactive-figure";
import type { VisualizationRelatedReadingLink } from "./related-reading-context";

interface CurriculumInteractiveFigureProps {
  readonly id: string;
  readonly locale?: SupportedLocale;
}

export function CurriculumInteractiveFigure({
  id,
  locale = "zh-CN",
}: CurriculumInteractiveFigureProps) {
  const manifestEntry = visualizationManifest.find((entry) => entry.id === id);
  const relatedReading: readonly VisualizationRelatedReadingLink[] =
    manifestEntry?.scientificReview.relatedConceptIds.flatMap((conceptId) => {
      const concept = readerConceptById.get(conceptId);
      if (!concept) return [];
      const href = readerCurriculumRepository.resolveCanonicalLocation(
        concept.canonicalLocation,
        locale,
      );
      if (!href) return [];
      return [
        {
          id: conceptId,
          title: localize(concept.title, locale),
          href,
        },
      ];
    }) ?? [];

  return <InteractiveFigure id={id} locale={locale} relatedReading={relatedReading} />;
}
