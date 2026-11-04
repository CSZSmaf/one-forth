import { readFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { domainRegistry, subjectRegistry } from "../packages/registry/src/index.ts";
import { visualizationManifest } from "../packages/visualization/src/index.ts";
import {
  contentRoot,
  errorMessage,
  repositoryRoot,
  toPosixPath,
  walkFiles,
} from "./lib/content-files.ts";

interface ArchitectureError {
  readonly file: string;
  readonly message: string;
}

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function fileLabel(file: string): string {
  return toPosixPath(relative(repositoryRoot, file));
}

function addMatches(
  errors: ArchitectureError[],
  file: string,
  source: string,
  pattern: RegExp,
  message: (match: RegExpExecArray) => string,
): void {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const line = source.slice(0, match.index).split("\n").length;
    errors.push({ file: `${file}:${line}`, message: message(match) });
    if (match[0].length === 0) pattern.lastIndex += 1;
  }
}

async function checkMdxImports(errors: ArchitectureError[]): Promise<void> {
  const files = await walkFiles(contentRoot, new Set([".mdx"]));
  const visualizationIdPattern = visualizationManifest
    .map((entry) => entry.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const forbiddenModule = new RegExp(
    `(?:^|/)(?:visuali[sz]ations?|animations?|experiments?|simulations?)(?:/|$)|@one-forth/visualization|(?:${visualizationIdPattern})`,
    "i",
  );
  for (const path of files) {
    const source = await readFile(path, "utf8");
    const file = fileLabel(path);
    const staticImports = /^\s*(?:import|export)\b[^\n]*?\bfrom\s*["']([^"']+)["']/gm;
    addMatches(errors, file, source, staticImports, (match) => {
      const moduleName = match[1] ?? "<unknown>";
      return forbiddenModule.test(moduleName)
        ? `MDX must reference visualizations by ID, not import ${moduleName}`
        : "";
    });
    const sideEffectImports = /^\s*import\s*["']([^"']+)["']/gm;
    addMatches(errors, file, source, sideEffectImports, (match) => {
      const moduleName = match[1] ?? "<unknown>";
      return forbiddenModule.test(moduleName)
        ? `MDX must reference visualizations by ID, not import ${moduleName}`
        : "";
    });
    const dynamicImports = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
    addMatches(errors, file, source, dynamicImports, (match) => {
      const moduleName = match[1] ?? "<unknown>";
      return forbiddenModule.test(moduleName)
        ? `MDX must not dynamically import visualization implementation ${moduleName}`
        : "";
    });
  }
  for (let index = errors.length - 1; index >= 0; index -= 1) {
    if (errors[index]?.message === "") errors.splice(index, 1);
  }
}

async function existingSourceFiles(paths: readonly string[]): Promise<string[]> {
  const files: string[] = [];
  for (const path of paths) files.push(...(await walkFiles(path, sourceExtensions)));
  return files;
}

async function checkCoreSource(errors: ArchitectureError[]): Promise<void> {
  const roots = [
    join(repositoryRoot, "apps/web/app"),
    join(repositoryRoot, "apps/web/components"),
    join(repositoryRoot, "apps/web/lib"),
    join(repositoryRoot, "packages/search/src"),
    join(repositoryRoot, "packages/knowledge-graph/src"),
    join(repositoryRoot, "packages/ui/src"),
  ];
  const knownIds = [
    ...domainRegistry.list().map((domain) => domain.id),
    ...subjectRegistry.list().map((subject) => subject.id),
  ];
  const escapedIds = knownIds
    .sort((left, right) => right.length - left.length)
    .map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const comparison = new RegExp(
    `\\b(?:domain|domainId|subject|subjectId)\\b\\s*(?:===|==|!==|!=)\\s*["'](${escapedIds})["']|["'](${escapedIds})["']\\s*(?:===|==|!==|!=)\\s*\\b(?:domain|domainId|subject|subjectId)\\b`,
    "g",
  );
  const switchPattern = new RegExp(
    `switch\\s*\\([^)]*\\b(?:domain|domainId|subject|subjectId)\\b[^)]*\\)\\s*\\{[\\s\\S]{0,3000}?case\\s*["'](${escapedIds})["']`,
    "g",
  );

  for (const path of await existingSourceFiles(roots)) {
    const source = await readFile(path, "utf8");
    const file = fileLabel(path);
    addMatches(
      errors,
      file,
      source,
      comparison,
      (match) =>
        `Core source hard-codes domain/subject condition ${JSON.stringify(match[1] ?? match[2])}; query the registry instead`,
    );
    addMatches(
      errors,
      file,
      source,
      switchPattern,
      (match) =>
        `Core source switches on registered domain/subject ${JSON.stringify(match[1])}; use an extension point`,
    );
    addMatches(
      errors,
      file,
      source,
      /(?:from\s*|require\(\s*)["'](?:node:)?fs(?:\/promises)?["']/g,
      () => "Core pages and UI must use ContentRepository instead of traversing the filesystem",
    );
    if (!file.startsWith("packages/config/")) {
      addMatches(
        errors,
        file,
        source,
        /["']https:\/\/(?:www\.)?one-forth\.com(?:\/[^"']*)?["']/g,
        () => "Production origin must come from siteConfig",
      );
    }
    if (file.startsWith("apps/web/app/")) {
      addMatches(
        errors,
        file,
        source,
        /from\s*["']@one-forth\/(?:math-core|numerical|physics)["']/g,
        (match) =>
          `Route modules must not couple directly to a subject algorithm package (${match[0]})`,
      );
    }
  }
}

async function checkPackageBoundaries(errors: ArchitectureError[]): Promise<void> {
  const packageRoots = await walkFiles(join(repositoryRoot, "packages"), new Set([".json"]));
  const manifests = packageRoots.filter((path) => basename(path) === "package.json");
  const lowLevelPackages = new Set([
    "@one-forth/math-core",
    "@one-forth/numerical",
    "@one-forth/physics",
    "@one-forth/simulation-runtime",
  ]);
  const forbiddenLowLevel = new Set([
    "next",
    "react",
    "react-dom",
    "@one-forth/content",
    "@one-forth/knowledge-graph",
    "@one-forth/search",
    "@one-forth/ui",
    "@one-forth/visualization",
    "@one-forth/web",
  ]);

  for (const manifestPath of manifests) {
    const file = fileLabel(manifestPath);
    let manifest: {
      readonly name?: string;
      readonly dependencies?: Readonly<Record<string, string>>;
      readonly devDependencies?: Readonly<Record<string, string>>;
    };
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8")) as typeof manifest;
    } catch (error) {
      errors.push({ file, message: `Invalid package manifest: ${errorMessage(error)}` });
      continue;
    }
    const dependencies = Object.keys(manifest.dependencies ?? {});
    if (dependencies.includes("@one-forth/web")) {
      errors.push({ file, message: "Reusable packages must not depend on the web application" });
    }
    if (manifest.name && lowLevelPackages.has(manifest.name)) {
      for (const dependency of dependencies) {
        if (forbiddenLowLevel.has(dependency)) {
          errors.push({
            file,
            message: `${manifest.name} must not depend on upper layer ${dependency}`,
          });
        }
      }
    }
    if (manifest.name === "@one-forth/ui") {
      for (const dependency of dependencies) {
        if (
          ["@one-forth/math-core", "@one-forth/numerical", "@one-forth/physics"].includes(
            dependency,
          )
        ) {
          errors.push({
            file,
            message: `Generic UI must not own subject algorithm dependency ${dependency}`,
          });
        }
      }
    }
  }
}

function clientImportSpecifiers(source: string): readonly string[] {
  const specifiers = new Set<string>();
  const staticImports =
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"'\n;]+?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImports = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
  for (const pattern of [staticImports, dynamicImports]) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const specifier = match[1];
      if (specifier) specifiers.add(specifier);
    }
  }
  return [...specifiers];
}

function resolveWebImport(
  importer: string,
  specifier: string,
  webRoot: string,
  sourceFiles: ReadonlySet<string>,
): string | null {
  const base = specifier.startsWith("@/")
    ? resolve(webRoot, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(importer), specifier)
      : null;
  if (!base) return null;
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
    join(base, "index.js"),
    join(base, "index.jsx"),
  ];
  return candidates.find((candidate) => sourceFiles.has(candidate)) ?? null;
}

async function checkClientDependencyClosures(errors: ArchitectureError[]): Promise<void> {
  const webRoot = join(repositoryRoot, "apps/web");
  const roots = ["app", "components", "features", "lib", "worker"].map((directory) =>
    join(webRoot, directory),
  );
  const files = await existingSourceFiles(roots);
  const sources = new Map<string, string>();
  await Promise.all(
    files.map(async (file) => {
      sources.set(file, await readFile(file, "utf8"));
    }),
  );
  const sourceFiles = new Set(sources.keys());
  const graph = new Map<string, readonly string[]>();
  for (const [file, source] of sources) {
    graph.set(
      file,
      clientImportSpecifiers(source).flatMap((specifier) => {
        const target = resolveWebImport(file, specifier, webRoot, sourceFiles);
        return target ? [target] : [];
      }),
    );
  }

  const clientRoots = [...sources.entries()]
    .filter(([, source]) => /^\s*["']use client["'];/u.test(source))
    .map(([file]) => file);
  const visited = new Set<string>();
  const pending = [...clientRoots];
  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    const source = sources.get(file) ?? "";
    if (/\bfrom\s*["']@one-forth\/content["']/u.test(source)) {
      errors.push({
        file: fileLabel(file),
        message:
          "Client dependency closure must not import the full content repository; pass compact server data instead",
      });
    }
    if (/\bfrom\s*["']@\/lib\/labels["']/u.test(source)) {
      errors.push({
        file: fileLabel(file),
        message:
          "Client dependency closure must use client-labels instead of the content-backed label module",
      });
    }
    pending.push(...(graph.get(file) ?? []));
  }
}

async function checkSearchClientBoundary(errors: ArchitectureError[]): Promise<void> {
  const path = join(repositoryRoot, "packages/search/src/client.ts");
  const source = await readFile(path, "utf8");
  addMatches(
    errors,
    fileLabel(path),
    source,
    /(?:from\s*|import\s*|import\(\s*|require\(\s*)["']@one-forth\/content(?:\/[^"']*)?["']/gu,
    () =>
      "The @one-forth/search/client entry must remain independent of the content package and generated editorial data",
  );
}

async function main(): Promise<void> {
  const errors: ArchitectureError[] = [];
  await checkMdxImports(errors);
  await checkCoreSource(errors);
  await checkPackageBoundaries(errors);
  await checkClientDependencyClosures(errors);
  await checkSearchClientBoundary(errors);

  const unique = new Map<string, ArchitectureError>();
  errors.forEach((error) => unique.set(`${error.file}\0${error.message}`, error));
  const sorted = [...unique.values()].sort((left, right) =>
    `${left.file}\0${left.message}`.localeCompare(`${right.file}\0${right.message}`, "en"),
  );
  if (sorted.length > 0) {
    sorted.forEach((error) => console.error(`ERROR ${error.file}: ${error.message}`));
    throw new Error(`Architecture checks failed with ${sorted.length} error(s)`);
  }
  console.log(
    "Architecture checks passed: registry boundaries, core subject neutrality, MDX visualization isolation, search client isolation, client payload isolation, and package dependency direction.",
  );
}

main().catch((error: unknown) => {
  console.error(`test-architecture: ${errorMessage(error)}`);
  process.exitCode = 1;
});
