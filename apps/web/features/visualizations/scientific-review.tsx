import { MathRichTextContent } from "@one-forth/ui";
import { learningToolsText, type SupportedLocale } from "@one-forth/config";
import { visualizationManifest } from "@one-forth/visualization";
import { localize, type LocalizedText } from "@one-forth/registry";
import Link from "next/link";
import { useVisualizationRelatedReading } from "./related-reading-context";
import type { VisualizationId } from "./types";

interface VisualizationScientificReviewProps {
  readonly id: VisualizationId;
  readonly locale: SupportedLocale;
}

function LocalizedList({
  entries,
  locale,
}: {
  readonly entries: readonly LocalizedText[];
  readonly locale: SupportedLocale;
}) {
  return (
    <ul>
      {entries.map((entry) => {
        const text = localize(entry, locale);
        return (
          <li key={text}>
            <MathRichTextContent value={text} />
          </li>
        );
      })}
    </ul>
  );
}

export function VisualizationScientificReview({ id, locale }: VisualizationScientificReviewProps) {
  const entry = visualizationManifest.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Visualization manifest is missing ${id}.`);
  const review = entry.scientificReview;
  const relatedReading = useVisualizationRelatedReading();
  const zh = locale === "zh-CN";

  return (
    <details
      className="interactive-figure__scientific-review"
      aria-labelledby={`${id}-scientific-review-title`}
    >
      <summary id={`${id}-scientific-review-title`}>{learningToolsText[locale].model}</summary>
      <dl>
        <div>
          <dt>{zh ? "观察目标" : "Observation goal"}</dt>
          <dd>
            <MathRichTextContent value={localize(review.observationGoal, locale)} />
          </dd>
        </div>
        <div>
          <dt>{zh ? "数学模型" : "Mathematical model"}</dt>
          <dd>
            <MathRichTextContent value={localize(review.mathematicalModel, locale)} />
          </dd>
        </div>
        <div>
          <dt>{zh ? "假设与适用范围" : "Assumptions and scope"}</dt>
          <dd>
            <LocalizedList entries={review.assumptions} locale={locale} />
          </dd>
        </div>
        <div>
          <dt>{zh ? "操作步骤" : "Procedure"}</dt>
          <dd>
            <LocalizedList entries={review.procedure} locale={locale} />
          </dd>
        </div>
        <div>
          <dt>{zh ? "预期现象" : "Expected phenomena"}</dt>
          <dd>
            <LocalizedList entries={review.expectedPhenomena} locale={locale} />
          </dd>
        </div>
        <div>
          <dt>{zh ? "计算说明" : "Calculation notes"}</dt>
          <dd>
            <LocalizedList entries={review.limitations} locale={locale} />
          </dd>
        </div>
        <div>
          <dt>{zh ? "相关正文" : "Related reading"}</dt>
          <dd>
            <nav aria-label={zh ? "实验相关正文" : "Related experiment reading"}>
              {relatedReading.length > 0 ? (
                relatedReading.map((link) => (
                  <Link key={link.id} href={link.href}>
                    {link.title}
                  </Link>
                ))
              ) : (
                <Link href={`/${locale}/books`}>
                  {zh ? "在教材目录中继续学习" : "Continue in the textbook directory"}
                </Link>
              )}
            </nav>
          </dd>
        </div>
      </dl>
    </details>
  );
}
