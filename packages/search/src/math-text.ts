const symbolCommands: ReadonlyMap<string, string> = new Map([
  ["∂", "partial"],
  ["∇", "nabla"],
  ["∫", "int"],
  ["∬", "iint"],
  ["∭", "iiint"],
  ["∮", "oint"],
  ["∑", "sum"],
  ["∏", "prod"],
  ["∞", "infty"],
  ["√", "sqrt"],
  ["≤", "leq"],
  ["≥", "geq"],
  ["≠", "neq"],
  ["≈", "approx"],
  ["∈", "in"],
  ["∉", "notin"],
  ["⊂", "subset"],
  ["⊆", "subseteq"],
  ["⊃", "supset"],
  ["⊇", "supseteq"],
  ["∪", "cup"],
  ["∩", "cap"],
  ["→", "to"],
  ["↦", "mapsto"],
  ["×", "times"],
  ["⋅", "cdot"],
  ["±", "pm"],
  ["∓", "mp"],
  ["÷", "div"],
  ["α", "alpha"],
  ["β", "beta"],
  ["γ", "gamma"],
  ["δ", "delta"],
  ["ε", "epsilon"],
  ["ζ", "zeta"],
  ["η", "eta"],
  ["θ", "theta"],
  ["ι", "iota"],
  ["κ", "kappa"],
  ["λ", "lambda"],
  ["μ", "mu"],
  ["ν", "nu"],
  ["ξ", "xi"],
  ["π", "pi"],
  ["ρ", "rho"],
  ["σ", "sigma"],
  ["ς", "sigma"],
  ["τ", "tau"],
  ["υ", "upsilon"],
  ["φ", "phi"],
  ["χ", "chi"],
  ["ψ", "psi"],
  ["ω", "omega"],
]);

const commandAliases: ReadonlyMap<string, string> = new Map([
  ["le", "leq"],
  ["ge", "geq"],
  ["ne", "neq"],
  ["rightarrow", "to"],
  ["varepsilon", "epsilon"],
  ["vartheta", "theta"],
  ["varphi", "phi"],
  ["varpi", "pi"],
  ["varrho", "rho"],
  ["varsigma", "sigma"],
]);

/** Gives Unicode notation and TeX commands the same searchable spelling. */
export function normalizeMathSearchText(text: string, locale: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase(locale)
    .replace(/\\[a-z]+|[\p{Sm}\p{Script=Greek}]/gu, (token) => {
      if (token.startsWith("\\")) {
        const command = token.slice(1);
        return ` \\${commandAliases.get(command) ?? command} `;
      }
      const command = symbolCommands.get(token);
      return command ? ` \\${command} ` : token;
    })
    .replace(/\s+/gu, " ")
    .trim();
}
