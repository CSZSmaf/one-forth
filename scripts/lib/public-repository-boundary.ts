/**
 * These exports expose the complete editorial corpus. Public routes must use
 * the publication-filtered public facades or hidden-filtered reader facades
 * instead. Keep this list explicit so type imports and publication helpers
 * from @one-forth/content remain valid.
 */
const forbiddenEditorialRepositoryBindings = new Set([
  "conceptById",
  "contentRepository",
  "curriculumRepository",
]);

export interface ContentPackageImport {
  readonly binding: string;
  readonly match: string;
}

export function findForbiddenContentPackageImports(
  source: string,
): readonly ContentPackageImport[] {
  const imports: ContentPackageImport[] = [];
  const namedImportPattern =
    /\b(?:import|export)\s+(type\s+)?\{([^}]*)\}\s+from\s*["']@one-forth\/content["']/gu;
  let namedMatch: RegExpExecArray | null;
  while ((namedMatch = namedImportPattern.exec(source)) !== null) {
    if (namedMatch[1]) continue;
    const clause = namedMatch[2] ?? "";
    for (const rawBinding of clause.split(",")) {
      const binding = rawBinding
        .replace(/\/\*[\s\S]*?\*\//gu, "")
        .trim()
        .replace(/^type\s+/u, "")
        .split(/\s+as\s+/u)[0];
      if (binding && forbiddenEditorialRepositoryBindings.has(binding)) {
        imports.push({ binding, match: rawBinding.trim() });
      }
    }
  }

  const namespaceImportPattern =
    /\bimport\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*["']@one-forth\/content["']/gu;
  let namespaceMatch: RegExpExecArray | null;
  while ((namespaceMatch = namespaceImportPattern.exec(source)) !== null) {
    imports.push({
      binding: namespaceMatch[1] ?? "namespace",
      match: namespaceMatch[0],
    });
  }

  const dynamicImportPattern = /\bimport\(\s*["']@one-forth\/content["']\s*\)/gu;
  let dynamicMatch: RegExpExecArray | null;
  while ((dynamicMatch = dynamicImportPattern.exec(source)) !== null) {
    imports.push({ binding: "dynamic-import", match: dynamicMatch[0] });
  }
  return imports;
}
