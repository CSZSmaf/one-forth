import type { SupportedLocale } from "@one-forth/config";
import { visualizationManifest } from "@one-forth/visualization";
import type { VisualizationId } from "./types";

export function visualizationMetadata(id: VisualizationId, locale: SupportedLocale) {
  const entry = visualizationManifest.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Visualization manifest is missing ${id}.`);
  return {
    title: entry.title[locale] ?? entry.title["zh-CN"],
    description: entry.description[locale] ?? entry.description["zh-CN"],
  };
}
