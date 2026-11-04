import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const anchorPrefixByComponent = {
  Definition: "definition",
  Theorem: "theorem",
  Lemma: "lemma",
  Proof: "proof",
  Example: "example",
} as const;

type AnchoredComponent = keyof typeof anchorPrefixByComponent;

export function addSemanticAnchorIds(source: string): string {
  const conceptId = /^conceptId:\s*([a-z0-9-]+)\s*$/m.exec(source)?.[1];
  if (!conceptId) throw new Error("MDX frontmatter is missing a valid conceptId");

  const counts = new Map<AnchoredComponent, number>();
  return source.replace(
    /<(Definition|Theorem|Lemma|Proof|Example)\b([^>]*?)>/g,
    (match: string, component: AnchoredComponent, attributes: string) => {
      if (/\bid\s*=/.test(attributes)) return match;
      const count = (counts.get(component) ?? 0) + 1;
      counts.set(component, count);
      const prefix = anchorPrefixByComponent[component];
      return `<${component} id="${prefix}-${conceptId}-${count}"${attributes}>`;
    },
  );
}

async function mdxFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return mdxFiles(absolute);
      return entry.isFile() && entry.name.endsWith(".mdx") ? [absolute] : [];
    }),
  );
  return nested.flat().sort((left, right) => left.localeCompare(right));
}

async function main(): Promise<void> {
  const contentRoot = path.resolve("content");
  const files = await mdxFiles(contentRoot);
  let changed = 0;
  for (const file of files) {
    const before = await readFile(file, "utf8");
    const after = addSemanticAnchorIds(before);
    if (after === before) continue;
    await writeFile(file, after, "utf8");
    changed += 1;
  }
  console.log(`Semantic anchor migration updated ${changed} of ${files.length} MDX file(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
