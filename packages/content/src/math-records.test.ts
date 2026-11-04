import { describe, expect, it } from "vitest";
import { chapterMathCoverage, curriculumData, equations, mathIndexBooks, symbols } from "./index";
import {
  extractEquationSymbolTokens,
  mergeMathLocations,
  nearbyAssumptionStatements,
  nearbyBoundaryStatement,
  resolveDerivedUnitProfile,
  stableDerivedEquationId,
  withSymbolConflicts,
  type SymbolDefinitionV2,
} from "./math-index";
import { extractMathFragments } from "./math-source";

const invalidControlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

describe("math index accessibility records", () => {
  it("provides versioned text alternatives, locations, and unit state for every symbol", () => {
    expect(symbols.length).toBeGreaterThan(0);
    symbols.forEach((symbol) => {
      expect(symbol.schemaVersion, symbol.id).toBe(2);
      expect(symbol.latex.trim(), symbol.id).not.toBe("");
      expect(symbol.plainText.trim(), symbol.id).not.toBe("");
      expect(symbol.accessibleLabel["zh-CN"].trim(), symbol.id).not.toBe("");
      expect(invalidControlCharacters.test(symbol.latex), symbol.id).toBe(false);
      expect(symbol.locations.length, symbol.id).toBeGreaterThan(0);
      if (symbol.unitKind === "physical") expect(symbol.unit, symbol.id).toBeTruthy();
    });
  });

  it("preserves LaTeX command backslashes instead of JavaScript escapes", () => {
    const latexById = new Map(symbols.map((symbol) => [symbol.id, symbol.latex] as const));
    expect(latexById.get("unit-direction-u")).toBe("\\mathbf{u}");
    expect(latexById.get("vector-y")).toBe("\\mathbf{y}");
    expect(latexById.get("eigenvalue-lambda")).toBe("\\lambda");
    expect(latexById.get("eigenvector-v")).toBe("\\mathbf{v}");
    expect(latexById.get("model-parameters-theta")).toBe("\\boldsymbol{\\theta}");
    expect(latexById.get("learning-rate-eta")).toBe("\\eta");
    expect(latexById.get("a00-loss-risk-evaluation-symbol-f-sub-theta")).toBe("f_{\\theta}");
    expect(latexById.get("a09-score-diffusion-symbol-epsilon-sub-theta")).toBe(
      "\\epsilon_{\\theta}",
    );
  });

  it("indexes one to three representative equations or a reason for every chapter", () => {
    expect(chapterMathCoverage).toHaveLength(curriculumData.chapters.length);
    expect(mathIndexBooks).toHaveLength(curriculumData.books.length);
    const knownEquationIds = new Set(equations.map((equation) => equation.id));
    chapterMathCoverage.forEach((coverage) => {
      if (coverage.status === "indexed") {
        expect(coverage.equationIds.length, coverage.chapterId).toBeGreaterThanOrEqual(1);
        expect(coverage.equationIds.length, coverage.chapterId).toBeLessThanOrEqual(3);
      } else {
        expect(coverage.reason?.trim(), coverage.chapterId).not.toBe("");
      }
      coverage.equationIds.forEach((id) => expect(knownEquationIds.has(id), id).toBe(true));
    });
  });

  it("provides complete V2 metadata and resolves every variable through the symbol table", () => {
    const indexedEquationIds = new Set(
      chapterMathCoverage.flatMap((coverage) => coverage.equationIds),
    );
    expect(indexedEquationIds.size).toBe(equations.length);
    [
      "linear-transformation",
      "derivative-definition",
      "directional-derivative",
      "eigenvalue-equation",
      "expectation-discrete",
      "variance-definition",
      "gradient-descent-update",
      "scaled-dot-product-attention",
      "fourier-series-real",
      "wave-equation-1d",
    ].forEach((id) => expect(indexedEquationIds.has(id), id).toBe(true));
    const knownSymbolIds = new Set(symbols.map((symbol) => symbol.id));
    equations.forEach((equation) => {
      expect(equation.schemaVersion, equation.id).toBe(2);
      expect(equation.latex.trim(), equation.id).not.toBe("");
      expect(equation.plainText.trim(), equation.id).not.toBe("");
      expect(equation.accessibleLabel["zh-CN"].trim(), equation.id).not.toBe("");
      expect(equation.assumptions.length, equation.id).toBeGreaterThan(0);
      expect(equation.source, equation.id).toBeDefined();
      expect(equation.derivations.length, equation.id).toBeGreaterThan(0);
      expect(equation.applications.length, equation.id).toBeGreaterThan(0);
      expect(equation.limitingCases.length, equation.id).toBeGreaterThan(0);
      equation.variables.forEach((variable) =>
        expect(knownSymbolIds.has(variable.symbolId), `${equation.id}:${variable.symbolId}`).toBe(
          true,
        ),
      );
      expect(invalidControlCharacters.test(equation.latex), equation.id).toBe(false);
    });
  });

  it("keeps assumptions, applications, and limiting cases free of broken or raw TeX", () => {
    const rawLatexOutsideMath = /\\[A-Za-z]+|(?<![A-Za-z0-9])[_^]\{?[A-Za-z\\]|\$\$?/u;
    for (const equation of equations) {
      const fields = [
        ...equation.assumptions.map((assumption) => assumption["zh-CN"]),
        ...equation.applications,
        ...equation.limitingCases,
      ];
      for (const value of fields) {
        expect(value.trim(), equation.id).not.toBe("");
        expect(value, equation.id).not.toMatch(/(?:^|\s)#{1,6}\s|<\/?[A-Z][A-Za-z]*\b/u);
        expect(value, equation.id).not.toMatch(
          /；相应关系由本条公式给出|本条公式所列|^(?:设|若|然而|且|更新[:：]?)[。！？]$/u,
        );
        expect(
          extractMathFragments(value).every((fragment) => fragment.closed),
          `${equation.id}: ${value}`,
        ).toBe(true);
        const proseOnly = value.replace(/\$\$[\s\S]*?\$\$|(?<!\\)\$(?:\\.|[^$])+?(?<!\\)\$/gu, " ");
        expect(proseOnly, `${equation.id}: ${value}`).not.toMatch(rawLatexOutsideMath);
      }
    }
  });

  it("keeps representative physical quantities and dimensionless groups explicit", () => {
    const symbolsByChapter = new Map<string, typeof symbols>();
    for (const symbol of symbols) {
      for (const location of symbol.locations) {
        symbolsByChapter.set(location.chapterId, [
          ...(symbolsByChapter.get(location.chapterId) ?? []),
          symbol,
        ]);
      }
    }
    const equilibrium = symbolsByChapter.get("p05-equilibrium-state") ?? [];
    for (const token of ["p", "V", "T", "n"]) {
      const symbol = equilibrium.find((candidate) => candidate.plainText === token);
      expect(symbol?.unitKind, `equilibrium:${token}`).toBe("physical");
      expect(symbol?.unit, `equilibrium:${token}`).toBeTruthy();
    }
    const lorentz = symbolsByChapter.get("p08-lorentz-transform") ?? [];
    for (const token of ["beta", "gamma"]) {
      expect(
        lorentz.find((candidate) => candidate.plainText.toLocaleLowerCase() === token)?.unitKind,
        `lorentz:${token}`,
      ).toBe("dimensionless");
    }
  });
});

describe("math index derivation primitives", () => {
  it("preserves TeX token boundaries next to Greek commands and inside indices", () => {
    expect(extractEquationSymbolTokens(String.raw`W_2\phi(W_1x+b_1)`)).toEqual([
      "W_2",
      "phi",
      "W_1",
      "x",
      "b_1",
    ]);
    expect(extractEquationSymbolTokens(String.raw`\beta\theta_{t-1}`)).toEqual([
      "beta",
      "theta_t-1",
    ]);
    expect(extractEquationSymbolTokens(String.raw`R_{\mu\nu}+a_{k\mu}`)).toEqual([
      "R_mu nu",
      "a_k mu",
    ]);
    expect(extractEquationSymbolTokens(String.raw`u_x\Delta x+v_y\Delta y`)).toEqual([
      "u_x",
      "Delta",
      "x",
      "v_y",
      "y",
    ]);
  });

  it("uses complete prose around formulas and never indexes fenced code as metadata", () => {
    const body = [
      "## 稳定条件",
      "",
      "```ts",
      "// 若伪参数满足 fake_condition，则不要把代码当作正文。",
      "const raw = String.raw`\\\\frac{x}{y}`;",
      "",
      "const marker = '$not-math$';",
      "```",
      "",
      "给定连续函数 $f$ 与平衡点 $y_*$，并假设参数保持在声明的定义域内。",
      "",
      "$$",
      "f(x)=x^2",
      "$$",
      "",
      "当参数趋于零时，该模型退化为常数映射。",
    ].join("\n");
    const offset = body.indexOf("$$");

    const assumptions = nearbyAssumptionStatements(body, offset, "平方映射");
    expect(assumptions).toContain(
      "给定连续函数 $f$ 与平衡点 $y_*$，并假设参数保持在声明的定义域内。",
    );
    expect(assumptions.join("\n")).not.toMatch(/fake_condition|String\.raw|not-math/u);
    expect(nearbyBoundaryStatement(body, offset)).toBe("当参数趋于零时，该模型退化为常数映射。");
  });

  it("extracts compound symbols and excludes operators, number fields, transposes, and units", () => {
    expect(
      extractEquationSymbolTokens(
        "\\operatorname{Attention}(Q,K,V)=\\operatorname{softmax}(QK^\\mathsf{T}/\\sqrt{d_k})V",
      ),
    ).toEqual(["Q", "K", "V", "d_k"]);
    expect(extractEquationSymbolTokens("\\mathbb{E}[X]=\\sum_x x p_X(x)")).toEqual([
      "X",
      "x",
      "p_X",
    ]);
    expect(
      extractEquationSymbolTokens("\\Phi_E=Ea^2\\;\\mathrm{J\\,mol^{-1}},\\quad x\\in\\mathbb R"),
    ).toEqual(expect.arrayContaining(["Phi_E", "E", "a", "x"]));
    expect(
      extractEquationSymbolTokens("\\Phi_E=Ea^2\\;\\mathrm{J\\,mol^{-1}},\\quad x\\in\\mathbb R"),
    ).not.toEqual(expect.arrayContaining(["J", "R", "mol"]));
    expect(extractEquationSymbolTokens("\\int_a^b f(x)\\,dx")).toEqual(["a", "b", "f", "x"]);
  });

  it("resolves namespace-aware units without guessing from a single letter", () => {
    expect(resolveDerivedUnitProfile("physics", "physics.statistical-physics", "p_i")).toEqual({
      unitKind: "dimensionless",
    });
    expect(resolveDerivedUnitProfile("physics", "physics.electromagnetism", "Phi_E").unit).toBe(
      "volt-metre",
    );
    expect(resolveDerivedUnitProfile("physics", "physics.electromagnetism", "Phi_B").unit).toBe(
      "weber",
    );
    expect(resolveDerivedUnitProfile("physics", "physics.quantum-mechanics", "L").unit).toBe(
      "joule-second",
    );
    expect(resolveDerivedUnitProfile("physics", "physics.measurement", "L")).toEqual({
      unitKind: "contextual",
    });
    expect(resolveDerivedUnitProfile("physics", "physics.thermodynamics", "R", "pV=nRT").unit).toBe(
      "joule-per-mole-kelvin",
    );
  });

  it("keeps derived ids stable and merges all distinct anchors", () => {
    expect(stableDerivedEquationId("chapter", "x = y")).toBe(
      stableDerivedEquationId("chapter", "x=y"),
    );
    expect(stableDerivedEquationId("chapter", "x=y")).not.toBe(
      stableDerivedEquationId("chapter", "x=z"),
    );
    expect(
      mergeMathLocations(
        [{ documentId: "doc", chapterId: "chapter", anchorId: "a" }],
        [
          { documentId: "doc", chapterId: "chapter", anchorId: "a" },
          { documentId: "doc", chapterId: "chapter", anchorId: "b" },
        ],
      ),
    ).toHaveLength(2);
  });

  it("builds symmetric conflicts in the same or different namespace", () => {
    const makeSymbol = (id: string, namespace: string): SymbolDefinitionV2 => ({
      schemaVersion: 2,
      id,
      latex: "x",
      plainText: "x",
      accessibleLabel: { "zh-CN": id },
      meaning: { "zh-CN": id },
      namespace,
      unitKind: "not-applicable",
      assumptions: [],
      aliases: [],
      conflictsWith: [],
      locations: [{ documentId: id, chapterId: id, anchorId: "definition" }],
    });
    const indexed = withSymbolConflicts([
      makeSymbol("first", "math.analysis"),
      makeSymbol("second", "math.analysis"),
      makeSymbol("third", "physics.waves"),
    ]);
    indexed.forEach((symbol) => {
      expect(symbol.conflictsWith).toHaveLength(2);
      expect(symbol.conflictsWith).not.toContain(symbol.id);
    });
  });
});
