import {
  curriculumSnapshotMatches,
  curriculumSnapshotPath,
  writeCurriculumSnapshot,
} from "./curriculum/shared.ts";

const check = process.argv.includes("--check");
if (check) {
  if (!(await curriculumSnapshotMatches())) {
    console.error("Curriculum snapshot is missing or stale. Run pnpm generate:curriculum.");
    process.exitCode = 1;
  } else {
    console.log(`Curriculum snapshot is current: ${curriculumSnapshotPath}`);
  }
} else {
  await writeCurriculumSnapshot();
  console.log(`Generated curriculum snapshot: ${curriculumSnapshotPath}`);
}
