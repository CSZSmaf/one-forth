import assert from "node:assert/strict";
import test from "node:test";
import {
  extractMathFragments,
  inspectLatex,
  isGenericOutline,
  jaccardSimilarity,
  normalizeLatex,
} from "./audit-content.ts";

test("extractMathFragments ignores code and reports unclosed delimiters", () => {
  const source = [
    "行内 $x+1$。",
    "```ts",
    "const price = '$5';",
    "```",
    "$$",
    "y=x^2",
    "$$",
    "末尾 $z",
  ].join("\n");
  const fragments = extractMathFragments(source);
  assert.deepEqual(
    fragments.map(({ kind, latex, closed }) => ({ kind, latex, closed })),
    [
      { kind: "inline", latex: "x+1", closed: true },
      { kind: "display", latex: "y=x^2", closed: true },
      { kind: "inline", latex: "z", closed: false },
    ],
  );
});

test("LaTeX inspection catches runtime control characters and missing braces", () => {
  assert.match(inspectLatex("\bmathbfit{x}").join(" "), /control character U\+0008/);
  assert.match(inspectLatex("\\frac{x{y}").join(" "), /unbalanced braces/);
  assert.equal(inspectLatex("\\frac{x}{y}").length, 0);
  assert.equal(normalizeLatex(" \\displaystyle x = y "), "x=y");
});

test("generic four-section outline is distinguished from a topic-specific plan", () => {
  const generic = [
    "梯度要解决的核心问题与适用边界",
    "梯度的基本对象、符号和严格定义",
    "从「偏导数」推导「梯度」所需的关键步骤",
    "梯度的典型计算、反例与常见误区",
  ];
  const specific = [
    "方向导数与梯度的内积表示",
    "可微条件下最速上升方向的证明",
    "非欧氏度量如何改变梯度坐标",
    "用有限差分检查二维梯度",
  ];
  assert.equal(isGenericOutline(generic, "梯度"), true);
  assert.equal(isGenericOutline(specific, "梯度"), false);
  assert.equal(jaccardSimilarity(generic.join(""), generic.join("")), 1);
});
