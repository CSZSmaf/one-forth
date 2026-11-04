import { materializeCurriculum } from "../blueprint";
import { bindCurriculumPublication } from "../publication-bindings";
import { bindCurriculumVisualizations } from "../visualization-bindings";
import { generatedDocuments } from "../../generated";
import { computerScienceSeries, artificialIntelligenceSeries } from "./computer-science";
import { mathematicsSeries } from "./mathematics";
import { physicsSeries } from "./physics";

export const curriculumBlueprints = [
  mathematicsSeries,
  physicsSeries,
  computerScienceSeries,
  artificialIntelligenceSeries,
] as const;

const materializedCurriculum = materializeCurriculum(curriculumBlueprints);
const publicationBoundCurriculum = bindCurriculumPublication(
  materializedCurriculum,
  generatedDocuments,
);
const boundCurriculum = bindCurriculumVisualizations(
  publicationBoundCurriculum,
  generatedDocuments,
);

export const curriculumData = boundCurriculum.dataset;
export const curriculumVisualizationBindings = boundCurriculum.bindings;
