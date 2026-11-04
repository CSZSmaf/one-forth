import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { contentFrontmatterSchema, contentKindValues } from "../packages/content/src/index.ts";
import { isSupportedLocale, supportedLocales } from "../packages/config/src/index.ts";
import { domainRegistry, subjectRegistry } from "../packages/registry/src/index.ts";
import {
  contentRoot,
  displayPath,
  errorMessage,
  loadContentDocuments,
  renderMdx,
} from "./lib/content-files.ts";

type Options = Readonly<Record<string, string | boolean>>;

const usage = `Usage:
  pnpm new:topic -- --locale zh-CN --domain mathematics --subject linear-algebra \\
    --id eigenvalues --concept-id eigenvalues --title "特征值" \\
    --summary "用不变方向理解线性映射中的特征值与特征向量。" --author your-id

Options:
  --kind <kind>            Defaults to concept
  --level <level>          Defaults to undergraduate
  --difficulty <1-5>       Defaults to 2
  --minutes <positive int> Defaults to 30
  --translation-of <id>    Required for non-zh-CN documents
  --dry-run                Print the scaffold without writing it
  --help                   Show this help
`;

function parseOptions(arguments_: readonly string[]): Options {
  const options: Record<string, string | boolean> = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!argument?.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const equals = argument.indexOf("=");
    if (equals > 2) {
      options[argument.slice(2, equals)] = argument.slice(equals + 1);
      continue;
    }
    const name = argument.slice(2);
    const next = arguments_[index + 1];
    if (next && !next.startsWith("--")) {
      options[name] = next;
      index += 1;
    } else {
      options[name] = true;
    }
  }
  return options;
}

function option(options: Options, name: string): string | undefined {
  const value = options[name];
  return typeof value === "string" ? value.trim() : undefined;
}

function slugFromTitle(title: string): string {
  return title
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const interactive = Boolean(input.isTTY && output.isTTY);
  const prompts = interactive ? createInterface({ input, output }) : null;
  const ask = async (label: string, current?: string, fallback?: string): Promise<string> => {
    if (current) return current;
    if (!prompts) {
      if (fallback) return fallback;
      throw new Error(`Missing --${label}; non-interactive usage requires all fields\n${usage}`);
    }
    const suffix = fallback ? ` [${fallback}]` : "";
    const answer = (await prompts.question(`${label}${suffix}: `)).trim();
    const value = answer || fallback;
    if (!value) throw new Error(`${label} is required`);
    return value;
  };

  try {
    const locale = await ask("locale", option(options, "locale"), "zh-CN");
    if (!isSupportedLocale(locale))
      throw new Error(`locale must be one of: ${supportedLocales.join(", ")}`);
    const domain = await ask("domain", option(options, "domain"), domainRegistry.list()[0]?.id);
    if (!domainRegistry.has(domain)) {
      throw new Error(
        `Unknown domain ${domain}; choose: ${domainRegistry
          .list()
          .map((entry) => entry.id)
          .join(", ")}`,
      );
    }
    const availableSubjects = subjectRegistry.list().filter((entry) => entry.domainId === domain);
    const subject = await ask("subject", option(options, "subject"), availableSubjects[0]?.id);
    const subjectDefinition = subjectRegistry.get(subject);
    if (!subjectDefinition || subjectDefinition.domainId !== domain) {
      throw new Error(
        `Subject must belong to ${domain}; choose: ${availableSubjects.map((entry) => entry.id).join(", ")}`,
      );
    }

    const title = await ask("title", option(options, "title"));
    const id = await ask("id", option(options, "id"), slugFromTitle(title) || undefined);
    const conceptId = await ask("concept-id", option(options, "concept-id"), id);
    const summary = await ask("summary", option(options, "summary"));
    const author = await ask("author", option(options, "author"));
    const kind = await ask("kind", option(options, "kind"), "concept");
    const level = await ask("level", option(options, "level"), "undergraduate");
    const difficulty = Number(await ask("difficulty", option(options, "difficulty"), "2"));
    const estimatedMinutes = Number(await ask("minutes", option(options, "minutes"), "30"));
    const translationOf =
      locale === "zh-CN"
        ? undefined
        : await ask("translation-of", option(options, "translation-of"), conceptId);

    if (!contentKindValues.some((candidateKind) => candidateKind === kind)) {
      throw new Error(`Unknown content kind ${kind}; choose: ${contentKindValues.join(", ")}`);
    }

    const candidate: Record<string, unknown> = {
      schemaVersion: 3,
      id,
      conceptId,
      kind,
      title,
      shortTitle: title,
      summary,
      domain,
      subject,
      level,
      difficulty,
      estimatedMinutes,
      publicationStatus: "preview",
      editorialStatus: "draft",
      authors: [author],
      review: {
        mathematicalStatus: "pending",
        numericalStatus: "pending",
        sourceStatus: "pending",
        accessibilityStatus: "pending",
        humanReviewer: null,
      },
      revisionHistory: [],
      prerequisites: [],
      relations: [],
      learningObjectives: [`理解 ${title} 的核心定义、动机与适用边界`],
      tags: [conceptId],
      aliases: [],
      visualizations: [],
      resources: [],
      symbolNamespaces: [],
      ...(translationOf ? { translationOf, translationEditorialStatus: "draft" } : {}),
    };
    const validation = contentFrontmatterSchema.safeParse(candidate);
    if (!validation.success) {
      const details = validation.error.issues
        .map((issue) => `${issue.path.map(String).join(".") || "frontmatter"}: ${issue.message}`)
        .join("\n  - ");
      throw new Error(`Scaffold frontmatter is invalid:\n  - ${details}`);
    }

    const existing = await loadContentDocuments();
    if (existing.diagnostics.length > 0) {
      throw new Error(
        `Existing content has ${existing.diagnostics.length} parse/schema diagnostic(s); fix them before checking for duplicate topics`,
      );
    }
    const normalizedTitle = title.trim().toLocaleLowerCase(locale);
    for (const document of existing.documents) {
      if (document.locale === locale && document.frontmatter.id === id) {
        throw new Error(`Document ID already exists: ${locale}/${id}`);
      }
      if (document.locale === locale && document.frontmatter.conceptId === conceptId) {
        throw new Error(
          `Concept ${conceptId} already has a ${locale} document: ${document.relativePath}`,
        );
      }
      const names = [document.frontmatter.title, ...document.frontmatter.aliases].map((value) =>
        value.trim().toLocaleLowerCase(locale),
      );
      if (document.locale === locale && names.includes(normalizedTitle)) {
        throw new Error(`Title or alias already exists in ${document.relativePath}: ${title}`);
      }
    }

    const body = `## 为什么需要这个概念\n\nTODO：说明问题背景、适用范围与前置假设。\n\n## 直觉\n\nTODO：给出可核查的直觉解释；不要把动画当作证明。\n\n## 严格定义\n\nTODO：写出符号、定义域、假设与边界条件。\n\n## 推导或证明\n\nTODO：逐步给出推导，并说明每一步依据。\n\n## 例题与误区\n\nTODO：补充具体例题、反例与常见误区。\n\n## 练习\n\nTODO：设计可检验的练习。\n\n## 关系、资源与后续学习\n\nTODO：使用 ConceptLink、Citation 和资源 ID 建立可验证引用。\n`;
    const rendered = renderMdx(validation.data, body);
    const target = join(contentRoot, locale, domain, `${id}.mdx`);
    if (options["dry-run"]) {
      console.log(`# ${displayPath(target)}\n${rendered}`);
      return;
    }
    await mkdir(join(contentRoot, locale, domain), { recursive: true });
    await writeFile(target, rendered, { encoding: "utf8", flag: "wx" });
    console.log(`Created ${displayPath(target)} as draft. Complete every TODO before review.`);
  } finally {
    prompts?.close();
  }
}

main().catch((error: unknown) => {
  console.error(`new-topic: ${errorMessage(error)}`);
  process.exitCode = 1;
});
