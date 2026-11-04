import {
  contentRepository,
  equations,
  extractMathFragments,
  inspectMathIntegrity,
  symbols,
  teachingFigures,
} from "@one-forth/content";
import { visualizationManifest } from "@one-forth/visualization";
import katex from "katex";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  hasUnparsedLegacyExerciseMathSyntax,
  parseLegacyExerciseInline,
} from "../lib/legacy-exercise-inline";

export interface MathValidationSource {
  readonly label: string;
  readonly latex: string;
  readonly display: boolean;
}

export interface MathValidationIssue {
  readonly label: string;
  readonly message: string;
}

export interface FencedMathFragment {
  readonly latex: string;
  readonly line: number;
}

export interface LegacyExerciseMathAttribute {
  readonly attribute: "hint" | "solution";
  readonly exerciseId: string;
  readonly line: number;
  readonly value: string;
}

// Fixed allowlist for inline exercise math; additions or mutations fail validation.
const LEGACY_EXERCISE_MATH_BASELINE = {
  count: 777,
  digest: "501af7d6d65a9d6295467cca08d0fbaed1de961b79a7e8776c3bc0d2fd64677c",
} as const;

function containsMathSyntax(value: string): boolean {
  const withoutInlineCode = value.replace(/`[^`]*`/gu, "");
  return (
    /[$\\^]/u.test(withoutInlineCode) ||
    /(?:[\p{L}\p{N}])_(?:[\p{L}\p{N}{])|_(?:[\p{L}\p{N}{])/u.test(withoutInlineCode) ||
    /[∂∇∑∏∫√∞≈≠≤≥→↦∈∉⊂⊆∪∩⊗⊕∥±∓∝∀∃]/u.test(withoutInlineCode) ||
    /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]/u.test(withoutInlineCode) ||
    /(?:\b[A-Za-z][A-Za-z0-9]*|\d)\s*[=<>]\s*[-+]?/u.test(withoutInlineCode) ||
    /(?:\p{Script=Greek}[^。；，,;]*[=<>]|[=<>][^。；，,;]*\p{Script=Greek})/u.test(
      withoutInlineCode,
    )
  );
}

/**
 * Math inside JSX string attributes never enters remark-math. Authors must use
 * ExerciseHint / ExerciseSolution child slots so MDX can compile the formula.
 */
export function extractLegacyExerciseMathAttributes(
  source: string,
): readonly LegacyExerciseMathAttribute[] {
  return extractLegacyExerciseStringAttributes(source).filter((attribute) =>
    containsMathSyntax(attribute.value),
  );
}

export function extractLegacyExerciseStringAttributes(
  source: string,
): readonly LegacyExerciseMathAttribute[] {
  const issues: LegacyExerciseMathAttribute[] = [];
  const attributePattern =
    /\b(hint|solution)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\}|\{\s*`([^`]*)`\s*\})/gu;

  for (const { openingTag, offset: tagOffset } of extractExerciseOpeningTags(source)) {
    const exerciseId = /\bid\s*=\s*"([^"]+)"/u.exec(openingTag)?.[1] ?? "unknown-exercise";
    for (const attributeMatch of openingTag.matchAll(attributePattern)) {
      const value =
        attributeMatch[2] ??
        attributeMatch[3] ??
        attributeMatch[4] ??
        attributeMatch[5] ??
        attributeMatch[6] ??
        "";
      const offset = tagOffset + (attributeMatch.index ?? 0);
      issues.push({
        attribute: attributeMatch[1] as "hint" | "solution",
        exerciseId,
        line: source.slice(0, offset).split("\n").length,
        value,
      });
    }
  }

  return issues;
}

interface ExerciseOpeningTag {
  readonly openingTag: string;
  readonly offset: number;
}

function extractExerciseOpeningTags(source: string): readonly ExerciseOpeningTag[] {
  const tags: ExerciseOpeningTag[] = [];
  for (const match of source.matchAll(/<Exercise\b/gu)) {
    const offset = match.index ?? 0;
    let quote: '"' | "'" | "`" | undefined;
    let escaped = false;
    let braceDepth = 0;

    for (let index = offset + match[0].length; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === quote) {
          quote = undefined;
        }
        continue;
      }

      if (character === '"' || character === "'" || character === "`") {
        quote = character;
      } else if (character === "{") {
        braceDepth += 1;
      } else if (character === "}") {
        braceDepth = Math.max(0, braceDepth - 1);
      } else if (character === ">" && braceDepth === 0) {
        tags.push({ openingTag: source.slice(offset, index + 1), offset });
        break;
      }
    }
  }
  return tags;
}

export function extractFencedMathFragments(source: string): readonly FencedMathFragment[] {
  const fragments: FencedMathFragment[] = [];
  const pattern = /^( {0,3})(`{3,}|~{3,})[ \t]*math(?:[ \t][^\n]*)?\n([\s\S]*?)^\1\2[ \t]*$/gm;
  for (const match of source.matchAll(pattern)) {
    const offset = match.index ?? 0;
    fragments.push({
      latex: (match[3] ?? "").trim(),
      line: source.slice(0, offset).split("\n").length,
    });
  }
  return fragments;
}

export function validateMathSources(
  sources: readonly MathValidationSource[],
  strict: "warn" | "error" = "error",
): readonly MathValidationIssue[] {
  const issues: MathValidationIssue[] = [];
  for (const source of sources) {
    for (const issue of inspectMathIntegrity(source.latex)) {
      issues.push({ label: source.label, message: issue.message });
    }
    try {
      katex.renderToString(source.latex, {
        displayMode: source.display,
        output: "htmlAndMathml",
        strict,
        throwOnError: true,
      });
    } catch (error) {
      issues.push({
        label: source.label,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return issues;
}

export async function validateAuthoredMath(): Promise<{
  readonly documents: number;
  readonly legacyExerciseMathAttributes: number;
  readonly legacyExerciseMathDigest: string;
  readonly legacyExerciseMathFormulas: number;
  readonly mdxFormulas: number;
  readonly registeredEquations: number;
  readonly registeredSymbols: number;
  readonly teachingFigureFormulas: number;
  readonly supplementaryFormulas: number;
  readonly issues: readonly MathValidationIssue[];
}> {
  const documents = await contentRepository.listDocuments();

  const sources: MathValidationSource[] = [];
  const legacyExerciseSources: MathValidationSource[] = [];
  const supplementarySources: MathValidationSource[] = [];
  const structuralIssues: MathValidationIssue[] = [];
  const legacyExerciseMathFingerprints: string[] = [];
  for (const document of documents) {
    const metadata = Object.fromEntries(Object.entries(document).filter(([key]) => key !== "body"));
    collectStringMath(metadata, `${document.documentId}:metadata`, supplementarySources);
    for (const attribute of extractLegacyExerciseMathAttributes(document.body)) {
      legacyExerciseMathFingerprints.push(
        [document.documentId, attribute.exerciseId, attribute.attribute, attribute.value].join(
          "\0",
        ),
      );
    }
    for (const attribute of extractLegacyExerciseStringAttributes(document.body)) {
      let formulaIndex = 0;
      for (const segment of parseLegacyExerciseInline(attribute.value)) {
        if (segment.kind === "text") {
          if (hasUnparsedLegacyExerciseMathSyntax(segment.text)) {
            structuralIssues.push({
              label: `${document.documentId}:${attribute.exerciseId}:${attribute.attribute}`,
              message: `Legacy Exercise text retained math syntax: ${JSON.stringify(segment.text)}`,
            });
          }
          continue;
        }
        if (segment.kind !== "math") continue;
        formulaIndex += 1;
        legacyExerciseSources.push({
          label: `${document.documentId}:${attribute.exerciseId}:${attribute.attribute}:${formulaIndex}`,
          latex: segment.latex,
          display: false,
        });
      }
    }
    for (const fragment of extractMathFragments(document.body)) {
      const label = `${document.documentId}:body:${fragment.line}`;
      if (!fragment.closed) {
        structuralIssues.push({ label, message: "Unclosed math delimiter." });
      } else {
        sources.push({ label, latex: fragment.latex, display: fragment.kind === "display" });
      }
    }
    for (const fragment of extractFencedMathFragments(document.body)) {
      sources.push({
        label: `${document.documentId}:body:${fragment.line}`,
        latex: fragment.latex,
        display: true,
      });
    }
  }

  const registered: MathValidationSource[] = [
    ...equations.map((equation) => ({
      label: `equation:${equation.id}`,
      latex: equation.latex,
      display: true,
    })),
    ...symbols.map((symbol) => ({
      label: `symbol:${symbol.id}`,
      latex: symbol.latex,
      display: false,
    })),
  ];
  const figureSources: MathValidationSource[] = teachingFigures.flatMap((figure) =>
    figure.panels.flatMap((panel) =>
      panel.elements.flatMap((element, index) =>
        element.kind === "math"
          ? [
              {
                label: `figure:${figure.id}:${panel.title}:${index}`,
                latex: element.latex,
                display: false,
              },
            ]
          : [],
      ),
    ),
  );
  collectStringMath(visualizationManifest, "experiments", supplementarySources);
  collectStringMath([...equations, ...symbols], "math-index-metadata", supplementarySources);
  const legacyExerciseMathDigest = createHash("sha256")
    .update(legacyExerciseMathFingerprints.sort().join("\n"))
    .digest("hex");
  if (
    legacyExerciseMathFingerprints.length !== LEGACY_EXERCISE_MATH_BASELINE.count ||
    legacyExerciseMathDigest !== LEGACY_EXERCISE_MATH_BASELINE.digest
  ) {
    structuralIssues.push({
      label: "exercise-math-attribute-baseline",
      message: `Legacy Exercise math strings changed: expected ${LEGACY_EXERCISE_MATH_BASELINE.count}/${LEGACY_EXERCISE_MATH_BASELINE.digest}, received ${legacyExerciseMathFingerprints.length}/${legacyExerciseMathDigest}. Move new math into ExerciseHint / ExerciseSolution slots; update the baseline only after reviewing an intentional migration.`,
    });
  }
  return {
    documents: documents.length,
    legacyExerciseMathAttributes: legacyExerciseMathFingerprints.length,
    legacyExerciseMathDigest,
    legacyExerciseMathFormulas: legacyExerciseSources.length,
    mdxFormulas: sources.length,
    registeredEquations: equations.length,
    registeredSymbols: symbols.length,
    teachingFigureFormulas: figureSources.length,
    supplementaryFormulas: supplementarySources.length,
    issues: [
      ...structuralIssues,
      ...validateMathSources([
        ...sources,
        ...registered,
        ...figureSources,
        ...supplementarySources,
      ]),
      ...validateMathSources(legacyExerciseSources, "error"),
    ],
  };
}

function collectStringMath(value: unknown, label: string, sources: MathValidationSource[]): void {
  if (typeof value === "string") {
    for (const fragment of extractMathFragments(value)) {
      sources.push({
        label: `${label}:${fragment.line}`,
        latex: fragment.latex,
        display: fragment.kind === "display",
      });
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectStringMath(item, `${label}:${index}`, sources));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value))
      collectStringMath(item, `${label}:${key}`, sources);
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(resolve(entry)).href === import.meta.url;
}

async function main(): Promise<void> {
  const result = await validateAuthoredMath();
  if (result.issues.length > 0) {
    for (const issue of result.issues) console.error(`- ${issue.label}: ${issue.message}`);
    throw new Error(`Math validation failed with ${result.issues.length} issue(s).`);
  }
  console.log(
    `Math validation passed: ${result.documents} document(s), ${result.mdxFormulas} MDX formula(s), ${result.legacyExerciseMathFormulas} legacy Exercise formula(s), ${result.registeredEquations} registered equation(s), ${result.registeredSymbols} registered symbol(s), ${result.teachingFigureFormulas} teaching figure formula(s), ${result.supplementaryFormulas} supplementary formula(s), ${result.legacyExerciseMathAttributes} frozen legacy Exercise math string(s).`,
  );
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
