import {
  curriculumCoverageJsonPath,
  curriculumCoverageMarkdownPath,
  writeCurriculumCoverageReport,
} from "./curriculum/shared.ts";
import {
  round4CoverageJsonPath,
  round4MigrationJsonPath,
  writeRound4Artifacts,
} from "./curriculum/round4-artifacts.ts";

const stats = await writeCurriculumCoverageReport();
const round4 = await writeRound4Artifacts();
console.log(
  `Curriculum coverage: ${stats.books} Books, ${stats.parts} Parts, ${stats.chapters} Chapters, ${stats.mappedDocuments} MDX mappings, ${stats.locatedConcepts}/${stats.concepts} concept locations, ${stats.visualizationBindings}/${stats.visualizationManifestEntries} visualization bindings.`,
);
console.log(`Wrote ${curriculumCoverageJsonPath}`);
console.log(`Wrote ${curriculumCoverageMarkdownPath}`);
console.log(
  `Round 4 migration: ${round4.migration.counts.confirmedTargets}/${round4.migration.counts.totalLegacyEntities} confirmed targets, ${round4.migration.counts.permanentRedirects} redirects.`,
);
console.log(`Wrote ${round4CoverageJsonPath}`);
console.log(`Wrote ${round4MigrationJsonPath}`);
