import { access } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "../packages/config/src/index.ts";
import {
  conceptCatalog,
  equations,
  learningPaths,
  resources,
  symbols,
  teachingFigures,
  paperFigures,
} from "../packages/content/src/index.ts";
import { visualizationManifest } from "../packages/visualization/src/index.ts";
import {
  errorMessage,
  loadContentDocuments,
  repositoryRoot,
  type LoadedContentDocument,
} from "./lib/content-files.ts";

interface LinkError {
  readonly location: string;
  readonly message: string;
}

function staticAttribute(source: string, names: readonly string[]): string | null {
  for (const name of names) {
    const pattern = new RegExp(
      `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|\\{\\s*"([^"]+)"\\s*\\}|\\{\\s*'([^']+)'\\s*\\})`,
      "m",
    );
    const match = pattern.exec(source);
    const value = match?.slice(1).find((candidate) => candidate !== undefined);
    if (value) return value;
  }
  return null;
}

function componentReferences(
  body: string,
  component: string,
  attributes: readonly string[],
): readonly { readonly value: string | null; readonly offset: number }[] {
  const pattern = new RegExp(`<${component}\\b([^>]*)>`, "g");
  return [...body.matchAll(pattern)].map((match) => ({
    value: staticAttribute(match[1] ?? "", attributes),
    offset: match.index ?? 0,
  }));
}

function lineAt(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

function validateIdentifierReferences(document: LoadedContentDocument, errors: LinkError[]): void {
  const conceptIds = currentConceptIds;
  const checks = [
    { component: "ConceptLink", attributes: ["conceptId", "id", "target"], values: conceptIds },
    {
      component: "InteractiveFigure",
      attributes: ["id", "visualizationId"],
      values: visualizationIds,
    },
    { component: "ResourceCard", attributes: ["resourceId", "id"], values: resourceIds },
    { component: "Citation", attributes: ["resourceId", "id"], values: resourceIds },
    { component: "Equation", attributes: ["equationId", "id"], values: equationIds },
    { component: "Symbol", attributes: ["symbolId", "id"], values: symbolIds },
    { component: "TeachingFigure", attributes: ["id"], values: teachingFigureIds },
    { component: "PaperFigure", attributes: ["id"], values: paperFigureIds },
  ] as const;

  for (const check of checks) {
    for (const reference of componentReferences(document.body, check.component, check.attributes)) {
      const location = `${document.relativePath}:${document.bodyStartLine + lineAt(document.body, reference.offset) - 1}`;
      if (!reference.value) {
        errors.push({
          location,
          message: `${check.component} must use a static ${check.attributes.join("/")} reference`,
        });
      } else if (!check.values.has(reference.value)) {
        errors.push({
          location,
          message: `${check.component} references unknown ID: ${reference.value}`,
        });
      }
    }
  }
}

function markdownTargets(
  body: string,
): readonly { readonly target: string; readonly offset: number }[] {
  const targets: { target: string; offset: number }[] = [];
  const markdown = /(?<!!)\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/g;
  for (const match of body.matchAll(markdown)) {
    const target = match[1] ?? match[2];
    if (target) targets.push({ target, offset: match.index ?? 0 });
  }
  const jsx = /<(?:a|Link)\b([^>]*)>/g;
  for (const match of body.matchAll(jsx)) {
    const target = staticAttribute(match[1] ?? "", ["href"]);
    if (target) targets.push({ target, offset: match.index ?? 0 });
  }
  const autolink = /<(https?:\/\/[^>\s]+)>/g;
  for (const match of body.matchAll(autolink)) {
    const target = match[1];
    if (target) targets.push({ target, offset: match.index ?? 0 });
  }
  return targets;
}

function validExternalUrl(value: string): { readonly valid: boolean; readonly reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { valid: false, reason: "malformed URL" };
  }
  if (parsed.protocol !== "https:")
    return { valid: false, reason: "external links must use HTTPS" };
  if (!parsed.hostname || parsed.username || parsed.password) {
    return { valid: false, reason: "URL must have a host and must not contain credentials" };
  }
  if (/^(?:example\.(?:com|org|net)|localhost)$/i.test(parsed.hostname)) {
    return { valid: false, reason: "placeholder or local hosts are not publishable resources" };
  }
  return { valid: true };
}

function resolveInternalTarget(document: LoadedContentDocument, target: string): string | null {
  if (target.startsWith("#") || target.startsWith("?") || target === "") return null;
  const parsed = new URL(target, `https://one-forth.invalid${document.url}`);
  return parsed.pathname.replace(/\/$/, "") || "/";
}

async function validateBodyLinks(
  document: LoadedContentDocument,
  errors: LinkError[],
): Promise<void> {
  for (const reference of markdownTargets(document.body)) {
    const location = `${document.relativePath}:${document.bodyStartLine + lineAt(document.body, reference.offset) - 1}`;
    const target = reference.target.trim();
    if (/^(?:mailto|tel):/i.test(target)) continue;
    if (/^https?:\/\//i.test(target)) {
      const external = validExternalUrl(target);
      if (!external.valid) errors.push({ location, message: `${external.reason}: ${target}` });
      try {
        const url = new URL(target);
        if (url.hostname === siteConfig.domain || url.hostname === `www.${siteConfig.domain}`) {
          errors.push({
            location,
            message: `Use a site-relative internal link instead of ${target}`,
          });
        }
      } catch {
        // The malformed URL was already diagnosed above.
      }
      continue;
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(target)) {
      errors.push({ location, message: `Unsupported link protocol: ${target}` });
      continue;
    }

    let path: string;
    try {
      path = resolveInternalTarget(document, target) ?? "";
    } catch {
      errors.push({ location, message: `Malformed internal link: ${target}` });
      continue;
    }
    if (!path || knownInternalPaths.has(path)) continue;

    const localeMatch = /^\/(zh-CN|en)(?:\/|$)/.exec(path);
    if (/^\/(?:zh-CN|en)\/learn\//.test(path)) {
      errors.push({ location, message: `Broken content link: ${target}` });
    } else if (localeMatch) {
      errors.push({ location, message: `Unknown internal route or registry ID: ${target}` });
    } else if (path.startsWith("/")) {
      const publicAsset = join(repositoryRoot, "apps/web/public", path.slice(1));
      try {
        await access(publicAsset);
      } catch {
        errors.push({
          location,
          message: `Missing public asset or unsupported root route: ${target}`,
        });
      }
    }
  }
}

function isValidDoi(value: string): boolean {
  if (/^10\.\d{4,9}\/\S+$/i.test(value)) return true;
  const external = validExternalUrl(value);
  if (!external.valid) return false;
  const url = new URL(value);
  return /^(?:dx\.)?doi\.org$/i.test(url.hostname) && /^\/10\.\d{4,9}\/.+/.test(url.pathname);
}

function isValidArxiv(value: string): boolean {
  const identifier = /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?$/i;
  if (identifier.test(value)) return true;
  const external = validExternalUrl(value);
  if (!external.valid) return false;
  const url = new URL(value);
  return /^(?:www\.)?arxiv\.org$/i.test(url.hostname) && /^\/(?:abs|pdf)\//.test(url.pathname);
}

function validateResourceUrls(errors: LinkError[]): void {
  for (const resource of resources) {
    const entries = Object.entries(resource.links).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    );
    if (entries.length === 0) {
      errors.push({
        location: `resource:${resource.id}`,
        message: "At least one verified resource URL is required",
      });
    }
    for (const [kind, value] of entries) {
      const valid =
        kind === "doi"
          ? isValidDoi(value)
          : kind === "arxiv"
            ? isValidArxiv(value)
            : validExternalUrl(value).valid;
      if (!valid)
        errors.push({
          location: `resource:${resource.id}`,
          message: `Invalid ${kind} URL or identifier: ${value}`,
        });
    }
  }
}

let currentConceptIds = new Set<string>();
const visualizationIds = new Set(visualizationManifest.map((entry) => entry.id));
const teachingFigureIds = new Set(teachingFigures.map((entry) => entry.id));
const paperFigureIds = new Set(paperFigures.map((entry) => entry.id));
const resourceIds = new Set(resources.map((resource) => resource.id));
const equationIds = new Set(equations.map((equation) => equation.id));
const symbolIds = new Set(symbols.map((symbol) => symbol.id));
let knownInternalPaths = new Set<string>();

async function main(): Promise<void> {
  const loaded = await loadContentDocuments();
  const errors: LinkError[] = loaded.diagnostics.map((diagnostic) => ({
    location: diagnostic.file,
    message: diagnostic.message,
  }));
  currentConceptIds = new Set(conceptCatalog.map((concept) => concept.id));
  const locales = ["zh-CN", "en"] as const;
  knownInternalPaths = new Set(["/", ...loaded.documents.map((document) => document.url)]);
  for (const locale of locales) {
    knownInternalPaths.add(`/${locale}`);
    for (const route of ["graph", "search", "playground", "design-system"]) {
      knownInternalPaths.add(`/${locale}/${route}`);
    }
    resources.forEach((resource) => knownInternalPaths.add(`/${locale}/resources/${resource.id}`));
    equations.forEach((equation) => knownInternalPaths.add(`/${locale}/equations/${equation.id}`));
    symbols.forEach((symbol) => knownInternalPaths.add(`/${locale}/symbols/${symbol.id}`));
    learningPaths.forEach((path) => knownInternalPaths.add(`/${locale}/paths/${path.id}`));
    conceptCatalog.forEach((concept) =>
      knownInternalPaths.add(`/${locale}/concepts/${concept.id}`),
    );
  }

  for (const document of loaded.documents) {
    validateIdentifierReferences(document, errors);
    await validateBodyLinks(document, errors);
  }
  validateResourceUrls(errors);

  const unique = new Map<string, LinkError>();
  errors.forEach((error) => unique.set(`${error.location}\0${error.message}`, error));
  const sorted = [...unique.values()].sort((left, right) =>
    `${left.location}\0${left.message}`.localeCompare(`${right.location}\0${right.message}`, "en"),
  );
  if (sorted.length > 0) {
    sorted.forEach((error) => console.error(`ERROR ${error.location}: ${error.message}`));
    throw new Error(`Link validation failed with ${sorted.length} error(s)`);
  }
  console.log(
    `Link validation passed: ${loaded.documents.length} document(s), ${resources.length} resource record(s).`,
  );
}

main().catch((error: unknown) => {
  console.error(`check-links: ${errorMessage(error)}`);
  process.exitCode = 1;
});
