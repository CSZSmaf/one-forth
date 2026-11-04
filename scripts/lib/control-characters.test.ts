import assert from "node:assert/strict";
import test from "node:test";
import { hasDisallowedControlCharacter } from "./control-characters.ts";

test("allows textual whitespace used by multiline LaTeX and labels", () => {
  assert.equal(
    hasDisallowedControlCharacter(
      "\\operatorname{precision}=\\frac{TP}{TP+FP},\n\t\\qquad\r\n\\operatorname{recall}=\\frac{TP}{TP+FN}",
    ),
    false,
  );
  assert.equal(
    hasDisallowedControlCharacter("普通空格\u00a0与 Unicode 行分隔\u2028均可保留"),
    false,
  );
});

test("rejects non-textual C0 control characters and DEL", () => {
  const invalidCodePoints = [
    ...Array.from({ length: 9 }, (_, index) => index),
    0x0b,
    0x0c,
    ...Array.from({ length: 18 }, (_, index) => index + 0x0e),
    0x7f,
  ];

  for (const codePoint of invalidCodePoints) {
    assert.equal(
      hasDisallowedControlCharacter(`before${String.fromCodePoint(codePoint)}after`),
      true,
      `expected U+${codePoint.toString(16).toUpperCase().padStart(4, "0")} to be rejected`,
    );
  }
});

test("does not retain RegExp state across repeated calls", () => {
  assert.equal(hasDisallowedControlCharacter("bad\u0000value"), true);
  assert.equal(hasDisallowedControlCharacter("bad\u0000value"), true);
  assert.equal(hasDisallowedControlCharacter("clean\nvalue"), false);
});
