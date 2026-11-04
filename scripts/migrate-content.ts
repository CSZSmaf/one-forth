import { readFile, writeFile } from "node:fs/promises";
import { contentFrontmatterSchema } from "../packages/content/src/index.ts";
import {
  contentRoot,
  currentContentSchemaVersion,
  displayPath,
  errorMessage,
  parseMdx,
  renderMdx,
  walkFiles,
} from "./lib/content-files.ts";
import { contentMigrations } from "./migrations/index.ts";

const usage = `Usage: pnpm migrate:content -- [--check | --write]

  no flag   Preview required migrations without changing files
  --check   Fail if any document is not on the current schema version
  --write   Apply registered migrations and rewrite affected frontmatter
`;

function migrationMap(): ReadonlyMap<number, (typeof contentMigrations)[number]> {
  const migrations = new Map<number, (typeof contentMigrations)[number]>();
  for (const migration of contentMigrations) {
    if (
      !Number.isInteger(migration.from) ||
      !Number.isInteger(migration.to) ||
      migration.to <= migration.from
    ) {
      throw new Error(`Invalid migration ${migration.from} -> ${migration.to}`);
    }
    if (migrations.has(migration.from))
      throw new Error(`Multiple migrations start at schema v${migration.from}`);
    migrations.set(migration.from, migration);
  }
  return migrations;
}

function schemaVersion(frontmatter: Readonly<Record<string, unknown>>): number {
  const value = frontmatter.schemaVersion;
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0) {
    throw new Error("schemaVersion must be a non-negative integer");
  }
  return value;
}

function migrate(
  initial: Readonly<Record<string, unknown>>,
  migrations: ReadonlyMap<number, (typeof contentMigrations)[number]>,
): { readonly frontmatter: Record<string, unknown>; readonly steps: readonly string[] } {
  let version = schemaVersion(initial);
  if (version > currentContentSchemaVersion) {
    throw new Error(
      `schema v${version} is newer than supported v${currentContentSchemaVersion}; update the tool before editing this document`,
    );
  }
  let frontmatter = structuredClone(initial);
  const steps: string[] = [];
  while (version < currentContentSchemaVersion) {
    const migration = migrations.get(version);
    if (!migration) {
      throw new Error(
        `No registered migration from schema v${version}; add one in scripts/migrations/index.ts`,
      );
    }
    frontmatter = migration.migrate(frontmatter);
    const resultVersion = schemaVersion(frontmatter);
    if (resultVersion !== migration.to) {
      throw new Error(
        `Migration v${migration.from} -> v${migration.to} produced schemaVersion ${resultVersion}`,
      );
    }
    steps.push(`v${migration.from} -> v${migration.to}: ${migration.description}`);
    version = migration.to;
  }
  return { frontmatter, steps };
}

async function main(): Promise<void> {
  // pnpm versions differ on whether the conventional separator is forwarded.
  const arguments_ = new Set(process.argv.slice(2).filter((argument) => argument !== "--"));
  if (arguments_.has("--help")) {
    console.log(usage);
    return;
  }
  const unknown = [...arguments_].filter(
    (argument) => argument !== "--check" && argument !== "--write",
  );
  if (unknown.length > 0) throw new Error(`Unknown option(s): ${unknown.join(", ")}\n${usage}`);
  if (arguments_.has("--check") && arguments_.has("--write")) {
    throw new Error("Choose either --check or --write, not both");
  }

  const checkOnly = arguments_.has("--check");
  const write = arguments_.has("--write");
  const migrations = migrationMap();
  const files = await walkFiles(contentRoot, new Set([".mdx"]));
  let pending = 0;
  let written = 0;
  const diagnostics: string[] = [];

  for (const file of files) {
    const label = displayPath(file);
    try {
      const source = await readFile(file, "utf8");
      const document = parseMdx(source, label);
      const result = migrate(document.frontmatter, migrations);
      const finalValidation = contentFrontmatterSchema.safeParse(result.frontmatter);
      if (!finalValidation.success) {
        const detail = finalValidation.error.issues
          .map((issue) => `${issue.path.map(String).join(".") || "frontmatter"}: ${issue.message}`)
          .join("; ");
        throw new Error(`migrated frontmatter does not satisfy the current schema: ${detail}`);
      }
      if (result.steps.length === 0) continue;
      pending += 1;
      console.log(`${label}: ${result.steps.join("; ")}`);
      if (write) {
        await writeFile(file, renderMdx(finalValidation.data, document.body), "utf8");
        written += 1;
      }
    } catch (error) {
      diagnostics.push(`${label}: ${errorMessage(error)}`);
    }
  }

  if (diagnostics.length > 0) {
    diagnostics.forEach((diagnostic) => console.error(`ERROR ${diagnostic}`));
    throw new Error(`Migration inspection failed for ${diagnostics.length} document(s)`);
  }
  if (checkOnly && pending > 0) {
    throw new Error(`${pending} document(s) require a content schema migration`);
  }
  if (write) {
    console.log(`Applied migrations to ${written} document(s). Run pnpm validate:content next.`);
  } else if (pending > 0) {
    console.log(
      `${pending} document(s) would change. Re-run with --write after reviewing the migration code.`,
    );
  } else {
    console.log(
      `All ${files.length} content document(s) already use schema v${currentContentSchemaVersion}.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(`migrate-content: ${errorMessage(error)}`);
  process.exitCode = 1;
});
