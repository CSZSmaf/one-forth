import {
  generatedGraphLayoutByLocale,
  generatedGraphLayoutVersion,
} from "./generated-graph-layout";

export { generatedGraphLayoutByLocale, generatedGraphLayoutVersion };

/** Integer canvas coordinate in the 1200 × 760 explorer viewBox space. */
export type GeneratedGraphLayoutPosition = readonly [x: number, y: number];

/**
 * Precomputed deterministic node positions per locale, keyed by the public
 * tool-index entry id of each concept node. Bump `generatedGraphLayoutVersion`
 * in the generated artifact whenever the payload shape changes.
 */
export type GeneratedGraphLayoutByLocale = Readonly<
  Record<string, Readonly<Record<string, GeneratedGraphLayoutPosition>>>
>;

/** Returns the precomputed layout for one locale, or null when absent. */
export function getGeneratedGraphLayout(
  locale: string,
): Readonly<Record<string, GeneratedGraphLayoutPosition>> | null {
  const byLocale: GeneratedGraphLayoutByLocale = generatedGraphLayoutByLocale;
  return byLocale[locale] ?? null;
}
