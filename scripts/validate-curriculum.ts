import { loadContentDocuments } from "./lib/content-files.ts";
import { collectCurriculumStats, validateCurriculum } from "./curriculum/shared.ts";

const loaded = await loadContentDocuments();
const errors = [
  ...loaded.diagnostics.map((diagnostic) => `${diagnostic.file}: ${diagnostic.message}`),
  ...validateCurriculum(loaded.documents),
];

if (errors.length > 0) {
  console.error(`Curriculum validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const stats = collectCurriculumStats();
  console.log(
    `Curriculum valid: ${stats.series} Series, ${stats.books} Books, ${stats.parts} Parts, ${stats.chapters} Chapters, ${stats.mappedDocuments} MDX mappings, ${stats.locatedConcepts}/${stats.concepts} concept locations, ${stats.visualizationBindings}/${stats.visualizationManifestEntries} visualization bindings.`,
  );
}
