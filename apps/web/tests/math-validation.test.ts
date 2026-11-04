import { describe, expect, it } from "vitest";
import {
  extractFencedMathFragments,
  extractLegacyExerciseMathAttributes,
  extractLegacyExerciseStringAttributes,
  validateMathSources,
} from "@/scripts/validate-authored-math";

describe("authored math validation", () => {
  it("rejects missing command backslashes that KaTeX accepts as letters", () => {
    const cases = [
      "mathrm T",
      "C_{mathrm{el}}",
      "x,qquad y",
      "sum_i x_i+epsilon",
      "x-eta g",
      "x\uFFFD",
      "x\u000cy",
    ];
    expect(
      validateMathSources(
        cases.map((latex, index) => ({ label: String(index), latex, display: false })),
      ),
    ).toEqual(
      expect.arrayContaining(
        cases.map((_, index) => expect.objectContaining({ label: String(index) })),
      ),
    );
  });

  it("accepts literal words, correct commands, and genuine variable products", () => {
    const cases = [
      String.raw`\mathrm{T}`,
      String.raw`\kappa_{\mathrm{sum}}`,
      String.raw`\text{alpha and beta}`,
      String.raw`\operatorname{int} A`,
      String.raw`mu=(M+m)V`,
      String.raw`\frac{nu}{1-nu}`,
      String.raw`e^{int}`,
      String.raw`rm+rn`,
    ];
    expect(
      validateMathSources(cases.map((latex) => ({ label: latex, latex, display: false }))),
    ).toEqual([]);
  });

  it("strictly parses valid TeX and reports invalid TeX", () => {
    const issues = validateMathSources([
      { label: "valid", latex: "\\frac{x}{y}", display: false },
      { label: "invalid", latex: "\\frac{x", display: true },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.label).toBe("invalid");
    expect(issues[0]?.message).toMatch(/parse error/i);
  });

  it("extracts fenced math as a display formula with its source line", () => {
    const fragments = extractFencedMathFragments(
      ["正文", "```math", "\\sum_{i=1}^n i", "```", "结尾"].join("\n"),
    );

    expect(fragments).toEqual([{ latex: "\\sum_{i=1}^n i", line: 2 }]);
  });

  it("rejects math in legacy exercise strings while allowing prose and inline code", () => {
    const attributes = extractLegacyExerciseMathAttributes(
      [
        '<Exercise hint="先回忆定义。" solution="把 $x^2$ 代回原式。">',
        "题目",
        "</Exercise>",
        '<Exercise hint="字段 `device_id` 保持不变。" solution="得到 T^μ_ν=0。">题目</Exercise>',
      ].join("\n"),
    );

    expect(attributes).toEqual([
      {
        attribute: "solution",
        exerciseId: "unknown-exercise",
        line: 1,
        value: "把 $x^2$ 代回原式。",
      },
      {
        attribute: "solution",
        exerciseId: "unknown-exercise",
        line: 4,
        value: "得到 T^μ_ν=0。",
      },
    ]);
  });

  it("scans Exercise attributes past comparison operators inside quotes and expressions", () => {
    const attributes = extractLegacyExerciseStringAttributes(
      '<Exercise id="exercise-comparison" hint="先要求 θ>0。" solution={"若 θ>0，则取最小值。"} difficulty={a > b ? 3 : 2}>题目</Exercise>',
    );

    expect(attributes).toEqual([
      {
        attribute: "hint",
        exerciseId: "exercise-comparison",
        line: 1,
        value: "先要求 θ>0。",
      },
      {
        attribute: "solution",
        exerciseId: "exercise-comparison",
        line: 1,
        value: "若 θ>0，则取最小值。",
      },
    ]);
  });
});
