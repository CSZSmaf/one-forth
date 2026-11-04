import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

type BundleCategory = "client" | "rsc" | "ssr" | "worker";

interface BundleFile {
  readonly file: string;
  readonly category: BundleCategory;
  readonly rawBytes: number;
  readonly gzipBytes: number;
}

interface CategorySummary {
  readonly files: number;
  readonly rawBytes: number;
  readonly gzipBytes: number;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const webRoot = path.join(repositoryRoot, "apps", "web");
const distributionRoot = path.join(webRoot, "dist");
const phase = process.argv[2] ?? process.env.BUNDLE_PHASE ?? "baseline";
const source = process.argv[3] ?? process.env.BUNDLE_SOURCE ?? "local";

if (!/^[a-z0-9][a-z0-9-]*$/i.test(phase) || !/^[a-z0-9][a-z0-9-]*$/i.test(source)) {
  throw new Error("Bundle phase and source may only contain letters, numbers, and hyphens.");
}

async function listJavaScript(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listJavaScript(absolute)));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(absolute);
  }
  return files;
}

function isGeneratedManifest(file: string): boolean {
  return path.basename(file).includes("assets_manifest");
}

const wranglerPath = path.join(distributionRoot, "server", "wrangler.json");
const wrangler: unknown = JSON.parse(await readFile(wranglerPath, "utf8"));
if (!wrangler || typeof wrangler !== "object" || !("main" in wrangler)) {
  throw new Error(`Could not resolve Worker main from ${wranglerPath}.`);
}
const main = (wrangler as { readonly main?: unknown }).main;
if (typeof main !== "string" || main.length === 0) {
  throw new Error(`Worker main in ${wranglerPath} must be a non-empty string.`);
}
const workerPath = path.resolve(distributionRoot, "server", main);
const allFiles = await listJavaScript(distributionRoot);
const bundleFiles: BundleFile[] = [];

for (const absolute of allFiles.sort()) {
  if (isGeneratedManifest(absolute)) continue;
  const relative = path.relative(distributionRoot, absolute).replaceAll("\\", "/");
  const category: BundleCategory = absolute.startsWith(path.join(distributionRoot, "client"))
    ? "client"
    : absolute === workerPath
      ? "worker"
      : absolute.startsWith(path.join(distributionRoot, "server", "ssr"))
        ? "ssr"
        : "rsc";
  const bytes = await readFile(absolute);
  bundleFiles.push({
    file: relative,
    category,
    rawBytes: bytes.byteLength,
    gzipBytes: gzipSync(bytes, { level: 9 }).byteLength,
  });
}

const categories = Object.fromEntries(
  (["client", "rsc", "ssr", "worker"] as const).map((category) => {
    const files = bundleFiles.filter((file) => file.category === category);
    const summary: CategorySummary = {
      files: files.length,
      rawBytes: files.reduce((sum, file) => sum + file.rawBytes, 0),
      gzipBytes: files.reduce((sum, file) => sum + file.gzipBytes, 0),
    };
    return [category, summary];
  }),
) as Record<BundleCategory, CategorySummary>;

const largestClientFiles = bundleFiles
  .filter((file) => file.category === "client")
  .sort((left, right) => right.rawBytes - left.rawBytes)
  .slice(0, 15);
const reportDirectory = path.join(repositoryRoot, "reports", "round-4", phase);
await mkdir(reportDirectory, { recursive: true });
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  phase,
  source,
  buildRoot: "apps/web/dist",
  workerMain: path.relative(distributionRoot, workerPath).replaceAll("\\", "/"),
  rules: {
    included: "emitted .js files",
    excluded: ["source maps", "RSC asset manifests"],
    compression: "gzip level 9 per file",
    note: "Per-file gzip totals are diagnostic bundle sizes, not HTTP transfer measurements.",
  },
  categories,
  largestClientFiles,
  files: bundleFiles,
};
const jsonPath = path.join(reportDirectory, `bundle-${source}.json`);
const markdownPath = path.join(reportDirectory, `bundle-${source}.md`);
await writeFile(jsonPath, await format(JSON.stringify(report), { parser: "json" }), "utf8");

const rows = (["client", "rsc", "ssr", "worker"] as const)
  .map((category) => {
    const summary = categories[category];
    return `| ${category} | ${summary.files} | ${summary.rawBytes} | ${summary.gzipBytes} |`;
  })
  .join("\n");
const largestRows = largestClientFiles
  .map((file) => `| \`${file.file}\` | ${file.rawBytes} | ${file.gzipBytes} |`)
  .join("\n");
const markdown = `# One Forth ${phase} bundle report

Generated from the actual \`apps/web/dist\` output after a vinext production build.

| Category | Files | Raw bytes | Per-file gzip bytes |
| --- | ---: | ---: | ---: |
${rows}

## Largest client JavaScript chunks

| File | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
${largestRows}

## Scope

- Includes emitted JavaScript only; source maps and generated RSC asset manifests are excluded.
- Categories are mutually exclusive. The Worker entry is resolved from \`dist/server/wrangler.json\`.
- Gzip is computed independently for each file at level 9. It is a build diagnostic and must not be presented as Lighthouse transfer size or a user download total.
`;
await writeFile(markdownPath, await format(markdown, { parser: "markdown" }), "utf8");

console.log(
  `Bundle report wrote ${bundleFiles.length} JavaScript file(s) to ${path.relative(repositoryRoot, jsonPath)} and ${path.relative(repositoryRoot, markdownPath)}.`,
);
