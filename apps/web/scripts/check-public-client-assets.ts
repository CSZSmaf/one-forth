import { readFile, readdir, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";

const maxClientJavaScriptBytes = 512 * 1024;

const forbiddenEditorialMarkers = [
  "publicationStatus",
  "editorialStatus",
  "translationEditorialStatus",
  "mathematicalStatus",
  "numericalStatus",
  "sourceStatus",
  "accessibilityStatus",
  "humanReviewer",
  "isPreview",
] as const;

const pendingEditorialState =
  /(?:editorialStatus|translationEditorialStatus|mathematicalStatus|numericalStatus|sourceStatus|accessibilityStatus)[^\n]{0,80}["']pending["']/;

interface ClientAsset {
  readonly path: string;
  readonly bytes: number;
}

async function collectFiles(directory: string): Promise<ClientAsset[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: ClientAsset[] = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      files.push({ path, bytes: (await stat(path)).size });
    }
  }

  return files;
}

const assetsDirectory = resolve(process.cwd(), "dist", "client", "assets");
const clientDirectory = resolve(process.cwd(), "dist", "client");
const publicFiles = await collectFiles(clientDirectory);
const privateBuildFiles = publicFiles.filter((file) => {
  const path = relative(clientDirectory, file.path).replaceAll("\\", "/");
  return path.startsWith(".vite/") || path.endsWith(".map");
});
const assets = publicFiles.filter((file) => file.path.endsWith(".js"));
if (assets.length === 0) {
  throw new Error(`No client JavaScript assets were found in ${assetsDirectory}.`);
}

const oversized = assets.filter((asset) => asset.bytes > maxClientJavaScriptBytes);
const editorialLeaks: { readonly path: string; readonly markers: readonly string[] }[] = [];

for (const asset of assets) {
  const source = await readFile(asset.path, "utf8");
  // Vinext's Pages Router compatibility object includes a fixed `isPreview: false`
  // field. It is framework API surface, not a One Forth search/editorial DTO.
  const editorialSource = source.replace(/\bisPreview:!1(?=,isFallback:)/g, "");
  const markers = forbiddenEditorialMarkers.filter((marker) => editorialSource.includes(marker));
  if (pendingEditorialState.test(editorialSource)) {
    editorialLeaks.push({ path: asset.path, markers: [...markers, "editorial pending state"] });
  } else if (markers.length > 0) {
    editorialLeaks.push({ path: asset.path, markers });
  }
}

const largest = assets.reduce((current, asset) => (asset.bytes > current.bytes ? asset : current));
const describe = (path: string) => relative(assetsDirectory, path).replaceAll("\\", "/");
const summary = {
  status:
    oversized.length === 0 && editorialLeaks.length === 0 && privateBuildFiles.length === 0
      ? "pass"
      : "fail",
  privateBuildFiles: privateBuildFiles.map((file) => relative(clientDirectory, file.path)),
  files: assets.length,
  maxAssetBytes: maxClientJavaScriptBytes,
  largestFile: { path: describe(largest.path), bytes: largest.bytes },
  oversized: oversized.map((asset) => ({ path: describe(asset.path), bytes: asset.bytes })),
  editorialLeaks: editorialLeaks.map((leak) => ({
    path: describe(leak.path),
    markers: leak.markers,
  })),
};

console.log(`Public client assets: ${JSON.stringify(summary)}`);

if (summary.status === "fail") {
  throw new Error(
    "Public client assets exceeded the single-file budget or contained private editorial schema.",
  );
}
