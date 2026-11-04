import type { TeachingFigureData } from "@one-forth/registry";
import { mathematicsTeachingFigures } from "./mathematics";
import { physicsTeachingFigures } from "./physics";
import { computingTeachingFigures } from "./computing";
import { ragAlgorithmFigures } from "./rag";
import { resnetDiffusionAlgorithmFigures } from "./resnet-ldm";
import { visionGraphAlgorithmFigures } from "./vit-gat";

export const teachingFigures: readonly TeachingFigureData[] = [
  ...mathematicsTeachingFigures,
  ...physicsTeachingFigures,
  ...computingTeachingFigures,
  ...ragAlgorithmFigures,
  ...resnetDiffusionAlgorithmFigures,
  ...visionGraphAlgorithmFigures,
];

export function getTeachingFigure(id: string): TeachingFigureData | undefined {
  return teachingFigures.find((figure) => figure.id === id);
}
