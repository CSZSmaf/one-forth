import GithubSlugger from "github-slugger";

export interface HeadingAnchor {
  readonly offset: number;
  readonly level: 2 | 3;
  readonly title: string;
  readonly id: string;
}

function isEscaped(value: string, index: number): boolean {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function plainInlineMath(latex: string): string {
  return latex
    .replace(/\\sqrt\s*\{([^{}]*)\}/gu, "√($1)")
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/gu, "($1)/($2)")
    .replace(
      /\\(?:mathbf|boldsymbol|mathrm|mathsf|mathcal|mathbb|operatorname|text)\s*\{([^{}]*)\}/gu,
      "$1",
    )
    .replace(/\\([A-Za-z]+)/gu, "$1")
    .replace(/_\{([^{}]+)\}/gu, "_$1")
    .replace(/\^\{([^{}]+)\}/gu, "^$1")
    .replace(/[{}]/gu, "")
    .replace(/\\[,;!]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Match the text seen by `hast-util-to-string` before rehype-slug while also
 * producing a readable string for the article table of contents. Inline math
 * keeps its TeX source for slugging (notably `_` in subscripts), but the TOC
 * receives a compact plain-math rendering instead of raw `$...$` delimiters.
 */
function headingText(value: string): { readonly slugText: string; readonly displayText: string } {
  const slugParts: string[] = [];
  const displayParts: string[] = [];
  let cursor = 0;

  const append = (slugText: string, displayText = slugText): void => {
    slugParts.push(slugText);
    displayParts.push(displayText);
  };

  while (cursor < value.length) {
    const current = value[cursor] ?? "";
    if ((current === "$" || current === "`") && !isEscaped(value, cursor)) {
      const delimiter = current;
      let end = cursor + 1;
      while (end < value.length) {
        if (value[end] === delimiter && !isEscaped(value, end)) break;
        end += 1;
      }
      if (end < value.length) {
        const inner = value.slice(cursor + 1, end);
        append(inner, delimiter === "$" ? plainInlineMath(inner) : inner);
        cursor = end + 1;
        continue;
      }
    }
    if (current === "<") {
      const end = value.indexOf(">", cursor + 1);
      if (end >= 0) {
        const tag = value.slice(cursor + 1, end);
        if (/^https?:\/\//iu.test(tag)) append(tag);
        cursor = end + 1;
        continue;
      }
    }
    if (
      current === "\\" &&
      cursor + 1 < value.length &&
      /[\\`*_[\]{}()#+.!~>-]/u.test(value[cursor + 1] ?? "")
    ) {
      append(value[cursor + 1] ?? "");
      cursor += 2;
      continue;
    }
    // Markdown emphasis markers are not text nodes. Math/code was consumed
    // above, so an underscore in d_k is never removed here.
    if (current === "*" || current === "_" || current === "~") {
      cursor += 1;
      continue;
    }
    append(current);
    cursor += 1;
  }

  const clean = (text: string) =>
    text
      .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
      .replace(/\s+/gu, " ")
      .trim();
  return { slugText: clean(slugParts.join("")), displayText: clean(displayParts.join("")) };
}

/**
 * Build the exact heading IDs emitted by rehype-slug. Keeping the stateful
 * slugger here also preserves the -1/-2 suffixes used for duplicate headings.
 */
export function collectHeadingAnchors(markdown: string): readonly HeadingAnchor[] {
  const slugger = new GithubSlugger();
  return [...markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((match) => {
    const rawTitle = (match[2] ?? "").replace(/[ \t]+#+[ \t]*$/u, "");
    const { slugText, displayText: title } = headingText(rawTitle);
    return {
      offset: match.index ?? 0,
      level: match[1]?.length === 3 ? 3 : 2,
      title,
      id: slugger.slug(slugText),
    };
  });
}

export function slugifyHeading(value: string): string {
  return new GithubSlugger().slug(headingText(value).slugText);
}
