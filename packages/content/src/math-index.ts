import type { LocalizedText } from "@one-forth/registry";
import type { ContentDocument } from "./content-schema";
import type { CurriculumDataset } from "./curriculum/types";
import { collectHeadingAnchors } from "./heading-slug";
import { extractMathFragments, maskCodeForMath } from "./math-source";

export type SymbolUnitKind = "physical" | "dimensionless" | "contextual" | "not-applicable";

export interface MathRecordLocation {
  readonly documentId: string;
  readonly chapterId: string;
  readonly anchorId: string;
}

export interface SymbolDefinitionV2 {
  readonly schemaVersion: 2;
  readonly id: string;
  readonly latex: string;
  readonly plainText: string;
  readonly accessibleLabel: LocalizedText;
  readonly meaning: LocalizedText;
  readonly namespace: string;
  readonly unitKind: SymbolUnitKind;
  readonly unit?: string;
  readonly assumptions: readonly string[];
  readonly aliases: readonly string[];
  readonly conflictsWith: readonly string[];
  readonly locations: readonly MathRecordLocation[];
}

export type SymbolDefinition = SymbolDefinitionV2;

export interface LegacySymbolDefinition {
  readonly id: string;
  readonly latex: string;
  readonly plainText: string;
  readonly accessibleLabel: LocalizedText;
  readonly meaning: LocalizedText;
  readonly namespace: string;
  readonly unit?: string;
  readonly assumptions?: readonly string[];
  readonly aliases?: readonly string[];
  readonly conflictsWith?: readonly string[];
}

export interface EquationVariable {
  readonly symbolId: string;
  readonly role: LocalizedText;
  readonly unit?: string;
}

export type EquationKind =
  | "definition"
  | "identity"
  | "law"
  | "constraint"
  | "update"
  | "canonical";

export interface EquationRecordV2 {
  readonly schemaVersion: 2;
  readonly id: string;
  readonly name: LocalizedText;
  readonly latex: string;
  readonly plainText: string;
  readonly accessibleLabel: LocalizedText;
  readonly variables: readonly EquationVariable[];
  readonly assumptions: readonly LocalizedText[];
  readonly domain: string;
  readonly subjects: readonly string[];
  readonly relatedTopics: readonly string[];
  readonly equationKind: EquationKind;
  readonly source?: MathRecordLocation;
  readonly derivations: readonly string[];
  readonly limitingCases: readonly string[];
  readonly applications: readonly string[];
}

export type EquationRecord = EquationRecordV2;

export interface LegacyEquationRecord {
  readonly id: string;
  readonly name: LocalizedText;
  readonly latex: string;
  readonly plainText: string;
  readonly accessibleLabel: LocalizedText;
  readonly variables: readonly EquationVariable[];
  readonly assumptions: readonly LocalizedText[];
  readonly domain: string;
  readonly subjects: readonly string[];
  readonly relatedTopics: readonly string[];
  readonly equationKind?: EquationKind;
  readonly derivations?: readonly string[];
  readonly limitingCases?: readonly string[];
  readonly applications?: readonly string[];
}

export interface ChapterMathCoverage {
  readonly chapterId: string;
  readonly contentId: string;
  readonly status: "indexed" | "not-applicable";
  readonly equationIds: readonly string[];
  readonly reason?: string;
}

export interface BookMathIndex {
  readonly schemaVersion: 1;
  readonly bookId: string;
  readonly equationIds: readonly string[];
  readonly symbolIds: readonly string[];
  readonly chapters: readonly ChapterMathCoverage[];
}

export interface BuiltMathIndex {
  readonly equations: readonly EquationRecord[];
  readonly symbols: readonly SymbolDefinition[];
  readonly books: readonly BookMathIndex[];
  readonly coverage: readonly ChapterMathCoverage[];
}

interface BuildMathIndexInput {
  readonly documents: readonly ContentDocument[];
  readonly curriculum: CurriculumDataset;
  readonly authoredEquations: readonly LegacyEquationRecord[];
  readonly authoredSymbols: readonly LegacySymbolDefinition[];
  readonly resolveTopicLocation: (topicId: string) => MathRecordLocation | undefined;
  readonly resolveTopicTitle: (topicId: string) => string | undefined;
  readonly requireAuthoredEquationReferences?: boolean;
}

const greekSymbols = new Set([
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "varepsilon",
  "zeta",
  "eta",
  "theta",
  "vartheta",
  "iota",
  "kappa",
  "lambda",
  "mu",
  "nu",
  "xi",
  "pi",
  "rho",
  "sigma",
  "tau",
  "upsilon",
  "phi",
  "varphi",
  "chi",
  "psi",
  "omega",
  "Gamma",
  "Delta",
  "Theta",
  "Lambda",
  "Xi",
  "Pi",
  "Sigma",
  "Phi",
  "Psi",
  "Omega",
  "ell",
  "hbar",
  "imath",
]);

const latexCommandsToIgnore = new Set([
  "begin",
  "end",
  "frac",
  "dfrac",
  "tfrac",
  "sqrt",
  "left",
  "right",
  "cdot",
  "times",
  "sum",
  "prod",
  "int",
  "iint",
  "iiint",
  "oint",
  "mathrm",
  "mathbf",
  "mathsf",
  "mathbb",
  "mathcal",
  "boldsymbol",
  "operatorname",
  "text",
  "exp",
  "log",
  "ln",
  "sin",
  "cos",
  "tan",
  "lim",
  "min",
  "max",
  "det",
  "Pr",
  "quad",
  "qquad",
  "infty",
  "partial",
  "nabla",
  "le",
  "ge",
  "neq",
  "approx",
  "sim",
  "to",
  "mapsto",
  "in",
  "subset",
  "cup",
  "cap",
  "forall",
  "exists",
  "mid",
  "vert",
  "langle",
  "rangle",
  "hat",
  "bar",
  "overline",
  "underline",
  "dot",
  "ddot",
  "vec",
]);

function normalizeLatex(value: string): string {
  return value.replace(/\s+/g, "").normalize("NFC");
}

function nearestHeading(body: string, offset: number) {
  return collectHeadingAnchors(body)
    .filter((heading) => heading.offset <= offset)
    .at(-1);
}

function nearestHeadingAnchor(body: string, offset: number): string {
  return nearestHeading(body, offset)?.id ?? "article-overview";
}

const semanticMathContainers = [
  "Definition",
  "Theorem",
  "Lemma",
  "Proof",
  "Derivation",
  "Example",
  "Exercise",
] as const;

interface SemanticMathContainer {
  readonly component: (typeof semanticMathContainers)[number];
  readonly id: string;
  readonly title?: string;
}

function enclosingSemanticContainer(
  body: string,
  offset: number,
): SemanticMathContainer | undefined {
  const stack: { readonly component: string; readonly id?: string; readonly title?: string }[] = [];
  const pattern = new RegExp(`<(/?)(${semanticMathContainers.join("|")})\\b([^>]*)>`, "gu");
  for (const match of body.matchAll(pattern)) {
    if ((match.index ?? 0) >= offset) break;
    const closing = match[1] === "/";
    const component = match[2] ?? "";
    if (closing) {
      const matchingIndex = stack.map((entry) => entry.component).lastIndexOf(component);
      if (matchingIndex >= 0) stack.splice(matchingIndex, 1);
      continue;
    }
    if (match[0].endsWith("/>")) continue;
    const id = /\bid\s*=\s*["']([^"']+)["']/u.exec(match[3] ?? "")?.[1];
    const title = /\btitle\s*=\s*["']([^"']+)["']/u.exec(match[3] ?? "")?.[1];
    stack.push({ component, ...(id ? { id } : {}), ...(title ? { title } : {}) });
  }
  let container: (typeof stack)[number] | undefined;
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]?.id) {
      container = stack[index];
      break;
    }
  }
  if (
    !container?.id ||
    !semanticMathContainers.some((component) => component === container.component)
  ) {
    return undefined;
  }
  return {
    component: container.component as SemanticMathContainer["component"],
    id: container.id,
    ...(container.title ? { title: container.title } : {}),
  };
}

export function resolveMathFragmentAnchor(body: string, offset: number): string {
  return enclosingSemanticContainer(body, offset)?.id ?? nearestHeadingAnchor(body, offset);
}

function formulaSelectionScore(body: string, offset: number, selectionHint: string): number {
  const container = enclosingSemanticContainer(body, offset);
  const semanticScore =
    container?.component === "Definition"
      ? 100
      : container?.component === "Theorem" || container?.component === "Lemma"
        ? 90
        : container?.component === "Derivation" || container?.component === "Proof"
          ? 75
          : container?.component === "Example"
            ? 35
            : container?.component === "Exercise"
              ? 10
              : 50;
  const hintTokens = [
    ...new Set(
      (selectionHint.toLocaleLowerCase().match(/[\p{Letter}\p{Number}]{2,}/gu) ?? []).filter(
        (token) => token.length >= 2,
      ),
    ),
  ];
  const context = body
    .slice(Math.max(0, offset - 500), Math.min(body.length, offset + 500))
    .toLocaleLowerCase();
  const overlap = hintTokens.filter((token) => context.includes(token)).length;
  return semanticScore + Math.min(30, overlap * 5);
}

function equationKind(
  title: string,
  latex: string,
  domain: string,
  container?: SemanticMathContainer,
): EquationKind {
  if (container?.component === "Definition" || /定义|definition/iu.test(title)) {
    return "definition";
  }
  if (/恒等|identity/iu.test(title)) return "identity";
  if (/更新|迭代|递推|update/iu.test(title) || /_(?:k|n)\+1/u.test(latex)) return "update";
  if (/约束|边界|判据|constraint/iu.test(title) || /(?:≤|≥|\\le|\\ge)/u.test(latex)) {
    return "constraint";
  }
  if (domain === "physics" && /定律|方程|守恒|law|equation/iu.test(title)) return "law";
  return "canonical";
}

function plainFormula(latex: string): string {
  return latex
    .replace(/\\(?:left|right|,|;|!|quad|qquad)\b/g, " ")
    .replace(/\\([A-Za-z]+)/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function symbolTokenId(token: string): string {
  const [base = token, subscript] = token.split("_", 2);
  const partId = (part: string): string => {
    const normalized = part.replace(/[^A-Za-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
    if (!normalized) return "symbol";
    return normalized === normalized.toLocaleLowerCase()
      ? normalized
      : `${normalized.toLocaleLowerCase()}-upper`;
  };
  return subscript ? `${partId(base)}-sub-${partId(subscript)}` : partId(base);
}

export interface SymbolUnitProfile {
  readonly unitKind: SymbolUnitKind;
  readonly unit?: string;
}

function physical(unit: string): SymbolUnitProfile {
  return { unitKind: "physical", unit };
}

function tokenBase(token: string): string {
  return token.split("_", 1)[0] ?? token;
}

export function resolveDerivedUnitProfile(
  domain: string,
  namespace: string,
  token: string,
  formulaLatex = "",
): SymbolUnitProfile {
  if (domain === "mathematics" || domain === "computer-science") {
    return { unitKind: "not-applicable" };
  }
  if (domain !== "physics") return { unitKind: "contextual" };

  const base = tokenBase(token);
  const lower = base.toLocaleLowerCase();
  const context = normalizeLatex(formulaLatex);
  if (base === "pi" || base === "theta") return { unitKind: "dimensionless" };

  if (namespace === "physics.thermodynamics") {
    if (token === "T") return physical("kelvin");
    if (token === "V") return physical("cubic-metre");
    if (token === "p") return physical("pascal");
    if (token === "n") return physical("mole");
    if (["U", "E", "F", "G", "H"].includes(token)) return physical("joule");
    if (token === "R" && /pV=nRT|nRT|RT/u.test(context)) {
      return physical("joule-per-mole-kelvin");
    }
  }
  if (namespace === "physics.statistical-physics") {
    if (token === "T") return physical("kelvin");
    if (token === "V") return physical("cubic-metre");
    if (base === "p" || ["Z", "N", "n", "g"].includes(base)) {
      return { unitKind: "dimensionless" };
    }
    if (lower === "beta") return physical("inverse-joule");
    if (token === "k_B") return physical("joule-per-kelvin");
    if (["U", "E", "F", "G", "H"].includes(base)) return physical("joule");
  }
  if (namespace === "physics.waves") {
    if (["x", "u", "L", "l", "r"].includes(base)) return physical("metre");
    if (["t", "T"].includes(base)) return physical("second");
    if (["c", "v"].includes(base)) return physical("metre-per-second");
    if (["f", "omega", "nu"].includes(base)) return physical("hertz");
    if (base === "k") return physical("inverse-metre");
  }
  if (namespace === "physics.relativity") {
    if (["beta", "gamma"].includes(base)) return { unitKind: "dimensionless" };
    if (["x", "r", "L", "l"].includes(base)) return physical("metre");
    if (["t", "tau"].includes(base)) return physical("second");
    if (["c", "v"].includes(base)) return physical("metre-per-second");
    if (base === "E") return physical("joule");
    if (base === "p") return physical("kilogram-metre-per-second");
    if (base === "m") return physical("kilogram");
  }
  if (namespace === "physics.quantum-mechanics") {
    if (["n", "ell"].includes(base)) return { unitKind: "dimensionless" };
    if (["x", "r"].includes(base)) return physical("metre");
    if (base === "t") return physical("second");
    if (["E", "H"].includes(base)) return physical("joule");
    if (base === "p") return physical("kilogram-metre-per-second");
    if (lower === "hbar") return physical("joule-second");
    if (["L", "S", "J"].includes(base)) return physical("joule-second");
  }
  if (namespace === "physics.electromagnetism") {
    if (["q", "Q"].includes(base)) return physical("coulomb");
    if (base === "E") return physical("newton-per-coulomb");
    if (base === "V") return physical("volt");
    if (base === "B") return physical("tesla");
    if (base === "I") return physical("ampere");
    if (token === "Phi_E") return physical("volt-metre");
    if (token === "Phi_B") return physical("weber");
  }
  if (namespace === "physics.continuum-mechanics") {
    if (lower === "rho") return physical("kilogram-per-cubic-metre");
    if (base === "p") return physical("pascal");
    if (lower === "mu") return physical("pascal-second");
    if (lower === "nu") return physical("square-metre-per-second");
    if (["u", "v"].includes(base)) return physical("metre-per-second");
  }
  if (namespace === "physics.classical-mechanics") {
    if (["x", "y", "z", "r", "R", "l", "d", "h"].includes(base)) {
      return physical("metre");
    }
    if (["t", "tau"].includes(base)) return physical("second");
    if (["v", "c"].includes(base)) return physical("metre-per-second");
    if (["a", "g"].includes(base)) return physical("metre-per-second-squared");
    if (["m", "M"].includes(base)) return physical("kilogram");
    if (base === "F") return physical("newton");
    if (["E", "U", "K"].includes(base)) return physical("joule");
    if (base === "p") return physical("kilogram-metre-per-second");
  }
  if (namespace === "physics.analytical-mechanics") {
    if (["x", "y", "z", "r", "R", "l"].includes(base)) return physical("metre");
    if (["t", "tau"].includes(base)) return physical("second");
    if (["m", "M"].includes(base)) return physical("kilogram");
    if (["L", "H", "E", "T", "V"].includes(base)) return physical("joule");
    if (base === "p") return physical("kilogram-metre-per-second");
    if (base === "S") return physical("joule-second");
  }
  // Measurement, field-theory, condensed-matter and computational-physics
  // notation frequently reuses the same letter for quantities with different
  // dimensions. Unknown cases stay contextual instead of guessing a unit.
  return { unitKind: "contextual" };
}

function stripBalancedCommandGroups(value: string, commands: readonly string[]): string {
  let result = value;
  const pattern = new RegExp(`\\\\(?:${commands.join("|")})\\s*\\{`, "gu");
  while (true) {
    const match = pattern.exec(result);
    if (!match || match.index === undefined) break;
    const open = match.index + match[0].lastIndexOf("{");
    let depth = 0;
    let close = -1;
    for (let index = open; index < result.length; index += 1) {
      if (result[index] === "{") depth += 1;
      if (result[index] === "}") depth -= 1;
      if (depth === 0) {
        close = index;
        break;
      }
    }
    if (close < 0) break;
    result = `${result.slice(0, match.index)} ${result.slice(close + 1)}`;
    pattern.lastIndex = 0;
  }
  return result;
}

const greekPlaceholderByCommand = new Map(
  [...greekSymbols].map((command, index) => [command, String.fromCharCode(0xe000 + index)]),
);
const greekCommandByPlaceholder = new Map(
  [...greekPlaceholderByCommand].map(([command, placeholder]) => [placeholder, command]),
);

function normalizeSymbolToken(raw: string): string {
  const normalized = raw
    .replace(/_\{([^{}]+)\}/gu, "_$1")
    .replace(/[{}]/gu, "")
    .replace(
      /[\uE000-\uE0FF]/gu,
      (placeholder) => ` ${greekCommandByPlaceholder.get(placeholder) ?? ""} `,
    )
    .replace(/[^A-Za-z0-9_+\-\s]/gu, "")
    .replace(/\s+/gu, " ")
    .replace(/\s*_\s*/gu, "_")
    .trim();
  return normalized;
}

function symbolLatex(token: string): string {
  const [base = token, subscript] = token.split("_", 2);
  const renderedBase = greekSymbols.has(base) ? `\\${base}` : base;
  const renderedSubscript = subscript
    ?.split(/(?=[+\-\s])|(?<=[+\-\s])/u)
    .map((part) => (greekSymbols.has(part) ? `\\${part}` : part))
    .join("");
  return renderedSubscript ? `${renderedBase}_{${renderedSubscript}}` : renderedBase;
}

export function extractEquationSymbolTokens(latex: string): readonly string[] {
  let source = latex
    .replace(/\\\\/gu, " ")
    .replace(/\^\s*\{?\s*(?:\\(?:mathsf|mathrm)\s*\{?\s*T\s*\}?|T|\\top)\s*\}?/gu, " ")
    .replace(/\\mathrm\s+d\b/gu, " ");
  source = stripBalancedCommandGroups(source, [
    "text",
    "mathrm",
    "operatorname",
    "mathbb",
    "mathsf",
    "mathtt",
  ]);
  source = source
    .replace(/\\(?:mathbb|mathrm|mathsf|mathtt)\s+[A-Za-z]/gu, " ")
    .replace(/\\(?:begin|end)\s*\{[^{}]+\}(?:\s*\{[^{}]*\})?/gu, " ")
    .replace(
      /\\([A-Za-z]+)/gu,
      (_match, command: string) => greekPlaceholderByCommand.get(command) ?? " ",
    );

  const ignoredWords = new Set([
    "d",
    "det",
    "exp",
    "gcd",
    "lcm",
    "ln",
    "log",
    "max",
    "min",
    "mod",
    "rank",
    "sin",
    "cos",
    "tan",
    "tr",
    "var",
    "hz",
    "kg",
    "mol",
    "pa",
  ]);
  const tokens: string[] = [];
  // A command is a separate TeX token. An unbraced subscript consumes one
  // token, so W_2\phi must not become W_{2phi}.
  for (const match of source.matchAll(
    /(?:[A-Za-z]+|[\uE000-\uE0FF])(?:_(?:\{[^{}]+\}|[A-Za-z0-9\uE000-\uE0FF]))?/gu,
  )) {
    const candidate = normalizeSymbolToken(match[0]);
    if (!candidate) continue;
    const base = tokenBase(candidate);
    if (ignoredWords.has(base.toLocaleLowerCase()) && !candidate.includes("_")) continue;
    if (candidate.includes("_") || greekSymbols.has(base) || base.length === 1) {
      tokens.push(candidate);
      continue;
    }
    if (!ignoredWords.has(base.toLocaleLowerCase()) && base.length <= 3) {
      tokens.push(
        ...base.split("").filter((letter) => !ignoredWords.has(letter.toLocaleLowerCase())),
      );
    }
  }
  return [...new Set(tokens)].filter(
    (token) => token && !latexCommandsToIgnore.has(tokenBase(token)),
  );
}

export function mergeMathLocations(
  ...groups: readonly (readonly MathRecordLocation[])[]
): readonly MathRecordLocation[] {
  const unique = new Map<string, MathRecordLocation>();
  for (const location of groups.flat()) {
    unique.set(`${location.documentId}\0${location.chapterId}\0${location.anchorId}`, location);
  }
  return [...unique.values()].sort(
    (left, right) =>
      left.documentId.localeCompare(right.documentId, "zh-CN") ||
      left.chapterId.localeCompare(right.chapterId, "zh-CN") ||
      left.anchorId.localeCompare(right.anchorId, "zh-CN"),
  );
}

export function stableDerivedEquationId(chapterId: string, latex: string): string {
  let hash = 0x811c9dc5;
  for (const character of normalizeLatex(latex)) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return `${chapterId}-equation-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function withSymbolConflicts(
  symbols: readonly SymbolDefinition[],
): readonly SymbolDefinition[] {
  const byNotation = new Map<string, SymbolDefinition[]>();
  for (const symbol of symbols) {
    const key = symbol.plainText.normalize("NFC").trim();
    byNotation.set(key, [...(byNotation.get(key) ?? []), symbol]);
  }
  return symbols.map((symbol) => ({
    ...symbol,
    conflictsWith: [
      ...new Set([
        ...symbol.conflictsWith,
        ...(byNotation.get(symbol.plainText.normalize("NFC").trim()) ?? [])
          .filter((candidate) => candidate.id !== symbol.id)
          .map((candidate) => candidate.id),
      ]),
    ].sort(),
  }));
}

function fragmentUsesAuthoredSymbol(latex: string, symbol: LegacySymbolDefinition): boolean {
  const tokens = extractEquationSymbolTokens(latex);
  if (tokens.includes(symbol.plainText)) return true;
  if (symbol.latex.startsWith("\\"))
    return normalizeLatex(latex).includes(normalizeLatex(symbol.latex));
  if (/^[A-Za-z]$/.test(symbol.latex)) {
    return new RegExp(`(?<![A-Za-z])${symbol.latex}(?![A-Za-z])`, "u").test(latex);
  }
  return normalizeLatex(latex).includes(normalizeLatex(symbol.latex));
}

function equationTitle(
  body: string,
  offset: number,
  chapterTitle: string,
  plannedTitle: string | undefined,
  index: number,
): string {
  const container = enclosingSemanticContainer(body, offset);
  const heading = nearestHeading(body, offset);
  return (
    container?.title?.trim() ||
    heading?.title.trim() ||
    plannedTitle?.trim() ||
    `${chapterTitle}典范公式 ${index + 1}`
  );
}

interface NearbyProseSentence {
  readonly text: string;
  readonly distance: number;
  readonly order: number;
}

function markdownBlocks(body: string): readonly {
  readonly start: number;
  readonly end: number;
  readonly value: string;
}[] {
  const blocks: { start: number; end: number; value: string }[] = [];
  const separator = /\n[ \t]*\n/gu;
  let start = 0;
  for (const match of body.matchAll(separator)) {
    const end = match.index ?? start;
    blocks.push({ start, end, value: body.slice(start, end) });
    start = end + match[0].length;
  }
  blocks.push({ start, end: body.length, value: body.slice(start) });
  return blocks;
}

function stripMarkdownEmphasisOutsideMath(value: string): string {
  const math: string[] = [];
  const protectedValue = value.replace(
    /\$\$[\s\S]*?\$\$|(?<!\\)\$(?:\\.|[^$])+?(?<!\\)\$/gu,
    (fragment) => {
      const index = math.push(fragment) - 1;
      return `\uE000${index}\uE001`;
    },
  );
  return protectedValue
    .replace(/\*{1,3}([^*]+)\*{1,3}/gu, "$1")
    .replace(/\uE000(\d+)\uE001/gu, (_, index: string) => math[Number(index)] ?? "");
}

function cleanNearbyProseBlock(value: string): string | null {
  const trimmed = value.trim();
  if (
    !trimmed ||
    /^#{1,6}\s/u.test(trimmed) ||
    /^(?:<\/?[A-Z][A-Za-z]*\b|import\s|export\s|---$)/u.test(trimmed) ||
    /\$\$[\s\S]*\$\$/u.test(trimmed)
  ) {
    return null;
  }

  const prose = stripMarkdownEmphasisOutsideMath(
    trimmed
      .replace(/<[^>]+>/gu, " ")
      .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
      .replace(/^\s*[-*+]\s+/gmu, ""),
  )
    .replace(/\s+/gu, " ")
    .trim();
  if (!prose) return null;
  const mathFragments = extractMathFragments(prose);
  return mathFragments.every((fragment) => fragment.closed) ? prose : null;
}

function nearbyProseSentences(
  body: string,
  offset: number,
  before: number,
  after: number,
): readonly NearbyProseSentence[] {
  const windowStart = Math.max(0, offset - before);
  const windowEnd = Math.min(body.length, offset + after);
  return markdownBlocks(maskCodeForMath(body))
    .filter((block) => block.end >= windowStart && block.start <= windowEnd)
    .flatMap((block) => {
      const prose = cleanNearbyProseBlock(block.value);
      if (!prose) return [];
      const distance =
        offset < block.start ? block.start - offset : offset > block.end ? offset - block.end : 0;
      return (prose.match(/[^。！？]+[。！？]?/gu) ?? [])
        .map((text, sentenceIndex) => ({
          text: text.trim(),
          distance,
          order: block.start + sentenceIndex,
        }))
        .filter(({ text }) => text.length >= 8 && text.length <= 420 && /[。！？]$/u.test(text));
    });
}

export function nearbyAssumptionStatements(
  body: string,
  offset: number,
  formulaTitle: string,
): string[] {
  const statements = nearbyProseSentences(body, offset, 1_200, 800)
    .filter(({ text }) => /设|假设|若|当|满足|给定|在.+(?:下|中)/u.test(text))
    .sort((left, right) => left.distance - right.distance || left.order - right.order)
    .slice(0, 2)
    .sort((left, right) => left.order - right.order)
    .map(({ text }) => (/[^。！？]$/u.test(text) ? `${text}。` : text));
  return statements.length > 0
    ? statements
    : [`“${formulaTitle}”采用该锚点正文给出的定义域、对象类型与记号约定。`];
}

export function nearbyBoundaryStatement(body: string, offset: number): string {
  const statement = nearbyProseSentences(body, offset, 900, 1_300)
    .filter(
      ({ text }) =>
        text.length >= 12 && /极限|边界|退化|失效|仅在|适用|趋于|不能|无法|不再|除非/u.test(text),
    )
    .sort((left, right) => left.distance - right.distance || left.order - right.order)[0]?.text;
  return statement
    ? /[^。！？]$/u.test(statement)
      ? `${statement}。`
      : statement
    : "正文未把极限情形单列为独立公式；适用边界以本小节声明的定义域、假设和边界条件为限。";
}

interface DerivedSymbolSemantics {
  readonly meaning: string;
  readonly role: string;
  readonly assumptions: readonly string[];
}

const exactSymbolSemantics: Readonly<
  Record<string, Readonly<Record<string, readonly [string, string]>>>
> = {
  "ml.neural-networks": {
    Q: ["注意力层的查询矩阵", "提供待匹配的查询向量"],
    K: ["注意力层的键矩阵", "与查询计算缩放相似度"],
    V: ["注意力层的值矩阵", "按注意力权重汇总输出"],
    d_k: ["每个注意力头的键向量维数", "缩放点积以控制 softmax 输入幅度"],
  },
  "math.probability": {
    X: ["本章研究的随机变量 X", "作为概率分布、期望或方差的对象"],
    Y: ["与 X 联合研究的随机变量 Y", "构成联合分布或条件分布的第二个变量"],
    x: ["随机变量 X 的一个可能取值", "作为求和或积分中的取值变量"],
    p_X: ["随机变量 X 的概率质量函数或密度函数", "给取值 x 分配概率权重"],
  },
  "ml.optimization": {
    theta: ["待优化的模型参数向量", "作为损失函数的自变量"],
    eta: ["梯度更新的学习率", "控制每次参数更新的步长"],
    L: ["训练或优化目标的损失函数", "提供需要最小化的标量目标"],
    k: ["优化算法的迭代编号", "标记当前或下一次更新"],
  },
  "physics.statistical-physics": {
    p_i: ["系统处于微观状态 i 的概率", "作为统计平均中的归一化权重"],
    E_i: ["微观状态 i 的能量", "决定该状态的玻尔兹曼权重"],
    Z: ["配分函数", "归一化全部微观状态的统计权重"],
    beta: ["热力学逆温参数", "将能量转换为无量纲指数"],
    k_B: ["玻尔兹曼常数", "连接温度与能量尺度"],
  },
  "physics.electromagnetism": {
    Phi_E: ["穿过给定曲面的电通量", "汇总电场在曲面法向上的通量"],
    Phi_B: ["穿过给定曲面的磁通量", "汇总磁场在曲面法向上的通量"],
  },
};

function derivedSymbolSemantics(
  token: string,
  namespace: string,
  formulaTitle: string,
  chapterTitle: string,
  formulaLatex: string,
): DerivedSymbolSemantics {
  const exact = exactSymbolSemantics[namespace]?.[token];
  if (exact) {
    return {
      meaning: exact[0],
      role: exact[1],
      assumptions: [`该含义限定于《${chapterTitle}》“${formulaTitle}”及其相邻推导。`],
    };
  }
  const [base = token, subscript] = token.split("_", 2);
  if (subscript) {
    return {
      meaning: `《${chapterTitle}》“${formulaTitle}”中 ${base} 的下标 ${subscript} 分量或状态量`,
      role: `用下标 ${subscript} 区分 ${base} 的分量、样本或离散状态`,
      assumptions: [`下标 ${subscript} 的取值范围以该公式邻近定义和求和范围为准。`],
    };
  }
  const normalized = normalizeLatex(formulaLatex);
  const equalsAt = normalized.indexOf("=");
  const tokenAt = normalized.indexOf(token);
  const side =
    equalsAt >= 0 && tokenAt >= 0 && tokenAt < equalsAt
      ? "等号左侧的目标量"
      : "等号右侧的输入量或系数";
  return {
    meaning: `《${chapterTitle}》“${formulaTitle}”中记作 ${token} 的${side}`,
    role: `在“${formulaTitle}”中作为${side}参与关系计算`,
    assumptions: [`符号 ${token} 仅按该公式锚点给出的对象类型、取值域与维度解释。`],
  };
}

function domainNamespace(document: ContentDocument, preferred: readonly string[] = []): string {
  const namespaces = document.frontmatter.symbolNamespaces;
  const authored = preferred.find((namespace) => namespaces.includes(namespace));
  if (authored) return authored;
  const subjectNamespace = namespaces.find(
    (namespace) => namespace.split(".").at(-1) === document.frontmatter.subject,
  );
  if (subjectNamespace) return subjectNamespace;
  const prefix =
    document.frontmatter.domain === "mathematics"
      ? "math."
      : document.frontmatter.domain === "physics"
        ? "physics."
        : document.frontmatter.domain === "machine-learning"
          ? "ml."
          : "computing.";
  return (
    namespaces.find((namespace) => namespace.startsWith(prefix)) ??
    namespaces[0] ??
    `${prefix}${document.frontmatter.subject}`
  );
}

function migrateAuthoredEquation(
  equation: LegacyEquationRecord,
  resolveTopicLocation: BuildMathIndexInput["resolveTopicLocation"],
  resolveTopicTitle: BuildMathIndexInput["resolveTopicTitle"],
  documentByDocumentId: ReadonlyMap<string, ContentDocument>,
  requireReference: boolean,
): EquationRecord | null {
  const equationComponentPattern = new RegExp(
    `<Equation\\b[^>]*\\bid=["']${equation.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*/?>`,
    "u",
  );
  const authoredSource = equation.relatedTopics
    .map(resolveTopicLocation)
    .filter((location): location is MathRecordLocation => Boolean(location))
    .map((location) => ({
      location,
      document: documentByDocumentId.get(location.documentId),
    }))
    .find(
      (candidate) =>
        candidate.document !== undefined && equationComponentPattern.test(candidate.document.body),
    );
  if (!authoredSource?.document) {
    if (requireReference) {
      throw new Error(
        `Authored equation ${equation.id} must be referenced by an explicit <Equation id="${equation.id}" /> in one of its related-topic documents`,
      );
    }
    return null;
  }
  const resolvedSource = authoredSource.location;
  const sourceDocument = authoredSource.document;
  const equationComponent = equationComponentPattern.exec(sourceDocument.body);
  if (!equationComponent) return null;
  const componentOffset = equationComponent.index ?? 0;
  const source = {
    ...resolvedSource,
    anchorId: `equation-${equation.id}`,
  };
  const title = equation.name["zh-CN"];
  return {
    ...equation,
    schemaVersion: 2,
    equationKind:
      equation.equationKind ??
      equationKind(
        title,
        equation.latex,
        equation.domain,
        enclosingSemanticContainer(sourceDocument.body, componentOffset),
      ),
    source,
    derivations: equation.derivations ?? (source ? [source.anchorId] : []),
    limitingCases: equation.limitingCases ?? [
      nearbyBoundaryStatement(sourceDocument.body, componentOffset),
    ],
    applications:
      equation.applications ??
      equation.relatedTopics.map(
        (topicId) => resolveTopicTitle(topicId) ?? "相关教材主题（标题尚未登记）",
      ),
  };
}

function migrateAuthoredSymbol(
  symbol: LegacySymbolDefinition,
  locations: readonly MathRecordLocation[],
): SymbolDefinition {
  const domain = symbol.namespace.startsWith("math.")
    ? "mathematics"
    : symbol.namespace.startsWith("physics.")
      ? "physics"
      : symbol.namespace.startsWith("ml.")
        ? "machine-learning"
        : "computer-science";
  const primaryToken = extractEquationSymbolTokens(symbol.latex)[0] ?? symbol.plainText;
  const profile = symbol.unit
    ? ({ unitKind: "physical", unit: symbol.unit } satisfies SymbolUnitProfile)
    : resolveDerivedUnitProfile(domain, symbol.namespace, primaryToken, symbol.latex);
  return {
    ...symbol,
    schemaVersion: 2,
    ...profile,
    assumptions: symbol.assumptions ?? [],
    aliases: symbol.aliases ?? [],
    conflictsWith: symbol.conflictsWith ?? [],
    locations,
  };
}

export function buildMathIndex(input: BuildMathIndexInput): BuiltMathIndex {
  const documentByContentId = new Map(
    input.documents.map((document) => [document.frontmatter.id, document] as const),
  );
  const chapterById = new Map(input.curriculum.chapters.map((chapter) => [chapter.id, chapter]));
  const bookById = new Map(input.curriculum.books.map((book) => [book.id, book]));
  const documentByDocumentId = new Map(
    input.documents.map((document) => [document.documentId, document] as const),
  );

  const migratedAuthoredEquations = input.authoredEquations.flatMap((equation) => {
    const migrated = migrateAuthoredEquation(
      equation,
      input.resolveTopicLocation,
      input.resolveTopicTitle,
      documentByDocumentId,
      input.requireAuthoredEquationReferences === true,
    );
    return migrated ? [migrated] : [];
  });
  const derivedSymbols = new Map<string, SymbolDefinition>();
  const authoredSymbolById = new Map(
    input.authoredSymbols.map((symbol) => [symbol.id, symbol] as const),
  );
  const authoredEquations = migratedAuthoredEquations.map((equation) => {
    if (!equation.source) return equation;
    const source = equation.source;
    const sourceDocument = documentByDocumentId.get(source.documentId);
    const preferredNamespaces = equation.variables.flatMap((variable) => {
      const definition = authoredSymbolById.get(variable.symbolId);
      return definition ? [definition.namespace] : [];
    });
    const namespace = sourceDocument ? domainNamespace(sourceDocument, preferredNamespaces) : "";
    if (!sourceDocument || !namespace) return equation;
    const coveredTokens = new Set(
      equation.variables.flatMap((variable) => {
        const definition = authoredSymbolById.get(variable.symbolId);
        const primaryToken = definition
          ? extractEquationSymbolTokens(definition.latex)[0]
          : undefined;
        return primaryToken ? [primaryToken] : [];
      }),
    );
    const supplementalVariables = extractEquationSymbolTokens(equation.latex)
      .filter((token) => !coveredTokens.has(token))
      .map((token) => {
        const symbolId = `${source.chapterId}-symbol-${symbolTokenId(token)}`;
        const profile = resolveDerivedUnitProfile(
          sourceDocument.frontmatter.domain,
          namespace,
          token,
          equation.latex,
        );
        const semantics = derivedSymbolSemantics(
          token,
          namespace,
          equation.name["zh-CN"],
          sourceDocument.frontmatter.shortTitle,
          equation.latex,
        );
        const existing = derivedSymbols.get(symbolId);
        derivedSymbols.set(symbolId, {
          schemaVersion: 2,
          id: symbolId,
          latex: symbolLatex(token),
          plainText: token,
          accessibleLabel: { "zh-CN": `${sourceDocument.frontmatter.shortTitle}中的符号 ${token}` },
          meaning: { "zh-CN": semantics.meaning },
          namespace,
          ...profile,
          assumptions: semantics.assumptions,
          aliases: [],
          conflictsWith: [],
          locations: mergeMathLocations(existing?.locations ?? [], [source]),
        });
        return {
          symbolId,
          role: { "zh-CN": semantics.role },
          ...(profile.unit ? { unit: profile.unit } : {}),
        } satisfies EquationVariable;
      });
    return { ...equation, variables: [...equation.variables, ...supplementalVariables] };
  });
  const authoredLatexByChapter = new Map<string, Set<string>>();
  const authoredEquationIdsByChapter = new Map<string, string[]>();
  for (const equation of authoredEquations) {
    if (!equation.source) continue;
    authoredEquationIdsByChapter.set(equation.source.chapterId, [
      ...(authoredEquationIdsByChapter.get(equation.source.chapterId) ?? []),
      equation.id,
    ]);
    const latexSet = authoredLatexByChapter.get(equation.source.chapterId) ?? new Set<string>();
    latexSet.add(normalizeLatex(equation.latex));
    authoredLatexByChapter.set(equation.source.chapterId, latexSet);
  }
  const derivedEquations: EquationRecord[] = [];
  const coverage: ChapterMathCoverage[] = [];

  for (const chapter of input.curriculum.chapters) {
    const contentId = chapter.contentId;
    const document = contentId ? documentByContentId.get(contentId) : undefined;
    if (!contentId || !document) continue;

    const unique = new Set<string>();
    let closedDisplayCount = 0;
    let rejectedCandidateCount = 0;
    const chapterAuthoredLatex = authoredLatexByChapter.get(chapter.id) ?? new Set<string>();
    const candidates = extractMathFragments(document.body).filter((fragment) => {
      if (fragment.kind !== "display" || !fragment.closed) return false;
      closedDisplayCount += 1;
      const normalized = normalizeLatex(fragment.latex);
      if (normalized.length < 5 || unique.has(normalized) || chapterAuthoredLatex.has(normalized)) {
        rejectedCandidateCount += 1;
        return false;
      }
      unique.add(normalized);
      return true;
    });
    const plannedCount = Math.max(1, Math.min(3, chapter.plannedEquations.length || 1));
    const authoredEquationIds = authoredEquationIdsByChapter.get(chapter.id) ?? [];
    const selectionHint = chapter.plannedEquations
      .flatMap((planned) => [planned.title["zh-CN"], planned.purpose["zh-CN"]])
      .join(" ");
    const selected = [...candidates]
      .sort(
        (left, right) =>
          formulaSelectionScore(document.body, right.offset, selectionHint) -
            formulaSelectionScore(document.body, left.offset, selectionHint) ||
          left.offset - right.offset,
      )
      .slice(0, Math.max(0, plannedCount - authoredEquationIds.length));

    if (selected.length === 0 && authoredEquationIds.length === 0) {
      coverage.push({
        chapterId: chapter.id,
        contentId,
        status: "not-applicable",
        equationIds: [],
        reason:
          closedDisplayCount === 0
            ? `《${document.frontmatter.shortTitle}》正文没有闭合的展示公式；本章以算法、实验流程或概念论证为主。`
            : `《${document.frontmatter.shortTitle}》的 ${closedDisplayCount} 个闭合展示公式中，${rejectedCandidateCount} 个为短式、重复式或本章已登记公式，未剩余可独立复用的典范公式。`,
      });
      continue;
    }

    const equationIds: string[] = [...authoredEquationIds];
    const namespace = domainNamespace(document);
    if (!namespace) throw new Error(`Document ${document.documentId} has no symbol namespace`);
    selected.forEach((fragment, index) => {
      const planned = chapter.plannedEquations[index];
      const anchorId = resolveMathFragmentAnchor(document.body, fragment.offset);
      const id = stableDerivedEquationId(chapter.id, fragment.latex);
      if (derivedEquations.some((equation) => equation.id === id)) {
        throw new Error(`Derived equation id collision for ${chapter.id}: ${id}`);
      }
      const title = equationTitle(
        document.body,
        fragment.offset,
        document.frontmatter.shortTitle,
        planned?.title["zh-CN"],
        index,
      );
      const source: MathRecordLocation = {
        documentId: document.documentId,
        chapterId: chapter.id,
        anchorId,
      };
      const symbolTokens = extractEquationSymbolTokens(fragment.latex);
      const variables = symbolTokens.map((token) => {
        const symbolId = `${chapter.id}-symbol-${symbolTokenId(token)}`;
        const profile = resolveDerivedUnitProfile(
          document.frontmatter.domain,
          namespace,
          token,
          fragment.latex,
        );
        const semantics = derivedSymbolSemantics(
          token,
          namespace,
          title,
          document.frontmatter.shortTitle,
          fragment.latex,
        );
        const existing = derivedSymbols.get(symbolId);
        const locationExists = existing?.locations.some(
          (location) =>
            location.documentId === source.documentId && location.anchorId === source.anchorId,
        );
        const locations = locationExists
          ? (existing?.locations ?? [])
          : mergeMathLocations(existing?.locations ?? [], [source]);
        derivedSymbols.set(symbolId, {
          schemaVersion: 2,
          id: symbolId,
          latex: symbolLatex(token),
          plainText: token,
          accessibleLabel: { "zh-CN": `${document.frontmatter.shortTitle}中的符号 ${token}` },
          meaning: { "zh-CN": semantics.meaning },
          namespace,
          ...profile,
          assumptions: semantics.assumptions,
          aliases: [],
          conflictsWith: [],
          locations,
        });
        return {
          symbolId,
          role: { "zh-CN": semantics.role },
          ...(profile.unit ? { unit: profile.unit } : {}),
        } satisfies EquationVariable;
      });
      const purpose = planned?.purpose["zh-CN"] || document.frontmatter.summary;
      const limitingCase = nearbyBoundaryStatement(document.body, fragment.offset);
      derivedEquations.push({
        schemaVersion: 2,
        id,
        name: { "zh-CN": title },
        latex: fragment.latex,
        plainText: plainFormula(fragment.latex),
        accessibleLabel: {
          "zh-CN": `${title}，详见《${document.frontmatter.shortTitle}》对应小节。`,
        },
        variables,
        assumptions: nearbyAssumptionStatements(document.body, fragment.offset, title).map(
          (statement) => ({ "zh-CN": statement }),
        ),
        domain: document.frontmatter.domain,
        subjects: [document.frontmatter.subject],
        relatedTopics: [document.frontmatter.conceptId, ...chapter.conceptIds].filter(
          (topic, topicIndex, topics) => topics.indexOf(topic) === topicIndex,
        ),
        equationKind: equationKind(
          title,
          fragment.latex,
          document.frontmatter.domain,
          enclosingSemanticContainer(document.body, fragment.offset),
        ),
        source,
        derivations: [anchorId],
        limitingCases: [limitingCase],
        applications: [purpose],
      });
      equationIds.push(id);
    });
    coverage.push({
      chapterId: chapter.id,
      contentId,
      status: "indexed",
      equationIds,
    });
  }

  const locationByAuthoredSymbol = new Map<string, MathRecordLocation[]>();
  for (const equation of authoredEquations) {
    if (!equation.source) continue;
    for (const variable of equation.variables) {
      locationByAuthoredSymbol.set(variable.symbolId, [
        ...(locationByAuthoredSymbol.get(variable.symbolId) ?? []),
        equation.source,
      ]);
    }
  }
  const chapterByContentId = new Map(
    input.curriculum.chapters
      .filter((chapter) => chapter.contentId)
      .map((chapter) => [chapter.contentId as string, chapter] as const),
  );
  const authoredSymbols = input.authoredSymbols.map((symbol) => {
    const locations = [...(locationByAuthoredSymbol.get(symbol.id) ?? [])];
    const locationKeys = new Set(
      locations.map((location) => `${location.documentId}\0${location.anchorId}`),
    );
    for (const document of input.documents) {
      if (!document.frontmatter.symbolNamespaces.includes(symbol.namespace)) continue;
      const chapter = chapterByContentId.get(document.frontmatter.id);
      if (!chapter) continue;
      for (const fragment of extractMathFragments(document.body)) {
        if (!fragment.closed || !fragmentUsesAuthoredSymbol(fragment.latex, symbol)) continue;
        const source = {
          documentId: document.documentId,
          chapterId: chapter.id,
          anchorId: resolveMathFragmentAnchor(document.body, fragment.offset),
        } satisfies MathRecordLocation;
        const key = `${source.documentId}\0${source.anchorId}`;
        if (locationKeys.has(key)) continue;
        locationKeys.add(key);
        locations.push(source);
      }
    }
    return migrateAuthoredSymbol(symbol, locations);
  });

  for (const [symbolId, symbol] of derivedSymbols) {
    const chapterIds = new Set(symbol.locations.map((location) => location.chapterId));
    let locations = symbol.locations;
    for (const document of input.documents) {
      const chapter = chapterByContentId.get(document.frontmatter.id);
      if (!chapter || !chapterIds.has(chapter.id)) continue;
      for (const fragment of extractMathFragments(document.body)) {
        if (!fragment.closed) continue;
        if (!extractEquationSymbolTokens(fragment.latex).includes(symbol.plainText)) continue;
        locations = mergeMathLocations(locations, [
          {
            documentId: document.documentId,
            chapterId: chapter.id,
            anchorId: resolveMathFragmentAnchor(document.body, fragment.offset),
          },
        ]);
      }
    }
    derivedSymbols.set(symbolId, { ...symbol, locations });
  }

  const equations = [...authoredEquations, ...derivedEquations];
  const rawSymbols = [...authoredSymbols, ...derivedSymbols.values()];
  const symbols = withSymbolConflicts(rawSymbols);
  const books = input.curriculum.books.map((book) => {
    const chapters = coverage.filter(
      (entry) => chapterById.get(entry.chapterId)?.bookId === book.id,
    );
    const equationIds = chapters.flatMap((entry) => entry.equationIds);
    const chapterIds = new Set(chapters.map((entry) => entry.chapterId));
    const symbolIds = symbols
      .filter((symbol) => symbol.locations.some((location) => chapterIds.has(location.chapterId)))
      .map((symbol) => symbol.id);
    return {
      schemaVersion: 1,
      bookId: book.id,
      equationIds,
      symbolIds,
      chapters,
    } satisfies BookMathIndex;
  });

  // Access the map during construction so malformed curriculum books fail near
  // the index boundary rather than later in a renderer.
  for (const entry of books) {
    if (!bookById.has(entry.bookId)) throw new Error(`Unknown math-index book ${entry.bookId}`);
  }

  return { equations, symbols, books, coverage };
}
