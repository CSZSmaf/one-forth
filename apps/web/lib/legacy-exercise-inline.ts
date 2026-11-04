export type LegacyExerciseInlineSegment =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "math"; readonly latex: string }
  | { readonly kind: "code"; readonly code: string };

const CANDIDATE_PATTERN =
  /[\p{Script=Latin}\p{Script=Greek}\p{N}\p{M}\\_^{}()[\]|⟨⟩〈〉.,:;+\-−–*/=<>!'"%¨˙ᵀ⁺⁻⁼⁽⁾₊₋₌₍₎ᐟ∂∇∑∏∫√∞≈≠≤≥≫≪←→↦↑↓∈∉⊂⊆∪∩⊗⊕⊙∥⊥⟂∧±∓∝∼∘∅⋆†∀∃·×ħℏ]+(?:[ \t]+[\p{Script=Latin}\p{Script=Greek}\p{N}\p{M}\\_^{}()[\]|⟨⟩〈〉.,:;+\-−–*/=<>!'"%¨˙ᵀ⁺⁻⁼⁽⁾₊₋₌₍₎ᐟ∂∇∑∏∫√∞≈≠≤≥≫≪←→↦↑↓∈∉⊂⊆∪∩⊗⊕⊙∥⊥⟂∧±∓∝∼∘∅⋆†∀∃·×ħℏ]+)*/gu;

const STRONG_MATH_SYMBOL_PATTERN =
  /[\p{Script=Greek}\u0300-\u036f¨˙−ᵀᵝᐟ∂∇∑∏∫√∞≈≠≤≥≫≪←→↦↑↓∈∉⊂⊆∪∩⊗⊕⊙∥⊥⟂∧±∓∝∼∘∅⋆†∀∃·×ħℏ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᴱᴴᵐⁿᶠ]/u;

const CODE_SNAKE_IDENTIFIER_PATTERN = /^[a-z]{2,}[a-z0-9]*(?:_[a-z0-9]{2,})+$/u;
const CODE_SNAKE_COMPARISON_PATTERN =
  /^[a-z]{2,}[a-z0-9]*(?:_[a-z0-9]+)+\s*(?:={1,3}|!=|[<>]=?|≤|≥)\s*[a-z]{2,}[a-z0-9]*(?:_[a-z0-9]+)+$/u;
const CODE_OPTION_PATTERN = /^(?:axis|keepdims|dtype|shape|stride)\s*=|^(?:adj|pred|dist)\s*\[/u;
const CODE_SLICE_PATTERN =
  /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?\s*=\s*[A-Za-z_$][\w$]*\[[^\]]*:[^\]]*\]$/u;
const MATRIX_LITERAL_PATTERN = /^(?:[A-Za-z]\s*=\s*)?\[\[[\s\S]*\]\](?:\s+[A-Za-z]+)?$/u;
const FIELD_DEGREE_PATTERN = /\[[A-Z]:[A-Z][^\]]*\]/u;

const GREEK_COMMANDS: Readonly<Record<string, string>> = {
  α: "alpha",
  β: "beta",
  γ: "gamma",
  δ: "delta",
  ε: "epsilon",
  ζ: "zeta",
  η: "eta",
  θ: "theta",
  ι: "iota",
  κ: "kappa",
  λ: "lambda",
  μ: "mu",
  ν: "nu",
  ξ: "xi",
  ο: "omicron",
  π: "pi",
  ρ: "rho",
  σ: "sigma",
  τ: "tau",
  υ: "upsilon",
  φ: "phi",
  χ: "chi",
  ψ: "psi",
  ω: "omega",
  Γ: "Gamma",
  Δ: "Delta",
  Θ: "Theta",
  Λ: "Lambda",
  Ξ: "Xi",
  Π: "Pi",
  Σ: "Sigma",
  Φ: "Phi",
  Ψ: "Psi",
  Ω: "Omega",
};

const SUPERSCRIPT: Readonly<Record<string, string>> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁺": "+",
  "⁻": "-",
  "⁼": "=",
  "⁽": "(",
  "⁾": ")",
};

const LETTER_SUPERSCRIPT: Readonly<Record<string, string>> = {
  ᴱ: "E",
  ᴴ: "H",
  ᵐ: "m",
  ⁿ: "n",
  ᶠ: "F",
};

function convertSuperscriptCharacters(value: string): string {
  return [...value]
    .map((character) => (character === "ᵝ" ? "\\beta" : SUPERSCRIPT[character]))
    .join("");
}

const SUBSCRIPT: Readonly<Record<string, string>> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "₊": "+",
  "₋": "-",
  "₌": "=",
  "₍": "(",
  "₎": ")",
  ₐ: "a",
  ₑ: "e",
  ₕ: "h",
  ᵢ: "i",
  ⱼ: "j",
  ₖ: "k",
  ₗ: "l",
  ₘ: "m",
  ₙ: "n",
  ₒ: "o",
  ₚ: "p",
  ᵣ: "r",
  ₛ: "s",
  ₜ: "t",
  ᵤ: "u",
  ᵥ: "v",
  ₓ: "x",
};

function appendSegment(
  segments: LegacyExerciseInlineSegment[],
  segment: LegacyExerciseInlineSegment,
): void {
  if (segment.kind === "text" && segment.text.length > 0 && segments.at(-1)?.kind === "text") {
    const previous = segments.at(-1);
    if (previous?.kind === "text") {
      segments[segments.length - 1] = { kind: "text", text: previous.text + segment.text };
      return;
    }
  }
  if (
    (segment.kind === "text" && segment.text.length === 0) ||
    (segment.kind === "math" && segment.latex.length === 0) ||
    (segment.kind === "code" && segment.code.length === 0)
  ) {
    return;
  }
  segments.push(segment);
}

function isCodeLike(value: string): boolean {
  const compact = value.trim();
  if (CODE_SNAKE_COMPARISON_PATTERN.test(compact)) return true;
  if (CODE_SNAKE_IDENTIFIER_PATTERN.test(compact)) return true;
  if (CODE_OPTION_PATTERN.test(compact)) return true;
  if (CODE_SLICE_PATTERN.test(compact)) return true;
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?\[\[/u.test(compact)) return true;
  return false;
}

function hasConservativeAsciiRelation(value: string): boolean {
  if (!/[=<>]/u.test(value)) return false;
  const compact = value.trim();
  if (/={2,}|!=/u.test(compact)) return false;
  if (
    /^(?:[A-Za-z][A-Za-z0-9']*\s*=\s*[-+]?[A-Za-z0-9.]+\s*,\s*)+[A-Za-z][A-Za-z0-9']*\s*=\s*[-+]?[A-Za-z0-9.]+$/u.test(
      compact,
    )
  ) {
    return false;
  }
  const operand = "[\\p{L}\\p{N})\\]}]";
  const nextOperand = "[\\p{L}\\p{N}({[]";
  const binaryOperation = new RegExp(`${operand}\\s*[+\\-*/]\\s*${nextOperand}`, "u");
  if (binaryOperation.test(compact)) return true;
  if (/\b[A-Za-z](?:'{1,3})\s*[=<>]/u.test(compact)) return true;
  if (/^[A-Za-z]\[[^\]]+\]\s*[=<>]/u.test(compact)) return true;
  if (/\|\|[^|]+\|\|\s*[=<>]/u.test(compact)) return true;
  if (
    /\b[A-Za-z]*[A-Z][A-Za-z]*\s*=\s*(?:\d+(?:\.\d+)?)?[A-Za-z]*[A-Z][A-Za-z]*\b/u.test(compact)
  ) {
    return true;
  }
  if (
    /(?:^|[=<>])\s*[-+]?\d+(?:\.\d+)?\s*(?:meV|eV|keV|MeV|GeV|Pa|kPa|MPa|V|nC|ps|m|s|K)\b/u.test(
      compact,
    )
  ) {
    return true;
  }
  if (/^[A-Za-z][A-Za-z0-9']*\s*[=<>]\s*[-+]?[A-Za-z0-9.]+$/u.test(compact)) {
    return false;
  }
  if (/^(?:axis|keepdims|dtype|shape|stride)\s*=/u.test(compact)) return false;
  if (/^[^,=<>]+(?:[<>][^,=<>]+){2,}$/u.test(compact)) return true;
  if (/[=<>][^=<>]*[+\-*/^()[\]|]/u.test(compact)) return true;
  if (/\b(?:det|ord|gcd|sin|cos|tan|tanh|log|ln|exp|rank|tr|diag|Var|Cov)\s*\(/u.test(compact)) {
    return true;
  }
  return false;
}

export function hasLegacyExerciseMathSignal(value: string): boolean {
  if (STRONG_MATH_SYMBOL_PATTERN.test(value) || /[\\^]/u.test(value)) return true;
  if (MATRIX_LITERAL_PATTERN.test(value.trim()) || FIELD_DEGREE_PATTERN.test(value)) return true;
  if (/[A-Za-z]_[A-Za-z0-9{+\-]/u.test(value)) return true;
  if (/\b(?:det|ord|gcd|sin|cos|tan|log|ln|exp|rank|tr|diag|Var|Cov)\s*\(/u.test(value)) {
    return true;
  }
  if (/\b[A-Za-z]\([^)]*\)\s*=/u.test(value)) return true;
  if (/\|\s*[A-Za-z]\s*\|\s*[<>=]/u.test(value)) return true;
  if (/\b(?:O|o)\s*\([^)]*\^?[^)]*\)/u.test(value)) return true;
  return hasConservativeAsciiRelation(value);
}

export function hasUnparsedLegacyExerciseMathSyntax(value: string): boolean {
  return (
    STRONG_MATH_SYMBOL_PATTERN.test(value) ||
    /[\\^]/u.test(value) ||
    FIELD_DEGREE_PATTERN.test(value) ||
    /(?:^|[^\p{L}\p{N}])[A-Za-z]_[A-Za-z0-9{+\-]/u.test(value)
  );
}

function replaceUnicodeRoot(value: string): string {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== "√") {
      output += character;
      continue;
    }

    const next = value[index + 1];
    if (next === "(" || next === "{" || next === "[") {
      const close = next === "(" ? ")" : next === "{" ? "}" : "]";
      let depth = 0;
      let end = index + 1;
      for (; end < value.length; end += 1) {
        if (value[end] === next) depth += 1;
        if (value[end] === close) {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      if (end < value.length) {
        output += `\\sqrt{${value.slice(index + 2, end)}}`;
        index = end;
        continue;
      }
    }

    const atom = value
      .slice(index + 1)
      .match(
        /^(?:\d+(?:\.\d+)?|[\p{L}ħℏ]\p{M}*)(?:(?:[_^](?:\{[^{}]*\}|[\p{L}\p{N}]))|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᴱᴴᵐⁿᶠ])*!*/u,
      )?.[0];
    if (atom) {
      output += `\\sqrt{${atom}}`;
      index += atom.length;
      continue;
    }
    output += "\\sqrt{}";
  }
  return output;
}

const REVIEWED_ASCII_SUBSCRIPT_TOKENS = new Set([
  "d_111",
  "d_ff",
  "d_hkl",
  "dU_field",
  "E_CM",
  "E_in",
  "E_tot",
  "fan_in",
  "fan_out",
  "g_00",
  "G_111",
  "gA_boundary",
  "Hn_image",
  "i_00",
  "I_enc",
  "J_ex",
  "J_ext",
  "j_new",
  "j_old",
  "L_ij",
  "M_eff",
  "m_in",
  "m_new",
  "m_old",
  "m_out",
  "M_sys",
  "n_BE",
  "n_eff",
  "N_eff",
  "n_FD",
  "N_pair",
  "p_data",
  "p_ext",
  "P_matter",
  "P_out",
  "p_tot",
  "P_tot",
  "Q_cycle",
  "Q_rev",
  "r_new",
  "r_old",
  "r_unwrapped",
  "r_wrapped",
  "S_gen",
  "S_ii",
  "s_in",
  "S_jj",
  "s_out",
  "U_cycle",
  "u_tt",
  "u_xx",
  "V_cm",
  "V_in",
  "v_liquid",
  "V_mn",
  "V_out",
  "v_solid",
  "W_cycle",
  "w_ij",
  "W_on",
]);

const REVIEWED_GREEK_SUBSCRIPT_REPLACEMENTS: Readonly<Record<string, string>> = {
  δ_ij: "δ_{ij}",
  λ_max: "λ_{max}",
  μ_batch: "μ_{\\mathrm{batch}}",
  Σ_final: "Σ_{\\mathrm{final}}",
  Σ_ij: "Σ_{ij}",
  τ_int: "τ_{\\mathrm{int}}",
  τ_SI: "τ_{\\mathrm{SI}}",
  ω_max: "ω_{max}",
};

const REVIEWED_ADJACENT_FACTOR_REPLACEMENTS: Readonly<Record<string, string>> = {
  "2dd_ff": "2d d_{ff}",
  j_oldS: "j_{old}S",
  k_BT: "k_B T",
  k_eq: "k_e q",
  Nk_BT: "Nk_B T",
  nk_BT: "nk_B T",
  "2NJ_ex": "2N J_{ex}",
  P_Mx: "P_M x",
  R_gh: "R_g h",
  S_gf: "S_g f",
  T_gx: "T_g x",
  "∂_tu": "∂_t u",
  "∂_xu": "∂_x u",
  "∂_yv": "∂_y v",
  "∂_jg": "∂_j g",
  "∂_jg_00": "∂_j g_00",
  "∂_rV": "∂_r V",
  "∂_tn": "∂_t n",
  "∇_iV": "∇_i V",
  μ_kN: "μ_k N",
  μ_smg: "μ_s mg",
  μ_sN: "μ_s N",
  ρ_jV: "ρ_j V",
  ρ_jV_j: "ρ_j V_j",
  Σ_jw_ij: "Σ_j w_{ij}",
  Σ_jw: "Σ_j w",
  Σ_pE: "Σ_p E",
  Σ_pE_p: "Σ_p E_p",
  ω_at: "ω_a t",
  ω_it: "ω_i t",
  ω_st: "ω_s t",
};

const REVIEWED_ADJACENT_FUNCTION_REPLACEMENTS: Readonly<Record<string, string>> = {
  atan2: "\\operatorname{atan2}",
  Ksin: "K\\sin ",
  ln210: "\\ln 210",
  ln2: "\\ln 2",
  ln4: "\\ln 4",
  lnZ: "\\ln Z",
  "log0.1": "\\log 0.1",
  log2: "\\log 2",
  log4: "\\log 4",
  mBcos: "mB\\cos ",
  mBsin: "mB\\sin ",
};

const REVIEWED_POSTFIX_STAR_SYMBOLS = new Set(["a", "b", "D", "F", "f", "M", "m", "q", "φ", "ψ"]);

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function groupReviewedSubscripts(value: string): string {
  let normalized = value;
  for (const [token, replacement] of Object.entries(REVIEWED_ADJACENT_FACTOR_REPLACEMENTS).sort(
    ([left], [right]) => right.length - left.length,
  )) {
    normalized = normalized.replace(
      new RegExp(`${escapeRegularExpression(token)}(?![\\p{L}\\p{N}_])`, "gu"),
      replacement,
    );
  }
  normalized = normalized.replace(/\b([A-Za-z])_([A-Za-z])(?=[A-Za-z]_[A-Za-z]\b)/gu, "$1_{$2}");
  normalized = normalized.replace(
    /\\(dot|ddot|hat|bar|tilde|mathring)\{([A-Za-z])\}_([A-Za-z0-9]{2,})(?![\p{L}\p{N}_])/gu,
    (whole, accent: string, base: string, subscript: string) =>
      REVIEWED_ASCII_SUBSCRIPT_TOKENS.has(`${base}_${subscript}`)
        ? `\\${accent}{${base}}_{${subscript}}`
        : whole,
  );
  for (const token of [...REVIEWED_ASCII_SUBSCRIPT_TOKENS].sort(
    (left, right) => right.length - left.length,
  )) {
    const separator = token.indexOf("_");
    const base = token.slice(0, separator);
    const subscript = token.slice(separator + 1);
    normalized = normalized.replace(
      new RegExp(`(?<![A-Za-z0-9_])${escapeRegularExpression(token)}(?![A-Za-z0-9_])`, "gu"),
      `${base}_{${subscript}}`,
    );
  }
  return normalized.replace(
    /[α-ωΓΔΘΛΞΠΣΦΨΩ]_[A-Za-z][A-Za-z0-9]*/gu,
    (token) => REVIEWED_GREEK_SUBSCRIPT_REPLACEMENTS[token] ?? token,
  );
}

function replaceReviewedAdjacentFunctions(value: string): string {
  let normalized = value;
  for (const [token, replacement] of Object.entries(REVIEWED_ADJACENT_FUNCTION_REPLACEMENTS).sort(
    ([left], [right]) => right.length - left.length,
  )) {
    const lookahead =
      token === "mBsin" || token === "mBcos"
        ? "(?=\\\\theta\\b)"
        : token === "Ksin"
          ? "(?=\\^\\{2\\})"
          : token === "atan2"
            ? "(?=\\()"
            : "(?![\\p{L}\\p{N}_])";
    normalized = normalized.replace(
      new RegExp(`${escapeRegularExpression(token)}${lookahead}`, "gu"),
      replacement,
    );
  }
  return normalized;
}

export function normalizeLegacyExerciseLatex(value: string): string {
  let normalized = value.trim().normalize("NFD");
  normalized = normalized.replace(
    /(?<=[\p{L}\p{N})\]}])\\{2,}(?=[\p{L}\p{N}({[])/gu,
    "\\setminus ",
  );
  normalized = normalized
    .replace(
      /⁻ᵝ⁽([^⁾]+)⁾/gu,
      (_match, inner: string) => `^{-\\beta(${inner.replaceAll("⁻", "-")})}`,
    )
    .replace(
      /([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼ᵝ]+)ᐟ([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼]+|[\p{L}])/gu,
      (_match, numerator: string, denominator: string) => {
        const convertedDenominator = /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼]+$/u.test(denominator)
          ? convertSuperscriptCharacters(denominator)
          : denominator;
        return `^{${convertSuperscriptCharacters(numerator)}/${convertedDenominator}}`;
      },
    );
  normalized = normalized
    .replace(/([\p{L}])\u0307/gu, "\\dot{$1}")
    .replace(/([\p{L}])\u0308/gu, "\\ddot{$1}")
    .replace(/([\p{L}])¨/gu, "\\ddot{$1}")
    .replace(/([\p{L}])˙/gu, "\\dot{$1}")
    .replace(/([\p{L}])\u0302/gu, "\\hat{$1}")
    .replace(/([\p{L}])\u0304/gu, "\\bar{$1}")
    .replace(/([\p{L}])\u0303/gu, "\\tilde{$1}")
    .replace(/([\p{L}])\u030a/gu, "\\mathring{$1}")
    .replace(/=\u0338/gu, "\\ne ")
    .replace(/∈\u0338/gu, "\\notin ")
    .replace(/\bdot([\p{Script=Greek}A-Za-z])/gu, "\\dot{$1}")
    .replaceAll("mbarψ", "m\\bar{ψ}")
    .replaceAll("barψ", "\\bar{ψ}")
    .replace(/(?<![\p{L}\p{N}_])Qdot(?![\p{L}\p{N}_])/gu, "\\dot{Q}")
    .replace(/([A-Za-zα-ω])\*/gu, (whole, symbol: string) =>
      REVIEWED_POSTFIX_STAR_SYMBOLS.has(symbol) ? `${symbol}^{*}` : whole,
    );
  normalized = replaceUnicodeRoot(normalized);
  normalized = groupReviewedSubscripts(normalized);
  normalized = normalized
    .replace(
      /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+/gu,
      (match) => `^{${[...match].map((character) => SUPERSCRIPT[character]).join("")}}`,
    )
    .replace(
      /[ᴱᴴᵐⁿᶠ]+/gu,
      (match) => `^{${[...match].map((character) => LETTER_SUPERSCRIPT[character]).join("")}}`,
    )
    .replace(
      /[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ]+/gu,
      (match) => `_{${[...match].map((character) => SUBSCRIPT[character]).join("")}}`,
    )
    .replaceAll("−", "-")
    .replaceAll("–", "-")
    .replaceAll("∂", "\\partial ")
    .replaceAll("∇", "\\nabla ")
    .replaceAll("∑", "\\sum ")
    .replaceAll("∏", "\\prod ")
    .replaceAll("∫", "\\int ")
    .replaceAll("∞", "\\infty ")
    .replaceAll("≈", "\\approx ")
    .replaceAll("≠", "\\ne ")
    .replaceAll("≤", "\\le ")
    .replaceAll("≥", "\\ge ")
    .replaceAll("≫", "\\gg ")
    .replaceAll("≪", "\\ll ")
    .replaceAll("←", "\\leftarrow ")
    .replaceAll("→", "\\to ")
    .replaceAll("↦", "\\mapsto ")
    .replaceAll("↑", "\\uparrow ")
    .replaceAll("↓", "\\downarrow ")
    .replaceAll("∈", "\\in ")
    .replaceAll("∉", "\\notin ")
    .replaceAll("⊂", "\\subset ")
    .replaceAll("⊆", "\\subseteq ")
    .replaceAll("∪", "\\cup ")
    .replaceAll("∩", "\\cap ")
    .replaceAll("⊗", "\\otimes ")
    .replaceAll("⊕", "\\oplus ")
    .replaceAll("⊙", "\\odot ")
    .replaceAll("∥", "\\parallel ")
    .replaceAll("⊥", "\\perp ")
    .replaceAll("⟂", "\\perp ")
    .replaceAll("∧", "\\wedge ")
    .replaceAll("±", "\\pm ")
    .replaceAll("∓", "\\mp ")
    .replaceAll("∝", "\\propto ")
    .replaceAll("∼", "\\sim ")
    .replaceAll("∘", "\\circ ")
    .replaceAll("∅", "\\varnothing ")
    .replaceAll("⋆", "\\star ")
    .replaceAll("†", "^{\\dagger}")
    .replaceAll("∀", "\\forall ")
    .replaceAll("∃", "\\exists ")
    .replaceAll("·", "\\cdot ")
    .replaceAll("×", "\\times ")
    .replaceAll("⟨", "\\langle ")
    .replaceAll("⟩", "\\rangle ")
    .replaceAll("〈", "\\langle ")
    .replaceAll("〉", "\\rangle ")
    .replace(/[ħℏ]/gu, "\\hbar ")
    .replaceAll("ᵀ", "^{\\mathsf T}")
    .replaceAll("ᵝ", "^{\\beta}")
    .replace(/[α-ωΓΔΘΛΞΠΣΦΨΩ]/gu, (character) => {
      const command = GREEK_COMMANDS[character];
      return command ? `\\${command} ` : character;
    })
    .replace(/\bBox\b/gu, "\\Box ")
    .replace(/\bslash\s+([A-Za-z])/gu, "\\not\\!$1")
    .replace(/(?<=\d)\s+(meV|eV|keV|MeV|GeV|Pa|kPa|MPa|V|nC|ps|m|s|K)\b/gu, "\\,\\mathrm{$1}")
    .replace(/\b(?:ord|rank|diag|tr|Tr|Var|Cov|sign)\b/gu, (name) => `\\operatorname{${name}}`)
    .replace(
      /(?<![A-Za-z_\\])(?:det|gcd|sin|cos|tan|tanh|log|ln|exp|min|max)(?=\b|_)/gu,
      (name) => `\\${name}`,
    )
    .replace(/E_\{CM\},\\min\b/gu, "E_{CM,\\mathrm{min}}")
    .replace(/(?<![A-Za-z])Im(?=\()/gu, "\\operatorname{Im}");
  normalized = replaceReviewedAdjacentFunctions(normalized)
    .replace(/[ \t]+/gu, " ")
    .replace(/\s+([_^=+\-*/<>({}),\]}])/gu, "$1")
    .replace(/([=+\-*/<>])\s+/gu, "$1")
    .replace(/([({[])\s+/gu, "$1")
    .trim();
  return normalized;
}

function parseUndelimitedText(value: string): LegacyExerciseInlineSegment[] {
  const segments: LegacyExerciseInlineSegment[] = [];
  let cursor = 0;
  for (const match of value.matchAll(CANDIDATE_PATTERN)) {
    const offset = match.index ?? 0;
    appendSegment(segments, { kind: "text", text: value.slice(cursor, offset) });
    const candidate = match[0];
    if (isCodeLike(candidate)) {
      appendSegment(segments, { kind: "code", code: candidate });
    } else if (hasLegacyExerciseMathSignal(candidate)) {
      appendSegment(segments, {
        kind: "math",
        latex: normalizeLegacyExerciseLatex(candidate),
      });
    } else {
      appendSegment(segments, { kind: "text", text: candidate });
    }
    cursor = offset + candidate.length;
  }
  appendSegment(segments, { kind: "text", text: value.slice(cursor) });
  return segments;
}

export function parseLegacyExerciseInline(value: string): readonly LegacyExerciseInlineSegment[] {
  const segments: LegacyExerciseInlineSegment[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const dollar = value.indexOf("$", cursor);
    const backtick = value.indexOf("`", cursor);
    const candidates = [dollar, backtick].filter((offset) => offset >= 0);
    if (candidates.length === 0) {
      for (const segment of parseUndelimitedText(value.slice(cursor)))
        appendSegment(segments, segment);
      break;
    }

    const start = Math.min(...candidates);
    for (const segment of parseUndelimitedText(value.slice(cursor, start))) {
      appendSegment(segments, segment);
    }
    const delimiter = value[start];
    if (delimiter !== "$" && delimiter !== "`") {
      appendSegment(segments, { kind: "text", text: value.slice(start) });
      break;
    }
    const end = value.indexOf(delimiter, start + 1);
    if (end < 0) {
      appendSegment(segments, { kind: "text", text: value.slice(start) });
      break;
    }
    const inner = value.slice(start + 1, end);
    appendSegment(
      segments,
      delimiter === "$" ? { kind: "math", latex: inner.trim() } : { kind: "code", code: inner },
    );
    cursor = end + 1;
  }

  return segments;
}
