import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readerCurriculumRedirects,
  type CurriculumRedirect,
} from "../../packages/content/src/index.ts";

const redirectsRoot = dirname(fileURLToPath(import.meta.url));
export const generatedRedirectsRoot = join(redirectsRoot, "generated");
export const redirectsJsonPath = join(generatedRedirectsRoot, "legacy-redirects.json");
export const redirectsTextPath = join(generatedRedirectsRoot, "_redirects");

export interface RedirectArtifactCounts {
  readonly total: number;
  readonly learn: number;
  readonly concept: number;
  readonly path: number;
  readonly books: number;
}

export function countRedirectArtifacts(
  redirects: readonly CurriculumRedirect[] = readerCurriculumRedirects,
): RedirectArtifactCounts {
  return {
    total: redirects.length,
    learn: redirects.filter((redirect) => redirect.kind === "legacy-learn").length,
    concept: redirects.filter((redirect) => redirect.kind === "legacy-concept").length,
    path: redirects.filter((redirect) => redirect.kind === "legacy-path").length,
    books: redirects.filter((redirect) => redirect.kind === "legacy-books").length,
  };
}

export function describeRedirectArtifacts(
  redirects: readonly CurriculumRedirect[] = readerCurriculumRedirects,
): string {
  const counts = countRedirectArtifacts(redirects);
  return `${counts.total} reader-safe deterministic single-hop mappings (${counts.learn} learn, ${counts.concept} concept, ${counts.path} path, ${counts.books} books)`;
}

export function serializeRedirectsJson(
  redirects: readonly CurriculumRedirect[] = readerCurriculumRedirects,
): string {
  return `${JSON.stringify({ schemaVersion: 1, permanent: true, redirects }, null, 2)}\n`;
}

export function serializeRedirectsText(
  redirects: readonly CurriculumRedirect[] = readerCurriculumRedirects,
): string {
  return `${redirects.map((redirect) => `${redirect.sourcePath} ${redirect.targetPath} 301`).join("\n")}\n`;
}

export async function writeRedirectArtifacts(): Promise<void> {
  await mkdir(generatedRedirectsRoot, { recursive: true });
  await Promise.all([
    writeFile(redirectsJsonPath, serializeRedirectsJson(), "utf8"),
    writeFile(redirectsTextPath, serializeRedirectsText(), "utf8"),
  ]);
}

export async function redirectArtifactsMatch(): Promise<boolean> {
  try {
    const [json, text] = await Promise.all([
      readFile(redirectsJsonPath, "utf8"),
      readFile(redirectsTextPath, "utf8"),
    ]);
    return json === serializeRedirectsJson() && text === serializeRedirectsText();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
