import { computerFoundationSectionPlans } from "./computer-foundations";
import { computingAiSectionPlans } from "./computing-ai";
import { mathematicsSectionPlans } from "./mathematics";
import { physicsSectionPlans } from "./physics";

export const curriculumSectionPlans: Readonly<Record<string, readonly [string, string, string]>> = {
  ...mathematicsSectionPlans,
  ...physicsSectionPlans,
  ...computingAiSectionPlans,
  ...computerFoundationSectionPlans,
};

export { computingAiSectionPlans, mathematicsSectionPlans, physicsSectionPlans };
