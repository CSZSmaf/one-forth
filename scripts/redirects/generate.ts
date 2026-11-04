import {
  describeRedirectArtifacts,
  redirectArtifactsMatch,
  redirectsJsonPath,
  redirectsTextPath,
  writeRedirectArtifacts,
} from "./artifacts.ts";

if (process.argv.includes("--check")) {
  if (!(await redirectArtifactsMatch())) {
    console.error("Redirect artifacts are missing or stale. Run pnpm generate:redirects.");
    process.exitCode = 1;
  } else {
    console.log(`Redirect artifacts are current: ${describeRedirectArtifacts()}.`);
  }
} else {
  await writeRedirectArtifacts();
  console.log(`Generated ${describeRedirectArtifacts()}.`);
  console.log(`Generated ${redirectsJsonPath}`);
  console.log(`Generated ${redirectsTextPath}`);
}
