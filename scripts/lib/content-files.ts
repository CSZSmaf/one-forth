import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  contentFrontmatterSchema,
  type ContentFrontmatter,
  type ContentDocument,
} from "../../packages/content/src/content-schema.ts";
import {
  isSupportedLocale,
  supportedLocales,
  type SupportedLocale,
} from "../../packages/config/src/index.ts";
import { parseYaml, stringifyYaml } from "./yaml.ts";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = resolve(currentDirectory, "../..");
export const contentRoot = join(repositoryRoot, "content");
export const generatedContentPath = join(repositoryRoot, "packages/content/src/generated.ts");
export const currentContentSchemaVersion = 3;

export interface Diagnostic {
  readonly file: string;
  readonly message: string;
}

export interface ParsedMdx {
  readonly frontmatter: Record<string, unknown>;
  readonly body: string;
  readonly bodyStartLine: number;
  readonly normalizedSource: string;
}

export interface LoadedContentDocument extends ContentDocument {
  readonly sourcePath: string;
  readonly relativePath: string;
  readonly bodyStartLine: number;
}

export interface LoadContentResult {
  readonly documents: readonly LoadedContentDocument[];
  readonly diagnostics: readonly Diagnostic[];
}

export function toPosixPath(value: string): string {
  return value.split(sep).join("/");
}

export function displayPath(value: string): string {
  const path = relative(repositoryRoot, value);
  return toPosixPath(path || ".");
}

export async function walkFiles(root: string, extensions?: ReadonlySet<string>): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath, extensions)));
    } else if (
      entry.isFile() &&
      (!extensions || extensions.has(extname(entry.name).toLowerCase()))
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

export function parseMdx(source: string, file = "<content>"): ParsedMdx {
  const normalizedSource = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalizedSource.split("\n");
  if (lines[0]?.trim() !== "---") {
    throw new Error(`${file}: MDX must start with a YAML frontmatter delimiter (---)`);
  }
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingIndex < 0)
    throw new Error(`${file}: frontmatter is missing its closing --- delimiter`);

  const yamlSource = lines.slice(1, closingIndex).join("\n");
  let frontmatter: Record<string, unknown>;
  try {
    frontmatter = parseYaml(yamlSource);
  } catch (error) {
    throw new Error(`${file}: ${errorMessage(error)}`, { cause: error });
  }

  const bodyLines = lines.slice(closingIndex + 1);
  let bodyStartLine = closingIndex + 2;
  if (bodyLines[0] === "") {
    bodyLines.shift();
    bodyStartLine += 1;
  }
  const body = bodyLines.join("\n");
  return { frontmatter, body, bodyStartLine, normalizedSource };
}

export function renderMdx(frontmatter: object, body: string): string {
  const normalizedBody = body.replace(/\r\n?/g, "\n").replace(/^\n+/, "");
  const ending = normalizedBody.endsWith("\n") ? normalizedBody : `${normalizedBody}\n`;
  return `---\n${stringifyYaml(Object.fromEntries(Object.entries(frontmatter)))}---\n\n${ending}`;
}

function documentCoordinates(
  sourcePath: string,
  frontmatter: ContentFrontmatter,
): { readonly locale: SupportedLocale; readonly slug: readonly string[] } {
  const relativePath = toPosixPath(relative(contentRoot, sourcePath));
  const segments = relativePath.split("/");
  const localeValue = segments.shift();
  if (!localeValue || !isSupportedLocale(localeValue)) {
    throw new Error(
      `${relativePath}: localized MDX must be under one of: ${supportedLocales.join(", ")}`,
    );
  }

  const last = segments.pop();
  if (!last) throw new Error(`${relativePath}: content path must include a file name`);
  const baseName = last.slice(0, -extname(last).length);
  if (baseName !== "index" || segments.length === 0) segments.push(baseName);
  if (segments.some((segment) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment))) {
    throw new Error(`${relativePath}: slug segments must use kebab-case`);
  }
  if (segments.length === 0) throw new Error(`${relativePath}: content slug cannot be empty`);

  const pathDomain = segments[0];
  if (pathDomain !== frontmatter.domain) {
    throw new Error(
      `${relativePath}: path domain ${JSON.stringify(pathDomain)} does not match frontmatter.domain ${JSON.stringify(frontmatter.domain)}`,
    );
  }
  return { locale: localeValue, slug: segments };
}

function zodDiagnostics(
  file: string,
  issues: readonly { readonly path: PropertyKey[]; readonly message: string }[],
): Diagnostic[] {
  return issues.map((issue) => ({
    file,
    message: `${issue.path.length > 0 ? issue.path.map(String).join(".") : "frontmatter"}: ${issue.message}`,
  }));
}

export async function loadContentDocuments(): Promise<LoadContentResult> {
  const sourcePaths = await walkFiles(contentRoot, new Set([".mdx"]));
  const documents: LoadedContentDocument[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const sourcePath of sourcePaths) {
    const file = displayPath(sourcePath);
    try {
      const raw = await readFile(sourcePath, "utf8");
      const parsed = parseMdx(raw, file);
      if (parsed.frontmatter.schemaVersion !== currentContentSchemaVersion) {
        diagnostics.push({
          file,
          message: `schemaVersion: expected ${currentContentSchemaVersion}; run pnpm migrate:content for older documents`,
        });
        continue;
      }
      const validation = contentFrontmatterSchema.safeParse(parsed.frontmatter);
      if (!validation.success) {
        diagnostics.push(...zodDiagnostics(file, validation.error.issues));
        continue;
      }
      const coordinates = documentCoordinates(sourcePath, validation.data);
      const documentId = `${coordinates.locale}/${validation.data.id}`;
      const normalizedSource = parsed.normalizedSource.endsWith("\n")
        ? parsed.normalizedSource
        : `${parsed.normalizedSource}\n`;
      documents.push({
        sourcePath,
        relativePath: file,
        bodyStartLine: parsed.bodyStartLine,
        documentId,
        locale: coordinates.locale,
        slug: coordinates.slug,
        url: `/${coordinates.locale}/learn/${coordinates.slug.join("/")}`,
        hash: createHash("sha256").update(normalizedSource, "utf8").digest("hex"),
        frontmatter: validation.data,
        body: parsed.body,
      });
    } catch (error) {
      diagnostics.push({ file, message: errorMessage(error) });
    }
  }

  documents.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en"));
  return { documents, diagnostics };
}

export function documentForGeneration(document: LoadedContentDocument): ContentDocument {
  return {
    documentId: document.documentId,
    locale: document.locale,
    slug: document.slug,
    url: document.url,
    hash: document.hash,
    frontmatter: document.frontmatter,
    body: document.body,
  };
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
