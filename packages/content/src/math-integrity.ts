export interface MathIntegrityIssue {
  readonly offset: number;
  readonly message: string;
}

// These command names are distinctive in math mode. Short products such as
// mu (m times u), nu (n times u), int (i times n times t), and rm remain valid.
const bareCommand =
  /(?<![\\A-Za-z])(?:mathrm|mathbf|mathbb|mathcal|mathsf|mathit|mathtt|mathscr|operatorname|boldsymbol|dfrac|tfrac|frac|sqrt|overline|underline|overbrace|underbrace|widetilde|widehat|lfloor|rfloor|lceil|rceil|partial|nabla|infty|quad|qquad|cdots|ldots|cdot|times|leq|geq|neq|subseteq|supseteq|varepsilon|epsilon|alpha|beta|gamma|delta|theta|lambda|sigma|omega|kappa|eta|phi|ell|dagger|Delta|Gamma|Theta|Lambda|Sigma|Omega|begin|end|left|right|approx|longrightarrow|sum|prod|log|sin|cos|tan)(?![A-Za-z])/gu;

function maskLiteralGroups(source: string): string {
  const characters = source.split("");
  const group =
    /\\(?:text(?:rm|tt|sf|it|bf|normal)?|mathrm|operatorname|mathsf|mathtt|begin|end|color|textcolor)\*?\s*\{/gu;
  for (const match of source.matchAll(group)) {
    let depth = 1;
    let index = match.index + match[0].length;
    for (; index < source.length && depth > 0; index += 1) {
      if (source[index] === "\\") {
        index += 1;
        continue;
      }
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
    }
    for (let cursor = match.index; cursor < index; cursor += 1) characters[cursor] = " ";
  }
  return characters.join("");
}

/** Detects corruption that a TeX parser can accept as ordinary math letters. */
export function inspectMathIntegrity(latex: string): readonly MathIntegrityIssue[] {
  const issues: MathIntegrityIssue[] = [];
  for (const match of latex.matchAll(
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ufffd\u200b\u2060\ufeff]/gu,
  )) {
    issues.push({ offset: match.index, message: "Damaged or invisible character in formula." });
  }
  for (const match of maskLiteralGroups(latex).matchAll(bareCommand)) {
    issues.push({
      offset: match.index,
      message: `Missing backslash before LaTeX command ${match[0]}.`,
    });
  }
  return issues;
}
