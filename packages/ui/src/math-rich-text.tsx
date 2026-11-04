import type { ReactNode } from "react";
import { StaticMath } from "./static-math";

export type MathRichTextSegment =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "math"; readonly latex: string; readonly sourceDisplay: boolean };

const mathDelimiterPattern = /\$\$([\s\S]*?)\$\$|(?<!\\)\$((?:\\.|[^$])+?)(?<!\\)\$/gu;

export function parseMathRichText(value: string): readonly MathRichTextSegment[] {
  const segments: MathRichTextSegment[] = [];
  let cursor = 0;
  for (const match of value.matchAll(mathDelimiterPattern)) {
    const start = match.index ?? 0;
    if (start > cursor) segments.push({ kind: "text", text: value.slice(cursor, start) });
    const displayLatex = match[1];
    const latex = (displayLatex ?? match[2] ?? "").trim();
    if (latex) {
      segments.push({ kind: "math", latex, sourceDisplay: displayLatex !== undefined });
    }
    cursor = start + match[0].length;
  }
  if (cursor < value.length) segments.push({ kind: "text", text: value.slice(cursor) });
  return segments;
}

interface MathRichTextProps {
  readonly value: string;
  readonly prefix?: ReactNode;
  readonly className?: string;
  readonly mathClassName?: string;
}

interface MathRichTextContentProps {
  readonly value: string;
  readonly mathClassName?: string;
}

export function MathRichTextContent({ value, mathClassName }: MathRichTextContentProps) {
  return parseMathRichText(value).map((segment, index) =>
    segment.kind === "math" ? (
      <StaticMath
        key={`math-${index}-${segment.latex}`}
        latex={segment.latex}
        className={["static-math--authored", mathClassName].filter(Boolean).join(" ")}
      />
    ) : (
      <span key={`text-${index}`}>{segment.text}</span>
    ),
  );
}

export function MathRichText({ value, prefix, className, mathClassName }: MathRichTextProps) {
  return (
    <p className={className}>
      {prefix}
      <MathRichTextContent value={value} {...(mathClassName ? { mathClassName } : {})} />
    </p>
  );
}
