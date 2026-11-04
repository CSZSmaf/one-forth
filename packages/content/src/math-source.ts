export interface MathFragment {
  readonly kind: "inline" | "display";
  readonly latex: string;
  readonly offset: number;
  readonly line: number;
  readonly closed: boolean;
}

function lineForOffset(source: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function isEscaped(source: string, offset: number): boolean {
  let slashCount = 0;
  for (let index = offset - 1; index >= 0 && source[index] === "\\"; index -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function maskMatch(value: string): string {
  return value.replace(/[^\n]/g, " ");
}

/** Preserve offsets and line numbers while removing code that can legitimately contain `$`. */
export function maskCodeForMath(source: string): string {
  return source
    .replace(/^(?: {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?^(?: {0,3})\1[ \t]*$/gm, maskMatch)
    .replace(/`[^`\n]*`/g, maskMatch);
}

export function extractMathFragments(source: string): readonly MathFragment[] {
  const masked = maskCodeForMath(source);
  const fragments: MathFragment[] = [];
  let offset = 0;

  while (offset < masked.length) {
    if (masked[offset] !== "$" || isEscaped(masked, offset)) {
      offset += 1;
      continue;
    }

    const display = masked[offset + 1] === "$";
    const delimiterLength = display ? 2 : 1;
    let closing = -1;
    for (let cursor = offset + delimiterLength; cursor < masked.length; cursor += 1) {
      if (masked[cursor] !== "$" || isEscaped(masked, cursor)) continue;
      if (display) {
        if (masked[cursor + 1] === "$") {
          closing = cursor;
          break;
        }
      } else if (masked[cursor - 1] !== "$" && masked[cursor + 1] !== "$") {
        closing = cursor;
        break;
      }
    }

    const bodyStart = offset + delimiterLength;
    const bodyEnd = closing >= 0 ? closing : masked.length;
    fragments.push({
      kind: display ? "display" : "inline",
      latex: source.slice(bodyStart, bodyEnd).trim(),
      offset,
      line: lineForOffset(source, offset),
      closed: closing >= 0,
    });
    offset = closing >= 0 ? closing + delimiterLength : masked.length;
  }

  return fragments;
}
